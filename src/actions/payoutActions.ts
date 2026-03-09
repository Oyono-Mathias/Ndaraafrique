'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAdminNotification, sendUserNotification } from './notificationActions';

interface RequestPayoutParams {
    instructorId: string;
    amount: number;
    method: 'mobile_money' | 'bank_transfer';
}

/**
 * Soumet une demande de retrait officielle dans la collection payout_requests.
 */
export async function requestPayoutAction({ instructorId, amount, method }: RequestPayoutParams): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminDb();
        const instructorRef = db.collection('users').doc(instructorId);
        const instructorDoc = await instructorRef.get();

        if (!instructorDoc.exists) {
            return { success: false, error: "Instructeur introuvable." };
        }

        const data = instructorDoc.data();
        
        // Sécurité CEO : Vérifier si l'instructeur a les informations nécessaires
        if (method === 'mobile_money' && !data?.payoutInfo?.mobileMoneyNumber) {
            return { success: false, error: "Veuillez renseigner votre numéro Mobile Money dans vos réglages." };
        }
        if (method === 'bank_transfer' && !data?.payoutInfo?.bankInfo) {
            return { success: false, error: "Veuillez renseigner vos coordonnées bancaires dans vos réglages." };
        }

        // Seuil minimum de retrait
        if (amount < 5000) {
            return { success: false, error: "Le montant minimum de retrait est de 5 000 XOF." };
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

        // Notification Admin immédiate
        await sendAdminNotification({
            title: '💸 Nouvelle Demande de Retrait',
            body: `${data?.fullName} demande un retrait de ${amount.toLocaleString('fr-FR')} XOF via ${method === 'mobile_money' ? 'Momo' : 'Virement'}.`,
            link: '/admin/payouts',
            type: 'newPayouts'
        });

        return { success: true };

    } catch (error: any) {
        console.error("PAYOUT_REQUEST_ERROR:", error);
        return { success: false, error: "Une erreur est survenue : " + (error.message || "Erreur serveur") };
    }
}

/**
 * Met à jour le statut d'un retrait par l'administrateur.
 */
export async function updatePayoutStatusAction({ 
    payoutId, 
    status, 
    adminId 
}: { 
    payoutId: string; 
    status: 'approved' | 'paid' | 'rejected'; 
    adminId: string; 
}): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminDb();
        const payoutRef = db.collection('payout_requests').doc(payoutId);
        const payoutDoc = await payoutRef.get();

        if (!payoutDoc.exists) return { success: false, error: "Demande introuvable." };
        
        const payoutData = payoutDoc.data();
        const instructorId = payoutData?.instructorId;

        const batch = db.batch();
        batch.update(payoutRef, {
            status,
            processedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Log d'audit stratégique
        const auditRef = db.collection('admin_audit_logs').doc();
        batch.set(auditRef, {
            adminId,
            eventType: 'payout.process',
            target: { id: payoutId, type: 'payout' },
            details: `Le retrait de ${payoutData?.amount} XOF pour l'instructeur ${instructorId} a été passé au statut '${status}'.`,
            timestamp: FieldValue.serverTimestamp(),
        });

        await batch.commit();

        // Notification de réassurance à l'instructeur
        let msg = "";
        let type: 'info' | 'success' | 'alert' = 'info';
        
        if (status === 'approved') {
            msg = "Bonne nouvelle ! Votre demande de retrait a été approuvée et est en cours de transfert.";
            type = 'info';
        } else if (status === 'paid') {
            msg = `Félicitations ! Votre retrait de ${(payoutData?.amount || 0).toLocaleString('fr-FR')} XOF a été versé sur votre compte.`;
            type = 'success';
        } else if (status === 'rejected') {
            msg = "Votre demande de retrait n'a pas pu être validée. Veuillez consulter le support technique.";
            type = 'alert';
        }

        if (instructorId) {
            await sendUserNotification(instructorId, {
                text: msg,
                link: '/instructor/revenus',
                type
            });
        }

        return { success: true };
    } catch (e: any) {
        console.error("UPDATE_PAYOUT_ERROR:", e);
        return { success: false, error: e.message || "Erreur serveur lors de la mise à jour." };
    }
}
