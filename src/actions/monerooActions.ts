'use server';

import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Actions serveur pour la passerelle Moneroo.
 * ✅ RÉSOLU : Ajout de l'initiation de paiement (Create Payment).
 */

class Moneroo {
    private secretKey: string | undefined;

    constructor(secretKey?: string) {
        this.secretKey = secretKey;
    }

    /**
     * Initie un paiement auprès de Moneroo pour obtenir une URL de redirection.
     */
    async createPayment(params: {
        amount: number;
        currency: string;
        customer: { name: string; email: string };
        metadata: any;
        returnUrl: string;
    }) {
        if (!this.secretKey || this.secretKey === "YOUR_MONEROO_SECRET_KEY_HERE") {
            throw new Error("Clé secrète Moneroo non configurée.");
        }

        const response = await fetch('https://api.moneroo.io/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                amount: params.amount,
                currency: params.currency,
                customer: params.customer,
                metadata: params.metadata,
                return_url: params.returnUrl,
                description: `Achat sur Ndara Afrique`
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Erreur lors de la création du paiement Moneroo.");
        }

        return response.json();
    }

    async verify(transactionId: string): Promise<{ status: string; data?: any; message?: string }> {
        if (!this.secretKey || this.secretKey === "YOUR_MONEROO_SECRET_KEY_HERE") {
             console.warn("Moneroo secret key is not configured.");
             return {
                status: 'error',
                message: 'Moneroo secret key not configured on the server.',
             };
        }
        
        const url = `https://api.moneroo.io/v1/payments/${transactionId}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.message || `Moneroo API error: ${response.statusText}`);
        }
        
        return response.json();
    }
}

export async function initiateMonerooPayment(params: {
    amount: number;
    userId: string;
    userEmail: string;
    userName: string;
    courseId: string;
    affiliateId?: string;
    couponId?: string;
    returnUrl: string;
}) {
    const secretKey = process.env.MONEROO_SECRET_KEY;
    const moneroo = new Moneroo(secretKey);

    try {
        const response = await moneroo.createPayment({
            amount: params.amount,
            currency: 'XOF',
            customer: {
                name: params.userName,
                email: params.userEmail
            },
            metadata: {
                userId: params.userId,
                courseId: params.courseId,
                affiliateId: params.affiliateId || '',
                couponId: params.couponId || '',
                type: 'course_purchase'
            },
            returnUrl: params.returnUrl
        });

        if (response.status === 'success' && response.data?.checkout_url) {
            return { success: true, checkoutUrl: response.data.checkout_url };
        }
        
        return { success: false, error: "Impossible d'obtenir l'URL de paiement." };
    } catch (e: any) {
        console.error("MONEROO_INIT_ERROR:", e.message);
        return { success: false, error: e.message };
    }
}

export async function verifyMonerooTransaction(transactionId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const secretKey = process.env.MONEROO_SECRET_KEY;

    try {
        const moneroo = new Moneroo(secretKey);
        const response = await moneroo.verify(transactionId);
        
        if (response?.status === 'success' && response.data?.status === 'successful') {
            
            const metadata = response.data.metadata;

            if (!metadata?.userId || !metadata?.courseId) {
                console.error("Moneroo manual verification: Missing metadata", metadata);
                return { success: false, error: 'Transaction metadata is incomplete.' };
            }

            // ✅ Call the central payment processor
            await processNdaraPayment({
                transactionId: response.data.id,
                provider: 'moneroo',
                amount: response.data.amount,
                currency: response.data.currency_code,
                metadata: {
                    userId: metadata.userId,
                    courseId: metadata.courseId,
                    affiliateId: metadata.affiliateId,
                    couponId: metadata.couponId,
                    type: metadata.type || 'course_purchase'
                }
            });

            return { success: true, data: response.data };
        } else {
            return { success: false, error: response?.message || `Paiement non finalisé.` };
        }

    } catch (error: any) {
        console.error("Error verifying Moneroo transaction:", error);
        return { success: false, error: error.message || 'Erreur de vérification.' };
    }
}
