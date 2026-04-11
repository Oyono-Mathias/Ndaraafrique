'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAdminNotification } from './notificationActions';
import type { NdaraUser, RequestPayoutParams, Settings } from '@/lib/types';

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

// ✅ DEMANDE DE RETRAIT
export async function requestPayoutAction({ 
    instructorId, 
    amount, 
    method,
    requesterId 
}: RequestPayoutParams): Promise<{ success: boolean; error?: string; message?: string }> {
    
    if (instructorId !== requesterId) {
        throw new Error("UNAUTHORIZED: Tentative de retrait sur un compte tiers.");
    }

    if (amount <= 0) {
        return { success: false, error: "Montant invalide" };
    }

    try {
        const db = getAdminDb();
        const instructorRef = db.collection('users').doc(instructorId);
        const instructorDoc = await instructorRef.get();

        if (!instructorDoc.exists) {
            return { success: false, error: "Utilisateur introuvable" };
        }

        const userData = instructorDoc.data() as NdaraUser;

        if (userData.restrictions?.canWithdraw === false) {
            return { success: false, error: "Retraits suspendus" };
        }

        const settingsSnap = await db.collection('settings').doc('global').get();
        const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;

        // 🛡️ VÉRIFICATION SEUIL : minWithdrawal
        const minThreshold = settings.finance?.minWithdrawal || 5000;
        const currentBalance = userData.balance || 0;

        if (currentBalance < amount) {
            return { success: false, error: "Solde insuffisant" };
        }

        if (amount < minThreshold) {
            return { success: false, error: `Le montant minimum de retrait est de ${minThreshold.toLocaleString()} XOF.` };
        }

        const payoutRef = db.collection('payout_requests').doc();

        await payoutRef.set({
            id: payoutRef.id,
            instructorId,
            amount,
            method,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
        });

        await sendAdminNotification({
            title: '💸 Nouvelle Demande de Retrait',
            body: `${userData.fullName} demande ${amount.toLocaleString()} XOF.`,
            link: '/admin/payouts',
            type: 'newPayouts'
        });

        return { success: true, message: "Demande envoyée" };

    } catch (error: any) {
        console.error("Payout Request Error:", error.message);
        return { success: false, error: "Erreur serveur" };
    }
}

// ✅ MISE À JOUR STATUT (Action Admin)
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
    const payoutDoc = await payoutRef.get();

    if (!payoutDoc.exists) {
      return { success: false, error: 'Payout introuvable' };
    }

    await payoutRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };

  } catch (error: any) {
    console.error('Update payout error:', error.message);
    return { success: false, error: 'Erreur serveur' };
  }
}
