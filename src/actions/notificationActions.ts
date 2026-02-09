'use server';

import { getAdminDb } from '@/firebase/admin';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue, DocumentData, Timestamp } from 'firebase-admin/firestore';

interface NotificationPayload {
  text: string;
  link?: string;
  type?: 'success' | 'info' | 'reminder' | 'alert';
}

const findUserByFCMToken = async (token: string): Promise<{userId: string; token: string} | null> => {
    try {
        const db = getAdminDb();
        const fcmTokensCollection = db.collectionGroup('fcmTokens');
        const snapshot = await fcmTokensCollection.where('tokens', 'array-contains', token).limit(1).get();
        
        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userId = userDoc.ref.parent.parent?.id;
            if(userId) {
              return { userId, token };
            }
        }
    } catch (e) {
        console.error("Error finding user by FCM token:", e);
    }
    return null;
}

const cleanupInvalidTokens = async (tokensToRemove: string[], userId: string) => {
    if (tokensToRemove.length > 0 && userId) {
        try {
            const db = getAdminDb();
            const userFcmTokensRef = db.collection('users').doc(userId).collection('fcmTokens').doc('tokens');
            await userFcmTokensRef.update({
                tokens: FieldValue.arrayRemove(...tokensToRemove)
            });
        } catch (e) {
            console.error("Error cleaning up tokens:", e);
        }
    }
}


const sendPushNotification = async (tokens: string[], payload: { title: string; body: string; link?: string }): Promise<void> => {
    if (tokens.length === 0) return;
    
    const message = {
        notification: {
            title: payload.title,
            body: payload.body,
        },
        webpush: {
            notification: {
                icon: '/icon.svg',
            },
            fcm_options: {
                link: payload.link || 'https://ndara-afrique.web.app',
            },
        },
        tokens: tokens,
    };

    try {
        const response = await getMessaging().sendEachForMulticast(message);
        
        if (response.failureCount > 0) {
            const tokensToRemove: { [userId: string]: string[] } = {};
            const cleanupPromises = response.responses.map(async (resp, idx) => {
                if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
                    const invalidToken = tokens[idx];
                    const result = await findUserByFCMToken(invalidToken);
                    if (result) {
                        if (!tokensToRemove[result.userId]) {
                            tokensToRemove[result.userId] = [];
                        }
                        tokensToRemove[result.userId].push(result.token);
                    }
                }
            });

            await Promise.all(cleanupPromises);
            
            for (const userId in tokensToRemove) {
                await cleanupInvalidTokens(tokensToRemove[userId], userId);
            }
        }
    } catch (error) {
        console.error("Error sending push notifications:", error);
    }
}

export async function sendUserNotification(userId: string, payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
    try {
        const db = getAdminDb();
        // 1. Save notification to user's subcollection
        const notificationRef = db.collection('users').doc(userId).collection('notifications').doc();
        await notificationRef.set({
            ...payload,
            read: false,
            createdAt: FieldValue.serverTimestamp()
        });

        // 2. Send push notification
        const fcmTokensSnapshot = await db.collection('users').doc(userId).collection('fcmTokens').get();
        if (!fcmTokensSnapshot.empty) {
            const userTokens: string[] = [];
            fcmTokensSnapshot.forEach(doc => {
                const tokens = doc.data().tokens;
                if (tokens && Array.isArray(tokens)) {
                    userTokens.push(...tokens);
                }
            });
            
            if (userTokens.length > 0) {
                 await sendPushNotification(userTokens, {
                    title: "Nouvelle notification de Ndara Afrique",
                    body: payload.text,
                    link: payload.link
                });
            }
        }
        
        return { success: true, message: "Notification envoyée." };
    } catch (error) {
        console.error(`Error sending notification to ${userId}:`, error);
        return { success: false, message: "Erreur lors de l'envoi." };
    }
}


export async function sendAdminNotification(payload: { title: string; body: string; link: string; type: 'newPayouts' | 'newApplications' | 'newSupportTickets' | 'financialAnomalies' | 'general' }): Promise<{ success: boolean; message: string }> {
  try {
    const db = getAdminDb();
    const adminsQuery = db.collection('users').where('role', '==', 'admin');
    const adminsSnapshot = await adminsQuery.get();
    
    if (adminsSnapshot.empty) return { success: true, message: "Aucun administrateur trouvé." };

    const adminIds = adminsSnapshot.docs.map(doc => doc.id);

    for (const adminId of adminIds) {
        const adminDoc = await db.collection('users').doc(adminId).get();
        const adminData = adminDoc.data() as DocumentData;
        
        const prefs = adminData.notificationPreferences;
        if (payload.type && payload.type !== 'general' && prefs && prefs[payload.type] === false) {
            continue; 
        }

        await sendUserNotification(adminId, {
            text: payload.body,
            link: payload.link,
            type: 'alert'
        });
    }

    return { success: true, message: "Notifications envoyées aux administrateurs." };
  } catch (e) {
      console.error("Error sending admin notification:", e);
      return { success: false, message: "Erreur serveur" };
  }
}
