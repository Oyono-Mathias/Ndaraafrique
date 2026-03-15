'use server';

/**
 * @fileOverview Actions serveur pour l'intégration de MeSomb.
 * Gère l'initiation des paiements (Collect) via l'API MeSomb.
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
  const API_KEY = process.env.MESOMB_API_KEY;
  const APPLICATION_KEY = process.env.MESOMB_APP_KEY;

  if (!API_KEY || !APPLICATION_KEY) {
    console.error("MESOMB_CONFIG_MISSING");
    return { success: false, error: "Configuration MeSomb manquante sur le serveur." };
  }

  try {
    const url = 'https://mesomb.com/api/v1.1/payment/online/';
    
    const payload = {
      amount: params.amount,
      service: params.service,
      receiver: params.phoneNumber,
      country: 'CM', // Ajustable selon le marché cible
      currency: 'XOF',
      reference: `NDARA-${Date.now()}`,
      metadata: {
        userId: params.userId,
        courseId: params.courseId,
        affiliateId: params.affiliateId || '',
        couponId: params.couponId || '',
        type: 'course_purchase'
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MeSomb-Application': APPLICATION_KEY,
        'Authorization': `Token ${API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      // Pour MeSomb, le statut peut être immédiat ou asynchrone
      return { success: true, transactionId: data.transaction?.pk || data.reference };
    } else {
      return { success: false, error: data.detail || "La demande de paiement a été rejetée par MeSomb." };
    }

  } catch (error: any) {
    console.error("MESOMB_INIT_ERROR:", error.message);
    return { success: false, error: "Impossible de contacter la passerelle MeSomb." };
  }
}
