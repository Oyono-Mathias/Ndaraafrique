'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAdminNotification } from './notificationActions';

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
