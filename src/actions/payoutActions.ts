'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAdminNotification } from './notificationActions';

interface PayoutRequest {
    instructorId: string;
    amount: number;
}

export async function requestPayout({ instructorId, amount }: PayoutRequest): Promise<{ success: boolean; error?: string }> {
    if (!adminDb) {
        return { success: false, error: "Le service est temporairement indisponible." };
    }
    if (amount <= 0) {
        return { success: false, error: "Le montant doit être positif." };
    }

    try {
        const batch = adminDb.batch();

        const payoutRef = adminDb.collection('payouts').doc();
        batch.set(payoutRef, {
            instructorId,
            amount,
            status: 'en_attente',
            date: FieldValue.serverTimestamp(),
            method: 'Mobile Money' // Default method for now
        });

        await batch.commit();

        // Send notification to admin
        const instructorDoc = await adminDb.collection('users').doc(instructorId).get();
        const instructorName = instructorDoc.data()?.fullName || 'Un instructeur';

        await sendAdminNotification({
            title: 'Nouvelle demande de retrait',
            body: `${instructorName} a demandé un retrait de ${amount.toLocaleString('fr-FR')} XOF.`,
            link: '/admin/payouts',
            type: 'newPayouts'
        });

        return { success: true };

    } catch (error: any) {
        console.error("Error requesting payout:", error);
        return { success: false, error: "Une erreur est survenue lors de la demande de retrait." };
    }
}
