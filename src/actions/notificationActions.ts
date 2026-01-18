
'use server';

import { adminDb } from '@/firebase/admin';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue, DocumentData } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

interface NotificationPayload {
  title: string;
  body: string;
  link?: string;
  type?: 'newPayouts' | 'newApplications' | 'newSupportTickets' | 'financialAnomalies' | 'general';
}

const findUserByFCMToken = async (token: string): Promise<{userId: string; token: string} | null> => {
    const fcmTokensCollection = adminDb.collectionGroup('fcmTokens');
    const snapshot = await fcmTokensCollection.where('tokens', 'array-contains', token).limit(1).get();
    
    if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const userId = userDoc.ref.parent.parent?.id;
        if(userId) {
          return { userId, token };
        }
    }
    return null;
}

const cleanupInvalidTokens = async (tokensToRemove: string[], userId: string) => {
    if (tokensToRemove.length > 0 && userId) {
        const userFcmTokensRef = adminDb.collection('users').doc(userId).collection('fcmTokens').doc('tokens');
        await userFcmTokensRef.update({
            tokens: FieldValue.arrayRemove(...tokensToRemove)
        });
    }
}


const sendNotifications = async (tokens: string[], payload: NotificationPayload): Promise<{ success: boolean; message: string; }> => {
    if (tokens.length === 0) {
        return { success: true, message: "Aucun jeton pour envoyer des notifications." };
    }
    
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

        return { success: true, message: `Notifications envoyées à ${response.successCount} appareils.` };
    } catch (error) {
        console.error("Error sending notifications:", error);
        return { success: false, message: "Erreur lors de l'envoi des notifications." };
    }
}


// --- Global Notification to ALL users with a token ---
export async function sendGlobalNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string; }> {
    const fcmTokensSnapshot = await adminDb.collectionGroup('fcmTokens').get();
    if(fcmTokensSnapshot.empty) return { success: true, message: "Aucun utilisateur avec un jeton de notification." };
    
    const allTokens: string[] = [];
    fcmTokensSnapshot.forEach(doc => {
        const tokens = doc.data().tokens;
        if(Array.isArray(tokens)) {
            allTokens.push(...tokens);
        }
    });
    
    return sendNotifications(allTokens, payload);
}

// --- Admin-only Notification ---
export async function sendAdminNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
  const adminsQuery = adminDb.collection('users').where('role', '==', 'admin');
  const adminsSnapshot = await adminsQuery.get();
  
  if (adminsSnapshot.empty) return { success: true, message: "Aucun administrateur trouvé." };

  const adminIds = adminsSnapshot.docs.map(doc => doc.id);
  const adminUsersData = adminsSnapshot.docs.map(doc => doc.data() as DocumentData);

  const adminTokens: string[] = [];

  for (const adminId of adminIds) {
    const fcmTokensSnapshot = await adminDb.collection('users').doc(adminId).collection('fcmTokens').get();
    fcmTokensSnapshot.forEach(doc => {
      const user = adminUsersData.find(u => u.uid === adminId);
      if(user) {
          const prefs = user.notificationPreferences;
          if (payload.type && prefs && prefs[payload.type] === false) {
              return; 
          }
          const tokens = doc.data().tokens;
          if (tokens && Array.isArray(tokens)) {
              adminTokens.push(...tokens);
          }
      }
    });
  }

  return sendNotifications(Array.from(new Set(adminTokens)), payload);
}

// --- Single User Notification ---
export async function sendUserNotification(userId: string, payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
  const fcmTokensSnapshot = await adminDb.collection('users').doc(userId).collection('fcmTokens').get();
  if (fcmTokensSnapshot.empty) {
      return { success: true, message: "L'utilisateur n'a pas de jeton de notification." };
  }
  const userTokens: string[] = [];
  fcmTokensSnapshot.forEach(doc => {
      const tokens = doc.data().tokens;
      if (tokens && Array.isArray(tokens)) {
        userTokens.push(...tokens);
      }
  });

  return sendNotifications(userTokens, payload);
}
