
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
    // This is inefficient. A better approach would be a reverse-lookup collection.
    // For now, we'll search within user documents.
    const querySnapshot = await adminDb.collectionGroup('fcmTokens').where('token', '==', token).limit(1).get();
    if (!querySnapshot.empty) {
        // The parent of an fcmToken is the user document
        return querySnapshot.docs[0].ref.parent.parent?.id || null;
    }

    // Fallback to searching the root collection if needed
    const usersSnapshot = await adminDb.collection('users').where('fcmTokens', 'array-contains', token).limit(1).get();
    if (!usersSnapshot.empty) {
        return usersSnapshot.docs[0].id;
    }
    
    return null;
}

const cleanupInvalidTokens = async (tokensToRemove: string[]) => {
    if (tokensToRemove.length === 0) return;
    
    console.log(`Cleaning up ${tokensToRemove.length} invalid tokens...`);
    
    for (const token of tokensToRemove) {
        try {
            const userId = await findUserByFCMToken(token);
            if (userId) {
                const userRef = adminDb.collection('users').doc(userId);
                await userRef.update({
                    fcmTokens: FieldValue.arrayRemove(token)
                });
                console.log(`Removed token for user ${userId}`);
            } else {
                console.log(`Could not find user for invalid token: ${token.substring(0, 20)}...`);
            }
        } catch(error) {
             console.error(`Error removing token ${token.substring(0,20)}...`, error);
        }
    }
    
    console.log("Token cleanup complete.");
}


const sendNotifications = async (tokens: string[], payload: NotificationPayload): Promise<{ success: boolean; message: string; }> => {
    if (tokens.length === 0) {
      return { success: false, message: "Aucun appareil à notifier." };
    }

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
      tokens: tokens,
    };
    
    const batchResponse = await getMessaging().sendEachForMulticast(message);

    const failureCount = batchResponse.failureCount;
    
    if (failureCount > 0) {
        const tokensToRemove: string[] = [];
        batchResponse.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const errorCode = resp.error?.code;
                if (errorCode === 'messaging/registration-token-not-registered' || errorCode === 'messaging/invalid-registration-token') {
                    tokensToRemove.push(tokens[idx]);
                } else {
                     console.error(`Token ${tokens[idx]} failed:`, resp.error);
                }
            }
        });
        
        if (tokensToRemove.length > 0) {
            await cleanupInvalidTokens(tokensToRemove);
        }
    }

    return { 
        success: true, 
        message: `${batchResponse.successCount} notifications envoyées. ${failureCount} échecs.`
    };
}


// --- Global Notification to ALL users with a token ---
export async function sendGlobalNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string; }> {
  try {
    const usersSnapshot = await adminDb.collection('users').where('fcmTokens', '!=', []).get();
    let allTokens: string[] = [];
    usersSnapshot.forEach(doc => {
        const tokens = doc.data().fcmTokens;
        if (Array.isArray(tokens)) {
            allTokens.push(...tokens);
        }
    });

    const uniqueTokens = [...new Set(allTokens)];
    return await sendNotifications(uniqueTokens, payload);

  } catch (error: any) {
    console.error("Erreur lors de l'envoi des notifications globales:", error);
    return { success: false, message: error.message || "Une erreur inconnue est survenue." };
  }
}

// --- Admin-only Notification ---
export async function sendAdminNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
  try {
    const adminQuery = query(adminDb.collection('users'), where('role', '==', 'admin'));
    const adminSnapshot = await getDocs(adminQuery);

    if (adminSnapshot.empty) {
        return { success: false, message: "Aucun administrateur trouvé." };
    }
    
    let adminTokens: string[] = [];
    adminSnapshot.forEach(doc => {
        const tokens = doc.data().fcmTokens;
        if (Array.isArray(tokens)) {
            adminTokens.push(...tokens);
        }
    });

    const uniqueTokens = [...new Set(adminTokens)];
    return await sendNotifications(uniqueTokens, payload);
    
  } catch (error: any) {
    console.error("Error sending admin notifications:", error);
    return { success: false, message: "Erreur serveur lors de l'envoi aux admins." };
  }
}

