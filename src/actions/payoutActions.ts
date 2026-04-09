'use server';

/**
 * @fileOverview Actions serveur pour les retraits.
 * ✅ RÉSOLU : Alignement sur 'settings.payments.minimumPayoutAmount' (v3.0).
 * ✅ SÉCURITÉ : Vérification systématique du propriétaire et du rôle admin.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAdminNotification, sendUserNotification } from './notificationActions';
import type { Settings, NdaraUser } from '@/lib/types';

// ... (Garder verifyAdminOrThrow et RequestPayoutParams identiques)

async function verifyAdminOrThrow(adminId: string) {
    if (!adminId) throw new Error("UNAUTHORIZED");
    const db = getAdminDb();
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
        throw new Error("UNAUTHORIZED: Droits d'administrateur requis.");
    }
}

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
        const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;
        
        // 🔄 CORRECTION : settings.commercial -> settings.payments
        // On utilise 'minimumPayoutAmount' défini dans ton schéma v3.0
        const minThreshold = settings.payments?.minimumPayoutAmount || 5000;
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

// ... (Garder updatePayoutStatusAction identique)

export async function updatePayoutStatusAction({ 
    payoutId, 
    status, 
    adminId 
}: { 
    payoutId: string; 
    status: 'approved' | 'paid' | 'rejected'; 
    adminId: string;
}) {
    try {
        await verifyAdminOrThrow(adminId);
        
        const db = getAdminDb();
        const payoutRef = db.collection('payout_requests').doc(payoutId);
        const payoutDoc = await payoutRef.get();

        if (!payoutDoc.exists) return { success: false, error: "Demande introuvable." };
        
        const payoutData = payoutDoc.data();
        const instructorId = payoutData?.instructorId;

        await payoutRef.update({
            status,
            processedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        if (status === 'paid' && instructorId) {
            const userRef = db.collection('users').doc(instructorId);
            await userRef.update({
                balance: FieldValue.increment(-payoutData?.amount)
            });
        }

        if (instructorId) {
            await sendUserNotification(instructorId, {
                text: `Votre demande de retrait de ${payoutData?.amount} XOF a été ${status === 'paid' ? 'payée' : status === 'approved' ? 'approuvée' : 'rejetée'}.`,
                link: '/instructor/revenus',
                type: status === 'rejected' ? 'alert' : 'success'
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Update Payout Status Error:", error.message);
        return { success: false, error: error.message || "Erreur lors de la mise à jour." };
    }
}
