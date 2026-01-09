
'use server';

import Moneroo from 'moneroo.js';

// Note: This file will run on the server, so process.env is safe to use.
// Ensure MONEROO_PUBLIC_KEY and MONEROO_SECRET_KEY are in your .env file.

export async function verifyMonerooTransaction(transactionId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const publicKey = process.env.NEXT_PUBLIC_MONEROO_PUBLIC_KEY;
    const secretKey = process.env.MONEROO_SECRET_KEY;

    if (!secretKey || secretKey === "YOUR_MONEROO_SECRET_KEY_HERE") {
        console.error("Moneroo secret key is not configured.");
        return { success: false, error: 'Configuration serveur incomplète. Clé secrète manquante.' };
    }

    try {
        const moneroo = new Moneroo(publicKey, secretKey);
        const response = await moneroo.payments.verify(transactionId);
        
        if (response?.status === 'success' && response.data?.status === 'successful') {
            return { success: true, data: response.data };
        } else if (response?.status === 'success') {
            return { success: false, error: `Paiement non finalisé. Statut : ${response.data?.status}` };
        } else {
            return { success: false, error: response?.message || 'Vérification impossible auprès de Moneroo.' };
        }

    } catch (error: any) {
        console.error("Error verifying Moneroo transaction:", error);
        return { success: false, error: error.message || 'Erreur de vérification du paiement.' };
    }
}
