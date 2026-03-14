'use server';

import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';

class Moneroo {
    private secretKey: string | undefined;

    constructor(publicKey?: string, secretKey?: string) {
        this.secretKey = secretKey;
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

    get payments() { return { verify: this.verify.bind(this) }; }
}


export async function verifyMonerooTransaction(transactionId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const publicKey = process.env.NEXT_PUBLIC_MONEROO_PUBLIC_KEY;
    const secretKey = process.env.MONEROO_SECRET_KEY;

    try {
        const moneroo = new Moneroo(publicKey, secretKey);
        const response = await moneroo.payments.verify(transactionId);
        
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
