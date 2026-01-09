
'use server';

import Moneroo from 'moneroo.js';

interface PaymentLinkData {
    amount: number;
    currency: 'XOF';
    description: string;
    customer: {
        email: string;
        name: string;
    };
    metadata?: Record<string, any>;
}

export async function createMonerooPaymentLink(data: PaymentLinkData): Promise<{ success: boolean; paymentLink?: string; error?: string }> {
    const publicKey = process.env.MONEROO_PUBLIC_KEY;
    const secretKey = process.env.MONEROO_SECRET_KEY;

    if (!publicKey || !secretKey) {
        console.error("Moneroo API keys are not configured in environment variables.");
        return { success: false, error: 'La configuration des paiements est incomplète sur le serveur.' };
    }

    try {
        const moneroo = new Moneroo(publicKey, secretKey);

        const response = await moneroo.payments.initialize({
            amount: data.amount,
            currency: data.currency,
            description: data.description,
            redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/paiement/verify`,
            customer: {
                email: data.customer.email,
                name: data.customer.name,
            },
            metadata: data.metadata,
        });

        if (response?.status === 'success' && response.payment_link) {
            return { success: true, paymentLink: response.payment_link };
        } else {
            console.error("Moneroo API Error:", response);
            return { success: false, error: response?.message || "Impossible de créer le lien de paiement." };
        }
    } catch (error: any) {
        console.error("Error creating Moneroo payment link:", error);
        return { success: false, error: error.message || 'Une erreur serveur est survenue.' };
    }
}

export async function verifyMonerooTransaction(transactionId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const publicKey = process.env.MONEROO_PUBLIC_KEY;
    const secretKey = process.env.MONEROO_SECRET_KEY;

    if (!publicKey || !secretKey) {
        console.error("Moneroo API keys are not configured.");
        return { success: false, error: 'Configuration serveur incomplète.' };
    }

    try {
        const moneroo = new Moneroo(publicKey, secretKey);
        const response = await moneroo.payments.verify(transactionId);
        
        if (response?.status === 'success' && response.data?.status === 'successful') {
            return { success: true, data: response.data };
        } else if (response?.status === 'success') {
            return { success: false, error: `Paiement non finalisé. Statut : ${response.data?.status}` };
        } else {
            return { success: false, error: response?.message || 'Vérification impossible.' };
        }

    } catch (error: any) {
        console.error("Error verifying Moneroo transaction:", error);
        return { success: false, error: error.message || 'Erreur de vérification.' };
    }
}
