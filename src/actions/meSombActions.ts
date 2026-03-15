'use server';

import { PaymentOperation } from '@hachther/mesomb';

/**
 * @fileOverview Actions serveur pour l'intégration de MeSomb via le SDK officiel.
 * Gère l'initiation des paiements (Collect) de manière sécurisée.
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
    console.error("MESOMB_CONFIG_MISSING: Ensure APP_KEY, ACCESS_KEY, and SECRET_KEY are set.");
    return { success: false, error: "Configuration MeSomb incomplète sur le serveur." };
  }

  try {
    const payment = new PaymentOperation({
      applicationKey,
      accessKey,
      secretKey,
    });

    // Initiation de la collecte (Collect)
    const response = await payment.makeCollect({
      amount: params.amount,
      service: params.service,
      receiver: params.phoneNumber,
      currency: 'XOF',
      nonce: `NDARA-${Date.now()}`,
      // Les metadata sont cruciales pour le webhook Ndara
      extra: {
        userId: params.userId,
        courseId: params.courseId,
        affiliateId: params.affiliateId || '',
        couponId: params.couponId || '',
        type: 'course_purchase'
      }
    });

    const data = response.transaction;

    if (response.isOperationSuccess() && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      return { 
        success: true, 
        transactionId: data.pk || data.id,
        message: "Demande de paiement envoyée. Veuillez valider sur votre téléphone." 
      };
    } else {
      return { success: false, error: "La demande de paiement a été rejetée ou a échoué." };
    }

  } catch (error: any) {
    console.error("MESOMB_SDK_ERROR:", error.message);
    return { success: false, error: "Impossible de contacter la passerelle MeSomb via le SDK." };
  }
}
