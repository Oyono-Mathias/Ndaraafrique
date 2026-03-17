'use server';

import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Actions serveur pour la passerelle Moneroo.
 * Gère l'initiation sécurisée (Server-to-Server).
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
            throw new Error("Clé secrète Moneroo non configurée sur le serveur.");
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
        
        return { success: false, error: "Impossible d'obtenir l'URL de paiement Moneroo." };
    } catch (e: any) {
        console.error("MONEROO_INIT_ERROR:", e.message);
        return { success: false, error: e.message };
    }
}
