'use server';

import { getAdminDb } from '@/firebase/admin';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue } from 'firebase-admin/firestore';
import type { Settings, PushCampaign } from '@/lib/types';

/**
 * @fileOverview Gestion des notifications Ndara Afrique.
 * ✅ RÉSOLU : Alignement sur le module 'settings.notifications' (Schéma v3.0).
 */

interface NotificationPayload {
  text: string;
  link?: string;
  type?: 'success' | 'info' | 'reminder' | 'alert';
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
        
        // 🛡️ SÉCURITÉ NOTIFICATIONS : modules 'notifications'
        const settingsSnap = await db.collection('settings').doc('global').get();
        const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;

        // ✅ Vérification de l'activation globale du canal push
        const pushEnabled = settings.notifications?.pushNotifications ?? true;

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return { success: false, message: "Utilisateur introuvable." };

        // Toujours enregistrer en base pour l'inbox interne
        const notificationRef = db.collection('users').doc(userId).collection('notifications').doc();
        await notificationRef.set({
            ...payload,
            read: false,
            createdAt: FieldValue.serverTimestamp()
        });

        // Envoyer le push réel uniquement si activé
        if (pushEnabled) {
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
        }
        
        return { success: true, message: "Notification traitée." };
    } catch (error) {
        console.error(`Error sending notification to ${userId}:`, error);
        return { success: false, message: "Erreur lors de l'envoi." };
    }
}

export async function sendAdminNotification(payload: { title: string; body: string; link: string; type: 'newPayouts' | 'newApplications' | 'newSupportTickets' | 'financialAnomalies' | 'general' }): Promise<{ success: boolean; message: string }> {
  try {
    const db = getAdminDb();
    
    // 🛡️ SÉCURITÉ ADMIN ALERTS
    const settingsSnap = await db.collection('settings').doc('global').get();
    const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;

    const alertConfig = settings.notifications?.adminAlerts;
    
    // Vérification granulaire par type
    if (payload.type === 'newPayouts' && alertConfig?.newPayment === false) return { success: true, message: "Ignoré" };
    if (payload.type === 'newApplications' && alertConfig?.newUser === false) return { success: true, message: "Ignoré" };

    const adminsSnapshot = await db.collection('users').where('role', '==', 'admin').get();
    
    if (adminsSnapshot.empty) return { success: true, message: "Aucun administrateur trouvé." };

    for (const adminDoc of adminsSnapshot.docs) {
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

/**
 * Crée une nouvelle campagne de notification push.
 */
export async function createPushCampaign(campaign: Omit<PushCampaign, 'id' | 'createdAt'>) {
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
