'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAdminNotification, sendUserNotification } from './notificationActions';
import type { Settings, NdaraUser } from '@/lib/types';

// ... (verifyAdminOrThrow et RequestPayoutParams restent identiques)

export async function requestPayoutAction({ 
    instructorId, 
    amount, 
    method,
    requesterId 
}: RequestPayoutParams): Promise<{ success: boolean; error?: string; message?: string }> {
    
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

        if (userData.restrictions?.canWithdraw === false) {
            return { success: false, error: "RESTRICTED: Vos droits de retrait sont suspendus." };
        }

        const settingsSnap = await db.collection('settings').doc('global').get();
        // On récupère les données brutes pour éviter le blocage du typage strict sur le champ manquant
        const settingsData = (settingsSnap.exists ? settingsSnap.data() : {}) as any;
        
        // 🔄 Utilisation du champ du nouveau module 'payments'
        // On prévoit un repli (fallback) sur 5000 si le champ est absent en base
        const minThreshold = settingsData.payments?.minimumPayoutAmount || 5000;
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

        // Notifications et logs...
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
