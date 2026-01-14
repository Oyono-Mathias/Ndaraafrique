
'use server';

import { adminDb } from '@/firebase/admin';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue, query, where, getDocs, DocumentData } from 'firebase-admin/firestore';

interface NotificationPayload {
  title: string;
  body: string;
  link?: string;
  type?: 'newPayouts' | 'newApplications' | 'newSupportTickets' | 'financialAnomalies' | 'general';
}

const findUserByFCMToken = async (token: string): Promise<string | null> => {
    const q = query(collection(adminDb, 'users'), where('fcmTokens', 'array-contains', token));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return snapshot.docs[0].id;
    }
    return null;
}

const cleanupInvalidTokens = async (tokensToRemove: string[], userId: string) => {
    if (tokensToRemove.length > 0) {
        const userRef = doc(adminDb, 'users', userId);
        await userRef.update({
            fcmTokens: FieldValue.arrayRemove(...tokensToRemove)
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
        const tokensToRemove: string[] = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                console.warn(`Failed to send notification to token: ${tokens[idx]}`, resp.error);
                // Cleanup logic for invalid tokens
                 if (resp.error?.code === 'messaging/registration-token-not-registered') {
                    tokensToRemove.push(tokens[idx]);
                }
            }
        });

        if (tokensToRemove.length > 0) {
            // Find user and clean up tokens (implementation needed)
            console.log("Need to remove invalid tokens:", tokensToRemove);
        }

        return { success: true, message: `Notifications envoyées à ${response.successCount} appareils.` };
    } catch (error) {
        console.error("Error sending notifications:", error);
        return { success: false, message: "Erreur lors de l'envoi des notifications." };
    }
}


// --- Global Notification to ALL users with a token ---
export async function sendGlobalNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string; }> {
    const usersSnapshot = await adminDb.collection('fcmTokens').get();
    if(usersSnapshot.empty) return { success: true, message: "Aucun utilisateur avec un jeton de notification." };
    
    const allTokens = usersSnapshot.docs.flatMap(doc => doc.data().tokens || []);
    
    return sendNotifications(allTokens, payload);
}

// --- Admin-only Notification ---
export async function sendAdminNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
  const adminsQuery = query(collection(adminDb, 'users'), where('role', '==', 'admin'));
  const adminsSnapshot = await getDocs(adminsQuery);
  
  if (adminsSnapshot.empty) return { success: true, message: "Aucun administrateur trouvé." };

  const adminTokens: string[] = [];
  adminsSnapshot.forEach(doc => {
      const user = doc.data() as DocumentData;
      // Admins might have notification preferences
      const prefs = user.notificationPreferences;
      if (prefs && payload.type && prefs[payload.type] === false) {
          return; // Skip if this notification type is disabled
      }

      if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
          adminTokens.push(...user.fcmTokens);
      }
  });
  
  const fcmTokensDocs = await getDocs(query(collection(adminDb, 'fcmTokens'), where('__name__', 'in', adminsSnapshot.docs.map(d => d.id))));
  fcmTokensDocs.forEach(doc => {
      adminTokens.push(...(doc.data().tokens || []));
  });

  return sendNotifications(Array.from(new Set(adminTokens)), payload);
}

// --- Single User Notification ---
export async function sendUserNotification(userId: string, payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
  const userTokensDoc = await adminDb.collection('fcmTokens').doc(userId).get();
  if (!userTokensDoc.exists) {
      return { success: true, message: "L'utilisateur n'a pas de jeton de notification." };
  }
  const tokens = userTokensDoc.data()?.tokens || [];
  return sendNotifications(tokens, payload);
}
