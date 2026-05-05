'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendAdminNotification, sendUserNotification } from './notificationActions';
import type { NdaraUser, RequestPayoutParams, Settings, PayoutRequest } from '@/lib/types';

/**
 * 🛡️ Helper interne de sécurité Admin
 */
async function verifyAdminOrThrow(adminId: string) {
    if (!adminId) throw new Error("UNAUTHORIZED");
    const db = getAdminDb();
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
        throw new Error("UNAUTHORIZED: Droits d'administrateur requis.");
    }
}

/** 
 * 💸 1. DEMANDE DE RETRAIT (Utilisateur)
 * Crée une entrée dans payout_requests. Les fonds ne sont pas encore déduits 
 * pour permettre l'audit anti-fraude.
 */
export async function requestPayoutAction({ 
    instructorId, 
    amount, 
    method,
    requesterId 
}: RequestPayoutParams): Promise<{ success: boolean; error?: string; message?: string }> {
    
    if (instructorId !== requesterId) {
        throw new Error("UNAUTHORIZED: Tentative de retrait sur un compte tiers.");
    }

    if (amount <= 0) return { success: false, error: "error.amount_positive" };

    try {
        const db = getAdminDb();
        const userRef = db.collection('users').doc(instructorId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) return { success: false, error: "error.user_not_found" };
        const userData = userSnap.data() as NdaraUser;

        // 🛡️ SÉCURITÉ : Vérification des restrictions
        if (userData.restrictions?.canWithdraw === false) {
            return { success: false, error: "RESTRICTED: Retraits suspendus sur votre compte." };
        }

        const settingsSnap = await db.collection('settings').doc('global').get();
        const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;

        // 🛡️ VÉRIFICATION SEUIL (Alignement Schéma v2.5)
        const minThreshold = settings.payments?.minWithdrawal || 5000;
        const currentBalance = userData.balance || 0;

        if (currentBalance < amount) return { success: false, error: "error.insufficient_balance" };
        if (amount < minThreshold) return { success: false, error: `Le retrait minimum est de ${minThreshold.toLocaleString()} XOF.` };

        const payoutRef = db.collection('payout_requests').doc();
        const payoutData: Omit<PayoutRequest, 'id'> = {
            instructorId,
            amount,
            method: method || 'mobile_money',
            status: 'pending',
            createdAt: Timestamp.now(),
        };

        await payoutRef.set({ id: payoutRef.id, ...payoutData });

        await sendAdminNotification({
            title: '💸 Nouvelle Demande de Retrait',
            body: `${userData.fullName} demande ${amount.toLocaleString()} XOF.`,
            link: '/admin/payouts',
            type: 'newPayouts'
        });

        return { success: true, message: "success.payout_requested" };

    } catch (error: any) {
        console.error("Payout Request Error:", error.message);
        return { success: false, error: "error.generic" };
    }
}

/** 
 * ✅ 2. TRAITEMENT DU RETRAIT (Action Admin)
 * Simule ou déclenche l'appel API MTN/Orange. 
 * Si 'paid', les fonds sont déduits du solde utilisateur.
 */
export async function updatePayoutStatusAction({
  payoutId,
  status,
  adminId
}: {
  payoutId: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  adminId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdminOrThrow(adminId);
    
    const db = getAdminDb();
    const payoutRef = db.collection('payout_requests').doc(payoutId);
    const payoutSnap = await payoutRef.get();

    if (!payoutSnap.exists) return { success: false, error: 'Retrait introuvable' };
    const payoutData = payoutSnap.data() as PayoutRequest;

    // Si on passe à 'paid', on exécute la transaction financière réelle
    if (status === 'paid' && payoutData.status !== 'paid') {
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection('users').doc(payoutData.instructorId);
            const uSnap = await transaction.get(userRef);
            
            if (!uSnap.exists) throw new Error("Utilisateur introuvable");
            const currentBalance = uSnap.data()?.balance || 0;

            if (currentBalance < payoutData.amount) throw new Error("Solde désormais insuffisant.");

            // 💸 DÉDUCTION RÉELLE
            transaction.update(userRef, {
                balance: FieldValue.increment(-payoutData.amount),
                updatedAt: FieldValue.serverTimestamp()
            });

            // 💾 LOG TRANSACTION
            const txRef = db.collection('payments').doc();
            transaction.set(txRef, {
                id: txRef.id,
                userId: payoutData.instructorId,
                amount: payoutData.amount,
                currency: 'XOF',
                provider: 'withdrawal',
                type: 'payout',
                status: 'completed',
                date: FieldValue.serverTimestamp(),
                courseTitle: 'Retrait Mobile Money',
                metadata: { payoutId, adminId }
            });

            // ✅ UPDATE PAYOUT DOC
            transaction.update(payoutRef, {
                status: 'paid',
                processedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            });
        });

        await sendUserNotification(payoutData.instructorId, {
            text: `Votre virement de ${payoutData.amount.toLocaleString()} XOF a été effectué.`,
            type: 'success',
            link: '/student/paiements'
        });
    } else {
        // Simple mise à jour (approved ou rejected)
        await payoutRef.update({
            status,
            updatedAt: FieldValue.serverTimestamp(),
        });

        if (status === 'rejected') {
            await sendUserNotification(payoutData.instructorId, {
                text: `Votre demande de retrait de ${payoutData.amount.toLocaleString()} XOF a été rejetée.`,
                type: 'alert'
            });
        }
    }

    return { success: true };

  } catch (error: any) {
    console.error('Update payout error:', error.message);
    return { success: false, error: error.message };
  }
}
