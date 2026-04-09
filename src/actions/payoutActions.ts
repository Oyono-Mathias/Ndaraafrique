'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAdminNotification } from './notificationActions';
import type { NdaraUser, RequestPayoutParams } from '@/lib/types';

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
        const settingsData = settingsSnap.exists ? settingsSnap.data() : {};

        const minThreshold = (settingsData as any)?.payments?.minimumPayoutAmount || 5000;
        const currentBalance = userData.balance || 0;

        if (currentBalance < amount) {
            return { success: false, error: "Solde insuffisant" };
        }

        if (amount < minThreshold) {
            return { success: false, error: `Minimum retrait: ${minThreshold} XOF` };
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

//////////////////////////////////////////////////////
// ✅ AJOUT MANQUANT (CRUCIAL POUR TON BUILD)
//////////////////////////////////////////////////////

export async function updatePayoutStatusAction(
  payoutId: string,
  status: 'pending' | 'approved' | 'rejected'
): Promise<{ success: boolean; error?: string }> {
  try {
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