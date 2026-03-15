'use server';

/**
 * @fileOverview Actions serveur pour l'intégration de MeSomb via l'API REST.
 * Utilise les variables d'environnement standardisées.
 */

interface MeSombPaymentParams {
  amount: number;
  phoneNumber: string;
  service: 'ORANGE' | 'MTN';
  courseId: string;
  userId: string;
  affiliateId?: string;
  couponId?: string;
}

export async function initiateMeSombPayment(params: MeSombPaymentParams) {
  const applicationKey = process.env.MESOMB_APP_KEY;
  const accessKey = process.env.MESOMB_ACCESS_KEY;
  const secretKey = process.env.MESOMB_SECRET_KEY;

  if (!applicationKey || !accessKey || !secretKey) {
    console.error("MESOMB_CONFIG_MISSING: Vérifiez vos variables d'environnement.");
    return { success: false, error: "Configuration MeSomb incomplète sur le serveur." };
  }

  try {
    // Initiation de la collecte via l'API REST MeSomb v1.1
    const response = await fetch('https://mesomb.hachther.com/api/v1.1/payment/collect/', {
      method: 'POST',
      headers: {
        'X-MeSomb-Application': applicationKey,
        'X-MeSomb-AccessKey': accessKey,
        'X-MeSomb-SecretKey': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount,
        service: params.service,
        receiver: params.phoneNumber,
        currency: 'XOF',
        nonce: `NDARA-${Date.now()}`,
        extra: {
          userId: params.userId,
          courseId: params.courseId,
          affiliateId: params.affiliateId || '',
          couponId: params.couponId || '',
          type: 'course_purchase'
        }
      }),
    });

    const data = await response.json();

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      return { 
        success: true, 
        transactionId: data.pk || data.id,
        message: "Demande de paiement envoyée. Veuillez valider sur votre téléphone." 
      };
    } else {
      return { success: false, error: data.detail || "La demande de paiement a été rejetée ou a échoué." };
    }

  } catch (error: any) {
    console.error("MESOMB_API_ERROR:", error.message);
    return { success: false, error: "Impossible de contacter la passerelle MeSomb." };
  }
}
