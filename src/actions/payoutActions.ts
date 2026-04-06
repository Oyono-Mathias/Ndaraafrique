'use server';

/**
 * @fileOverview Actions serveur pour les retraits.
 * ✅ SÉCURITÉ : Vérification systématique du propriétaire du compte.
 * ✅ VALIDATION : Blocage des montants invalides ou insuffisants.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAdminNotification, sendUserNotification } from './notificationActions';
import type { Settings, NdaraUser } from '@/lib/types';

interface RequestPayoutParams {
    instructorId: string;
    amount: number;
    method: 'mobile_money' | 'bank_transfer';
    requesterId: string;
}

export async function requestPayoutAction({ 
    instructorId, 
    amount, 
    method,
    requesterId 
}: RequestPayoutParams): Promise<{ success: boolean; error?: string; message?: string }> {
    
    // 🛡️ SÉCURITÉ : L'ID de l'appelant (requesterId) doit correspondre au propriétaire du compte
    if (instructorId !== requesterId) {
        throw new Error("UNAUTHORIZED: Tentative de retrait sur un compte tiers.");
    }

    if (amount <= 0) throw new Error("Montant de retrait invalide.");

    try {
        const db = getAdminDb();
        const instructorRef = db.collection('users').doc(instructorId);
        const instructorDoc = await instructorRef.get();

        if (!instructorDoc.exists) return { success: false, error: "error.user_not_found" };

        const userData = instructorDoc.data() as NdaraUser;

        // 🚫 VÉRIFICATION DES RESTRICTIONS (Backend Enforcement)
        if (userData.restrictions?.canWithdraw === false) {
            return { success: false, error: "RESTRICTED: Vos droits de retrait sont suspendus." };
        }

        const settingsSnap = await db.collection('settings').doc('global').get();
        const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;
        
        const minThreshold = settings.commercial?.minPayoutThreshold || 5000;
        const currentBalance = userData.balance || 0;

        if (currentBalance < amount) return { success: false, error: "error.insufficient_balance" };
        if (amount < minThreshold) return { success: false, error: "error.payout_min_amount" };

        const payoutRef = db.collection('payout_requests').doc();
        await payoutRef.set({
            id: payoutRef.id,
            instructorId,
            amount,
            method,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
        });

        // Journalisation de l'audit interne
        await db.collection('admin_audit_logs').add({
            adminId: 'SYSTEM',
            eventType: 'payout.request',
            target: { id: instructorId, type: 'user' },
            details: `Demande de retrait de ${amount} XOF via ${method}.`,
            timestamp: FieldValue.serverTimestamp()
        });

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