
'use server';

import { adminDb, adminAuth } from '@/firebase/admin';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue } from 'firebase-admin/firestore';

interface NotificationPayload {
  title: string;
  body: string;
  link?: string;
}

const findUserByFCMToken = async (token: string): Promise<string | null> => {
    const usersSnapshot = await adminDb.collection('users').where('fcmTokens', 'array-contains', token).limit(1).get();
    if (!usersSnapshot.empty) {
        return usersSnapshot.docs[0].id;
    }
    return null;
}

const cleanupInvalidTokens = async (tokensToRemove: string[]) => {
    if (tokensToRemove.length === 0) return;
    
    console.log(`Cleaning up ${tokensToRemove.length} invalid tokens...`);
    const batch = adminDb.batch();

    for (const token of tokensToRemove) {
        const userId = await findUserByFCMToken(token);
        if (userId) {
            const userRef = adminDb.collection('users').doc(userId);
            batch.update(userRef, {
                fcmTokens: FieldValue.arrayRemove(token)
            });
        }
    }
    
    await batch.commit();
    console.log("Token cleanup complete.");
}


// This function can only be called from a server environment
export async function sendGlobalNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string; }> {
  try {
    // SECURITY: In a real app, you would add a check here to ensure
    // that only an authenticated admin user can trigger this action.
    // For example:
    // const idToken = headers().get('Authorization')?.split('Bearer ')[1];
    // const decodedToken = await adminAuth.verifyIdToken(idToken);
    // if (decodedToken.role !== 'admin') {
    //   return { success: false, message: "Permission refusée." };
    // }

    // 1. Get all FCM tokens from all users
    const usersSnapshot = await adminDb.collection('users').where('fcmTokens', '!=', []).get();
    let allTokens: string[] = [];
    usersSnapshot.forEach(doc => {
        const tokens = doc.data().fcmTokens;
        if (Array.isArray(tokens)) {
            allTokens.push(...tokens);
        }
    });

    const uniqueTokens = [...new Set(allTokens)];

    if (uniqueTokens.length === 0) {
      return { success: false, message: "Aucun appareil à notifier." };
    }

    // 2. Construct the message
    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        fcm_options: {
          link: payload.link || 'https://ndara-afrique.web.app/notifications'
        },
        notification: {
            icon: 'https://ndara-afrique.web.app/icon-192x192.png',
            badge: 'https://ndara-afrique.web.app/badge.png'
        }
      },
      tokens: uniqueTokens,
    };
    
    // 3. Send the multicast message
    const batchResponse = await getMessaging().sendEachForMulticast(message);

    const successCount = batchResponse.successCount;
    const failureCount = batchResponse.failureCount;
    
    // 4. Cleanup invalid tokens
    const tokensToRemove: string[] = [];
    batchResponse.responses.forEach((resp, idx) => {
        if (!resp.success) {
            const errorCode = resp.error?.code;
            // These error codes indicate that the token is no longer valid.
            if (errorCode === 'messaging/registration-token-not-registered' || errorCode === 'messaging/invalid-registration-token') {
                tokensToRemove.push(uniqueTokens[idx]);
            } else {
                 console.error(`Token ${uniqueTokens[idx]} failed:`, resp.error);
            }
        }
    });

    await cleanupInvalidTokens(tokensToRemove);

    return { 
        success: true, 
        message: `${successCount} notifications envoyées. ${failureCount} échecs (${tokensToRemove.length} jetons invalides nettoyés).`
    };

  } catch (error: any) {
    console.error("Erreur lors de l'envoi des notifications globales:", error);
    return { success: false, message: error.message || "Une erreur inconnue est survenue." };
  }
}
