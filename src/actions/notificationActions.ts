
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
    // This functionality is temporarily disabled as it requires the Admin SDK.
    return null;
}

const cleanupInvalidTokens = async (tokensToRemove: string[], userId: string) => {
    if (tokensToRemove.length > 0 && userId) {
        const userFcmTokensRef = adminDb.collection('fcmTokens').doc(userId);
        await userFcmTokensRef.update({
            tokens: FieldValue.arrayRemove(...tokensToRemove)
        });
    }
}


const sendNotifications = async (tokens: string[], payload: NotificationPayload): Promise<{ success: boolean; message: string; }> => {
    // This functionality is temporarily disabled as it requires the Admin SDK.
    console.warn("[FCM] Admin SDK not initialized. Mocking successful notification send.");
    return { success: true, message: "Simulation d'envoi de notification (SDK Admin désactivé)." };
}


// --- Global Notification to ALL users with a token ---
export async function sendGlobalNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string; }> {
  // This functionality is temporarily disabled as it requires the Admin SDK.
  console.warn("[FCM] Admin SDK not initialized. Mocking successful global notification send.");
  return { success: true, message: "Simulation d'envoi de notification globale." };
}

// --- Admin-only Notification ---
export async function sendAdminNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
  const adminsQuery = adminDb.collection('users').where('role', '==', 'admin');
  const adminsSnapshot = await adminsQuery.get();
  
  if (adminsSnapshot.empty) return { success: true, message: "Aucun administrateur trouvé." };

  const adminIds = adminsSnapshot.docs.map(doc => doc.id);
  const adminUsersData = adminsSnapshot.docs.map(doc => doc.data() as DocumentData);

  const fcmTokensQuery = adminDb.collection('fcmTokens').where(admin.firestore.FieldPath.documentId(), 'in', adminIds);
  const fcmTokensSnapshot = await fcmTokensQuery.get();

  const adminTokens: string[] = [];
  
  fcmTokensSnapshot.forEach(doc => {
      const user = adminUsersData.find(u => u.uid === doc.id);
      if(user) {
          const prefs = user.notificationPreferences;
          // Send notification if prefs are not set, or if the specific type is not explicitly set to false.
          if (!prefs || (payload.type && prefs[payload.type] !== false)) {
              const tokens = doc.data().tokens;
              if (tokens && Array.isArray(tokens)) {
                  adminTokens.push(...tokens);
              }
          }
      }
  });

  return sendNotifications(Array.from(new Set(adminTokens)), payload);
}

// --- Single User Notification ---
export async function sendUserNotification(userId: string, payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
  // This functionality is temporarily disabled as it requires the Admin SDK.
   console.warn("[FCM] Admin SDK not initialized. Mocking successful user notification send.");
  return { success: true, message: "Simulation d'envoi de notification utilisateur." };
}
