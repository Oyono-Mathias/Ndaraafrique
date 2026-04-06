'use server';

import { processNdaraPayment } from '@/services/paymentProcessor';
import { getAdminDb } from '@/firebase/admin';
import type { NdaraUser } from '@/lib/types';

/**
 * @fileOverview Actions serveur pour la passerelle Moneroo.
 * ✅ DEBUG : Logs détaillés des échanges API.
 * ✅ SIMULATION : Redirection directe en mode test.
 * ✅ RESTRICTIONS : Vérification canBuyCourse.
 */

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
    const secretKey = process.env.MONEROO_SECRET_KEY?.trim();
    const db = getAdminDb();
    
    // 🛡️ VÉRIFICATION DES RESTRICTIONS
    const userDoc = await db.collection('users').doc(params.userId).get();
    const userData = userDoc.data() as NdaraUser;
    if (userData.restrictions?.canBuyCourse === false) {
        return { success: false, error: "RESTRICTED: Votre droit d'achat est suspendu par l'administration." };
    }

    // 🛠️ LOG DE DIAGNOSTIC
    console.log(`[Moneroo API] Initiation pour ${params.userEmail} | Montant: ${params.amount}`);

    // 🛡️ FALLBACK SIMULATION
    if (!secretKey || secretKey.length < 10) {
        console.warn(`[Moneroo] ⚠️ CLÉ ABSENTE : Redirection immédiate (Mode Test)`);
        return { 
            success: true, 
            checkoutUrl: params.returnUrl,
            message: "Mode Test : Redirection vers vos formations en cours."
        };
    }

    try {
        const payload = {
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
            return_url: params.returnUrl,
            description: `Achat Ndara Afrique - ${params.courseId}`
        };

        console.log(`[Moneroo Request] Payload:`, JSON.stringify(payload));

        const response = await fetch('https://api.moneroo.io/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        console.log(`[Moneroo Response] Status: ${response.status}`);
        console.log(`[Moneroo Response] Body:`, JSON.stringify(result));

        if (response.ok && result.status === 'success' && result.data?.checkout_url) {
            return { success: true, checkoutUrl: result.data.checkout_url };
        }
        
        const errorMsg = result.message || "Échec de création du lien de paiement.";
        console.error(`[Moneroo API Error] ${errorMsg}`);
        return { success: false, error: `Erreur Moneroo: ${errorMsg}` };

    } catch (e: any) {
        console.error("[Moneroo Fatal Error]", e.message);
        return { success: false, error: "Connexion aux serveurs Moneroo impossible." };
    }
}
