'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAdminNotification } from './notificationActions';

interface PayoutRequest {
    instructorId: string;
    amount: number;
}

export async function requestPayout({ instructorId, amount }: PayoutRequest): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminDb();
        const batch = db.batch();

        const payoutRef = db.collection('payouts').doc();
        batch.set(payoutRef, {
            instructorId,
            amount,
            status: 'en_attente',
            date: FieldValue.serverTimestamp(),
            method: 'Mobile Money'
        });

        await batch.commit();

        const instructorDoc = await db.collection('users').doc(instructorId).get();
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
        return { success: false, error: "Une erreur est survenue lors de la demande de retrait : " + error.message };
    }
}
