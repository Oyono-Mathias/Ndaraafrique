'use server';

import { adminDb } from '@/firebase/admin';
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
             console.warn("Moneroo secret key is not configured. Simulating successful payment verification is DEACTIVATED. A real key is required.");
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
        console.error("CRITICAL: Moneroo secret key is not configured. Subscription verification cannot proceed.");
        return { success: false, error: 'Payment gateway not configured. Contact support.' };
    }
    if (!adminDb) return { success: false, error: "Database not connected" };

    try {
        const moneroo = new Moneroo(secretKey);
        const response = await moneroo.verify(transactionId);
        
        if (response?.status === 'success' && response.data?.status === 'successful') {
            const { userId, planId } = response.data.metadata;

            if (!userId || !planId) {
                throw new Error("User ID or Plan ID missing in transaction metadata.");
            }
            
            const [planSnap, userSnap] = await Promise.all([
                adminDb.collection('subscription_plans').doc(planId).get(),
                adminDb.collection('users').doc(userId).get()
            ]);

            if (!planSnap.exists || !userSnap.exists) {
                throw new Error("Plan or User not found.");
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

            const subscriptionRef = adminDb.collection('users').doc(userId).collection('subscriptions').doc(transactionId);
            await subscriptionRef.set(subscriptionData);

            await sendAdminNotification({
                title: '🎉 Nouvel Abonnement',
                body: `${user.fullName} s'est abonné(e) au plan "${plan.name}".`,
                link: `/admin/users`, // A dedicated subscription page could be better
                type: 'general'
            });

            return { success: true };
        } else {
             await sendAdminNotification({
                title: '⚠️ Anomalie de Paiement Abonnement',
                body: `Échec de la vérification Moneroo pour la transaction abonnement ID: ${transactionId}. Statut: ${response.data?.status || 'inconnu'}.`,
                link: '/admin/payments',
                type: 'financialAnomalies'
            });
            return { success: false, error: `Paiement non finalisé. Statut : ${response.data?.status}` };
        }

    } catch (error: any) {
        console.error("Error verifying Moneroo subscription transaction:", error);
         await sendAdminNotification({
            title: '🔥 Erreur Critique (Abonnement)',
            body: `Le service de vérification Moneroo a échoué. Cause: ${error.message}`,
            link: '/admin/settings',
            type: 'financialAnomalies'
        });
        return { success: false, error: error.message || 'Erreur de vérification du paiement.' };
    }
}
