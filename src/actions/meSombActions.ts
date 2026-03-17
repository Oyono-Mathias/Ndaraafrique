
'use server';

import { createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Actions serveur pour MeSomb.
 * Correction : Utilisation du format Authorization consolidé pour éviter 'No signature provided'.
 */

// Clés de production fournies par l'utilisateur
const APPLICATION_KEY = process.env.MESOMB_APP_KEY || "9f9efc20ca14004f962c7d129ca724c6543ee051";
const ACCESS_KEY = process.env.MESOMB_ACCESS_KEY || "3ef066c6-dd64-4232-a148-c119e46f3224";
const SECRET_KEY = process.env.MESOMB_SECRET_KEY || "1bf24b1d-7cae-466e-9765-7c7c5b84903e";

function generateMeSombSignature(method: string, url: string, date: number, nonce: string, secretKey: string): string {
    // La chaîne de signature doit être construite avec précision
    const credentials = `${method}\n${url}\n${date}\n${nonce}`;
    return createHmac('sha256', secretKey).update(credentials).digest('hex');
}

interface MeSombPaymentParams {
  amount: number;
  phoneNumber: string;
  service: 'ORANGE' | 'MTN';
  courseId: string;
  userId: string;
  affiliateId?: string;
  couponId?: string;
  type?: 'course_purchase' | 'wallet_topup';
}

export async function initiateMeSombPayment(params: MeSombPaymentParams) {
  try {
    const url = 'https://mesomb.hachther.com/api/v1.1/payment/collect/';
    const date = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(16).toString('hex');
    
    // Génération de la signature HMAC
    const signature = generateMeSombSignature('POST', url, date, nonce, SECRET_KEY);

    // Format d'en-tête consolidé pour MeSomb
    const authHeader = `MeSomb ${ACCESS_KEY}:${signature}:${date}:${nonce}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'X-MeSomb-Application': APPLICATION_KEY,
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
          type: params.type || 'course_purchase'
        }
      }),
    });

    const data = await response.json();

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      return { 
        success: true, 
        transactionId: data.pk || data.id,
        message: "Demande envoyée. Validez sur votre téléphone." 
      };
    } else {
      console.error("MESOMB_API_ERROR:", data);
      return { 
        success: false, 
        error: data.detail || data.message || "La passerelle MeSomb a refusé la requête." 
      };
    }

  } catch (error: any) {
    console.error("INITIATE_PAYMENT_FATAL:", error.message);
    return { 
        success: false, 
        error: "Le service de paiement est indisponible. Veuillez réessayer." 
    };
  }
}
