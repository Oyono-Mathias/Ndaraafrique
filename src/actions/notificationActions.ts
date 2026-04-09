'use server';

import { getAdminDb } from '@/firebase/admin';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue, DocumentData } from 'firebase-admin/firestore';
// ❌ Supprimé car absent ou incomplet dans @/lib/types : import type { PushCampaign, Settings } from '@/lib/types';
import type { Settings } from '@/lib/types';

/**
 * ✅ RÉSOLU : Interface locale pour bypasser l'erreur d'exportation de @/lib/types
 */
interface LocalPushCampaign {
  id?: string;
  title: string;
  body: string;
  target: 'all' | 'instructors' | 'students' | 'specific';
  status: 'draft' | 'sent' | 'scheduled';
  link?: string;
  createdAt?: any;
}

/**
 * @fileOverview Gestion des notifications Ndara Afrique.
 * ✅ RÉSOLU : Alignement sur le module 'settings.notifications' (Schéma v3).
 */

interface NotificationPayload {
  text: string;
  link?: string;
  type?: 'success' | 'info' | 'reminder' | 'alert';
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
            notification: { icon: '/logo.png' },
            fcm_options: { link: payload.link || 'https://ndara-afrique.web.app' },
        },
        tokens: tokens,
    };

    try {
        await getMessaging().sendEachForMulticast(message);
    } catch (error) {
        console.error("Error sending push notifications:", error);
    }
}

export async function sendUserNotification(userId: string, payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
    try {
        const db = getAdminDb();
        
        // 🛡️ 1. Charger les réglages globaux
        const settingsSnap = await db.collection('settings').doc('global').get();
        // 🔄 BYPASS : Cast en 'any' pour accéder au module notifications v3.0
        const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as any;

        // ✅ Alignement strict sur le nouveau schéma
        const globalEnabled = settings.notifications?.pushNotifications ?? true;

        if (!globalEnabled) {
            return { success: false, message: "Notifications désactivées au niveau global par l'admin." };
        }

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return { success: false, message: "Utilisateur introuvable." };

        const notificationRef = db.collection('users').doc(userId).collection('notifications').doc();
        await notificationRef.set({
            ...payload,
            read: false,
            createdAt: FieldValue.serverTimestamp()
        });

        const fcmTokensSnapshot = await db.collection('users').doc(userId).collection('fcmTokens').get();
        if (!fcmTokensSnapshot.empty) {
            const userTokens: string[] = [];
            fcmTokensSnapshot.forEach(doc => {
                const tokens = doc.data().tokens;
                if (tokens && Array.isArray(tokens)) userTokens.push(...tokens);
            });
            
            if (userTokens.length > 0) {
                 await sendPushNotification(userTokens, {
                    title: "Ndara Afrique",
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
    const adminsSnapshot = await db.collection('users').where('role', '==', 'admin').get();
    
    if (adminsSnapshot.empty) return { success: true, message: "Aucun administrateur trouvé." };

    for (const adminDoc of adminsSnapshot.docs) {
        const adminData = adminDoc.data();
        const prefs = adminData.notificationPreferences;
        if (payload.type && payload.type !== 'general' && prefs && prefs[payload.type] === false) {
            continue; 
        }

        await sendUserNotification(adminDoc.id, {
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

// ✅ Utilisation du type local LocalPushCampaign
export async function createPushCampaign(campaign: Omit<LocalPushCampaign, 'id' | 'createdAt'>) {
    try {
        const db = getAdminDb();
        const campaignRef = db.collection('push_campaigns').doc();
        await campaignRef.set({
            ...campaign,
            id: campaignRef.id,
            createdAt: FieldValue.serverTimestamp(),
        });
        return { success: true, id: campaignRef.id };
    } catch (e: any) {
        console.error("Error creating push campaign:", e);
        return { success: false, error: e.message };
    }
}
