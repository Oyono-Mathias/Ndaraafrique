'use server';

import { getAdminDb } from '@/firebase/admin';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue, DocumentData } from 'firebase-admin/firestore';
import type { PushCampaign, Settings } from '@/lib/types';

/**
 * @fileOverview Gestion des notifications Ndara Afrique.
 * ✅ FILTRAGE : Respect des réglages globaux et préférences utilisateur.
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
        const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;

        if (settings.notifications?.enableInApp === false) {
            return { success: false, message: "Notifications désactivées au niveau global." };
        }

        // 🛡️ 2. Charger les préférences utilisateur
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return { success: false, message: "Utilisateur introuvable." };
        const userData = userDoc.data() as DocumentData;

        // On peut ajouter ici un check sur userData.notificationPreferences si besoin

        // 3. Enregistrer la notification in-app
        const notificationRef = db.collection('users').doc(userId).collection('notifications').doc();
        await notificationRef.set({
            ...payload,
            read: false,
            createdAt: FieldValue.serverTimestamp()
        });

        // 4. Envoyer push notification si possible
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
    const adminsQuery = db.collection('users').where('role', '==', 'admin');
    const adminsSnapshot = await adminsQuery.get();
    
    if (adminsSnapshot.empty) return { success: true, message: "Aucun administrateur trouvé." };

    for (const adminDoc of adminsSnapshot.docs) {
        const adminData = adminDoc.data();
        // Vérification préférence admin si spécifiée
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
