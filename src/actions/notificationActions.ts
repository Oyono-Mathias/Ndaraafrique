
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
    // This is inefficient. A better approach would be a reverse-lookup collection.
    // For now, we'll search within user documents.
    const querySnapshot = await adminDb.collectionGroup('fcmTokens').where('__name__', 'like', `users/%/${token}`).limit(1).get();
    if (!querySnapshot.empty) {
        // The parent of an fcmToken is the user document
        return querySnapshot.docs[0].ref.parent.parent?.id || null;
    }

    // Fallback to searching the root collection if needed (old structure)
    const usersSnapshot = await adminDb.collection('users').where('fcmTokens', 'array-contains', token).limit(1).get();
    if (!usersSnapshot.empty) {
        return usersSnapshot.docs[0].id;
    }
    
    return null;
}

const cleanupInvalidTokens = async (tokensToRemove: string[]) => {
    if (tokensToRemove.length === 0) return;
    
    console.log(`[FCM Cleanup] Nettoyage de ${tokensToRemove.length} token(s) invalide(s)...`);
    
    // In a real production app, this cleanup should be handled more robustly,
    // possibly in a separate scheduled function to avoid delaying the response.
    // For now, we'll do it inline but without waiting for it to complete in the main flow.
    const cleanupPromises = tokensToRemove.map(async (token) => {
        try {
            const userId = await findUserByFCMToken(token);
            if (userId) {
                const userRef = adminDb.collection('users').doc(userId);
                // This could be a subcollection or a field in the user doc
                const tokenRef = userRef.collection('fcmTokens').doc(token);
                const tokenDoc = await tokenRef.get();
                if(tokenDoc.exists) {
                    await tokenRef.delete();
                } else {
                    // Fallback for old array structure
                    await userRef.update({ fcmTokens: FieldValue.arrayRemove(token) });
                }
                console.log(`[FCM Cleanup] Token supprimé pour l'utilisateur ${userId}.`);
            } else {
                 console.warn(`[FCM Cleanup] Impossible de trouver l'utilisateur pour le token invalide: ${token.substring(0,20)}...`);
            }
        } catch(error) {
             console.error(`[FCM Cleanup] Erreur lors de la suppression du token ${token.substring(0,20)}...`, error);
        }
    });

    await Promise.all(cleanupPromises);
    console.log("[FCM Cleanup] Terminé.");
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
    
    try {
        const batchResponse = await getMessaging().sendEachForMulticast(message);
        console.log(`[FCM] Notifications envoyées: ${batchResponse.successCount} succès, ${batchResponse.failureCount} échecs.`);

        if (batchResponse.failureCount > 0) {
            const tokensToRemove: string[] = [];
            batchResponse.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error?.code;
                    // Ces erreurs indiquent que le token n'est plus valide
                    if (errorCode === 'messaging/registration-token-not-registered' || errorCode === 'messaging/invalid-registration-token') {
                        tokensToRemove.push(tokens[idx]);
                    } else {
                         console.error(`[FCM] Échec de l'envoi au token ${tokens[idx].substring(0,10)}...:`, resp.error);
                    }
                }
            });
            
            if (tokensToRemove.length > 0) {
                // We run cleanup but don't wait for it to finish to respond faster
                cleanupInvalidTokens(tokensToRemove);
            }
        }

        return { 
            success: true, 
            message: `${batchResponse.successCount} notifications envoyées avec succès.`
        };

    } catch (error: any) {
        console.error("Erreur critique lors de l'envoi FCM:", error);
        return { success: false, message: error.message || "Le service de notification a échoué." };
    }
}


// --- Global Notification to ALL users with a token ---
export async function sendGlobalNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string; }> {
  try {
    const fcmTokensSnapshot = await adminDb.collectionGroup('fcmTokens').get();
    let allTokens = fcmTokensSnapshot.docs.map(doc => doc.id);
    
    // Fallback for old array structure
    const usersSnapshot = await adminDb.collection('users').where('fcmTokens', '!=', []).get();
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
        console.log("Aucun administrateur trouvé pour la notification.");
        return { success: false, message: "Aucun administrateur trouvé." };
    }
    
    let adminTokens: string[] = [];
    for (const doc of adminSnapshot.docs) {
        const userData = doc.data();
        const preferences = userData.notificationPreferences;
        const notifType = payload.type;
        
        // Default to true if preferences are not set.
        const shouldReceiveNotification = !notifType || notifType === 'general' || preferences?.[notifType] !== false;

        if (shouldReceiveNotification) {
            // Fetch from subcollection
            const tokensSnapshot = await doc.ref.collection('fcmTokens').get();
            if (!tokensSnapshot.empty) {
                adminTokens.push(...tokensSnapshot.docs.map(d => d.id));
            }
            // Fallback for old array structure
            const oldTokens = userData.fcmTokens;
            if (Array.isArray(oldTokens) && oldTokens.length > 0) {
                 adminTokens.push(...oldTokens);
            }
        }
    }

    if(adminTokens.length === 0) {
        console.log("Aucun token de notification trouvé pour les administrateurs (ou préférences désactivées).");
        return { success: false, message: "Aucun administrateur à notifier." };
    }

    const uniqueTokens = [...new Set(adminTokens)];
    return await sendNotifications(uniqueTokens, payload);
    
  } catch (error: any) {
    console.error("Error sending admin notifications:", error);
    return { success: false, message: "Erreur serveur lors de l'envoi aux admins." };
  }
}

// --- Single User Notification ---
export async function sendUserNotification(userId: string, payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return { success: false, message: "Utilisateur non trouvé." };
    }
    
    let tokens: string[] = [];
    const tokensSnapshot = await userDoc.ref.collection('fcmTokens').get();
    if (!tokensSnapshot.empty) {
        tokens.push(...tokensSnapshot.docs.map(d => d.id));
    }
    
    // Fallback for old array structure
    const oldTokens = userDoc.data()?.fcmTokens;
    if (Array.isArray(oldTokens) && oldTokens.length > 0) {
         tokens.push(...oldTokens);
    }

    if (tokens.length === 0) {
      return { success: false, message: "Aucun appareil à notifier pour cet utilisateur." };
    }
    
    const uniqueTokens = [...new Set(tokens)];
    return await sendNotifications(uniqueTokens, payload);

  } catch (error: any) {
    console.error(`Error sending notification to user ${userId}:`, error);
    return { success: false, message: "Erreur serveur lors de l'envoi de la notification." };
  }
}
