'use server';

/**
 * @fileOverview Actions serveur pour les retraits.
 * ✅ RÉSOLU : Application des frais de retrait définis en admin.
 * ✅ SÉCURITÉ : Vérification du solde (Montant + Frais).
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAdminNotification, sendUserNotification } from './notificationActions';
import type { Settings, NdaraUser } from '@/lib/types';

interface RequestPayoutParams {
    instructorId: string;
    amount: number;
    method: 'mobile_money' | 'bank_transfer';
}

export async function requestPayoutAction({ instructorId, amount, method }: RequestPayoutParams): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
        const db = getAdminDb();
        
        // 1. Charger les réglages commerciaux
        const settingsSnap = await db.collection('settings').doc('global').get();
        const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;
        
        const minThreshold = settings.commercial?.minPayoutThreshold || 5000;
        const withdrawalFee = settings.commercial?.withdrawalFee || 0;

        // 2. Charger les données utilisateur
        const instructorRef = db.collection('users').doc(instructorId);
        const instructorDoc = await instructorRef.get();

        if (!instructorDoc.exists) {
            return { success: false, error: "error.user_not_found" };
        }

        const userData = instructorDoc.data() as NdaraUser;
        const currentBalance = userData.balance || 0;
        
        // ✅ APPLICATION DES FRAIS
        const totalCost = amount + withdrawalFee;

        if (currentBalance < totalCost) {
            return { success: false, error: "error.insufficient_balance" };
        }

        if (amount < minThreshold) {
            return { success: false, error: "error.payout_min_amount" };
        }

        if (method === 'mobile_money' && !userData.payoutInfo?.mobileMoneyNumber) {
            return { success: false, error: "error.payout_info_missing" };
        }

        const payoutRef = db.collection('payout_requests').doc();
        await payoutRef.set({
            id: payoutRef.id,
            instructorId,
            amount,
            withdrawalFee,
            totalCost,
            method,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
        });

        await sendAdminNotification({
            title: '💸 Nouvelle Demande de Retrait',
            body: `${userData.fullName} demande un retrait de ${amount.toLocaleString('fr-FR')} XOF. (Frais: ${withdrawalFee} F)`,
            link: '/admin/payouts',
            type: 'newPayouts'
        });

        return { success: true, message: "success.payout_requested" };

    } catch (error: any) {
        console.error("PAYOUT_REQUEST_ERROR:", error);
        return { success: false, error: "error.generic" };
    }
}

export async function updatePayoutStatusAction({ 
    payoutId, 
    status, 
    adminId 
}: { 
    payoutId: string; 
    status: 'approved' | 'paid' | 'rejected'; 
    adminId: string; 
}): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
        const db = getAdminDb();
        const payoutRef = db.collection('payout_requests').doc(payoutId);
        const payoutDoc = await payoutRef.get();

        if (!payoutDoc.exists) return { success: false, error: "error.generic" };
        
        const data = payoutDoc.data();
        const instructorId = data?.instructorId;
        const totalCost = data?.totalCost || data?.amount;

        // Si le retrait est validé ou payé, on déduit du solde
        if (status === 'approved') {
            await db.collection('users').doc(instructorId).update({
                balance: FieldValue.increment(-totalCost)
            });
        }

        await payoutRef.update({
            status,
            processedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'payout.process',
            target: { id: payoutId, type: 'payout' },
            details: `Retrait ${payoutId} passé à '${status}'. Montant total déduit: ${totalCost} F`,
            timestamp: FieldValue.serverTimestamp(),
        });

        if (instructorId) {
            await sendUserNotification(instructorId, {
                text: `Mise à jour retrait : ${status.toUpperCase()}`,
                link: '/instructor/revenus',
                type: status === 'rejected' ? 'alert' : 'success'
            });
        }

        return { success: true, message: "success.payout_updated" };
    } catch (e: any) {
        return { success: false, error: "error.generic" };
    }
}
