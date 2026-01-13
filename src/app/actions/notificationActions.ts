
'use server';

import { adminDb, adminAuth } from '@/firebase/admin';
import { getMessaging } from 'firebase-admin/messaging';

interface NotificationPayload {
  title: string;
  body: string;
  link?: string;
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
    const usersSnapshot = await adminDb.collection('users').get();
    const tokenPromises = usersSnapshot.docs.map(userDoc => 
        adminDb.collection('users').doc(userDoc.id).collection('fcmTokens').get()
    );
    
    const allTokensSnapshots = await Promise.all(tokenPromises);
    const allTokens = allTokensSnapshots.flatMap(snapshot => 
        snapshot.docs.map(doc => doc.id)
    );

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

    console.log(`${successCount} notifications envoyées avec succès.`);
    if (failureCount > 0) {
        console.warn(`${failureCount} notifications ont échoué.`);
        // Optional: Log detailed errors for debugging
        batchResponse.responses.forEach((resp, idx) => {
            if (!resp.success) {
                console.error(`Token ${uniqueTokens[idx]}: ${resp.error}`);
            }
        });
    }

    return { 
        success: true, 
        message: `${successCount} notifications envoyées. ${failureCount} échecs.`
    };

  } catch (error: any) {
    console.error("Erreur lors de l'envoi des notifications globales:", error);
    return { success: false, message: error.message || "Une erreur inconnue est survenue." };
  }
}
