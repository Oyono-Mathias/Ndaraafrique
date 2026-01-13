
'use server';

// import { adminDb } from '@/firebase/admin';
// import { getMessaging } from 'firebase-admin/messaging';
// import { FieldValue, query, where, getDocs, DocumentData } from 'firebase-admin/firestore';

interface NotificationPayload {
  title: string;
  body: string;
  link?: string;
  type?: 'newPayouts' | 'newApplications' | 'newSupportTickets' | 'financialAnomalies' | 'general';
}

const findUserByFCMToken = async (token: string): Promise<string | null> => {
    // This functionality is temporarily disabled as it requires the Admin SDK.
    return null;
}

const cleanupInvalidTokens = async (tokensToRemove: string[]) => {
    // This functionality is temporarily disabled as it requires the Admin SDK.
    if (tokensToRemove.length > 0) {
        console.warn(`[FCM Cleanup] Admin SDK not initialized. Cannot clean up ${tokensToRemove.length} tokens.`);
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
  // This functionality is temporarily disabled as it requires the Admin SDK.
  console.warn("[FCM] Admin SDK not initialized. Mocking successful admin notification send.");
  return { success: true, message: "Simulation d'envoi de notification admin." };
}

// --- Single User Notification ---
export async function sendUserNotification(userId: string, payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
  // This functionality is temporarily disabled as it requires the Admin SDK.
   console.warn("[FCM] Admin SDK not initialized. Mocking successful user notification send.");
  return { success: true, message: "Simulation d'envoi de notification utilisateur." };
}
