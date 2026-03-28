'use server';

/**
 * @fileOverview Actions serveur pour la passerelle Moneroo.
 * ✅ DEBUG : Ajout d'un mode simulation si la clé API est absente.
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
    
    // 🛡️ FALLBACK SIMULATION
    if (!secretKey || secretKey.length < 10) {
        console.warn(`[Moneroo] Clé manquante ou invalide. Simulation pour ${params.userEmail}`);
        return { 
            success: true, 
            checkoutUrl: params.returnUrl, // On redirige directement vers le succès pour le test
            message: "Mode Test : Redirection vers vos formations (Simulation)."
        };
    }

    try {
        const response = await fetch('https://api.moneroo.io/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
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
                description: `Achat sur Ndara Afrique`
            })
        });

        const result = await response.json();

        if (response.ok && result.status === 'success' && result.data?.checkout_url) {
            return { success: true, checkoutUrl: result.data.checkout_url };
        }
        
        console.error("[Moneroo Error Details]", JSON.stringify(result));
        return { success: false, error: result.message || "Échec de création du lien Moneroo." };
    } catch (e: any) {
        console.error("[Moneroo Fatal Error]", e.message);
        return { success: false, error: "Connexion Moneroo impossible." };
    }
}
