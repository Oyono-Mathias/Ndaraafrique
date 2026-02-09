'use server';

import { getAdminDb } from '@/firebase/admin';
import { sendAdminNotification } from './notificationActions';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { SubscriptionPlan, NdaraUser } from '@/lib/types';

// This is a placeholder for the real Moneroo SDK.
class Moneroo {
    private secretKey: string | undefined;

    constructor(secretKey?: string) {
        this.secretKey = secretKey;
    }

    async verify(transactionId: string): Promise<{ status: string; data?: any; message?: string }> {
        if (!this.secretKey || this.secretKey === "YOUR_MONEROO_SECRET_KEY_HERE") {
             console.warn("Moneroo secret key is not configured.");
             return { status: 'error', message: 'Moneroo secret key not configured on the server.' };
        }
        
        const url = `https://api.moneroo.io/v1/payments/${transactionId}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' } });

        if (!response.ok) {
            throw new Error(`Moneroo API error: ${response.statusText}`);
        }
        return response.json();
    }
}

export async function verifySubscriptionTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
    const secretKey = process.env.MONEROO_SECRET_KEY;

    if (!secretKey || secretKey === "YOUR_MONEROO_SECRET_KEY_HERE") {
        console.error("CRITICAL: Moneroo secret key is not configured.");
        return { success: false, error: 'Passerelle de paiement non configurée.' };
    }

    try {
        const db = getAdminDb();
        const moneroo = new Moneroo(secretKey);
        const response = await moneroo.verify(transactionId);
        
        if (response?.status === 'success' && response.data?.status === 'successful') {
            const { userId, planId } = response.data.metadata;

            if (!userId || !planId) {
                throw new Error("Métadonnées transaction incomplètes.");
            }
            
            const [planSnap, userSnap] = await Promise.all([
                db.collection('subscription_plans').doc(planId).get(),
                db.collection('users').doc(userId).get()
            ]);

            if (!planSnap.exists || !userSnap.exists) {
                throw new Error("Plan ou Utilisateur introuvable.");
            }

            const plan = planSnap.data() as SubscriptionPlan;
            const user = userSnap.data() as NdaraUser;
            const now = Timestamp.now();
            
            const endDate = new Date(now.toDate());
            if (plan.billingCycle === 'monthly') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else if (plan.billingCycle === 'yearly') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }

            const subscriptionData = {
                subscriptionId: transactionId,
                userId: userId,
                planId: planId,
                status: 'active',
                startDate: now,
                endDate: Timestamp.fromDate(endDate),
                paymentTransactionId: transactionId,
            };

            const subscriptionRef = db.collection('users').doc(userId).collection('subscriptions').doc(transactionId);
            await subscriptionRef.set(subscriptionData);

            await sendAdminNotification({
                title: '🎉 Nouvel Abonnement',
                body: `${user.fullName} s'est abonné(e) au plan "${plan.name}".`,
                link: `/admin/users`,
                type: 'general'
            });

            return { success: true };
        } else {
            return { success: false, error: `Paiement non finalisé.` };
        }

    } catch (error: any) {
        console.error("Error verifying Moneroo subscription transaction:", error);
        return { success: false, error: error.message || 'Erreur de vérification du paiement.' };
    }
}
