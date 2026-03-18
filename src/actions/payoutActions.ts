'use server';

/**
 * @fileOverview Actions serveur pour les retraits.
 * ✅ RÉSOLU : Codes de traduction pour les retours serveur.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAdminNotification, sendUserNotification } from './notificationActions';

interface RequestPayoutParams {
    instructorId: string;
    amount: number;
    method: 'mobile_money' | 'bank_transfer';
}

export async function requestPayoutAction({ instructorId, amount, method }: RequestPayoutParams): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
        const db = getAdminDb();
        const instructorRef = db.collection('users').doc(instructorId);
        const instructorDoc = await instructorRef.get();

        if (!instructorDoc.exists) {
            return { success: false, error: "error.user_not_found" };
        }

        const data = instructorDoc.data();
        
        if (method === 'mobile_money' && !data?.payoutInfo?.mobileMoneyNumber) {
            return { success: false, error: "error.payout_info_missing" };
        }

        if (amount < 5000) {
            return { success: false, error: "error.payout_min_amount" };
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
            body: `${data?.fullName} demande un retrait de ${amount.toLocaleString('fr-FR')} XOF.`,
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
        
        const instructorId = payoutDoc.data()?.instructorId;

        await payoutRef.update({
            status,
            processedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'payout.process',
            target: { id: payoutId, type: 'payout' },
            details: `Retrait ${payoutId} passé à '${status}'.`,
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
