
'use client';

import { processNdaraPayment } from '@/services/paymentProcessor';
import { createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Actions serveur pour MeSomb avec protection contre les crashs fatals.
 * ✅ RÉSOLU : Intégration des clés de production fournies par l'utilisateur.
 */

function generateMeSombSignature(method: string, url: string, date: number, nonce: string, secretKey: string): string {
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
    // Priorité aux variables d'environnement, sinon on utilise les clés de production fournies
    const applicationKey = process.env.MESOMB_APP_KEY || "9f9efc20ca14004f962c7d129ca724c6543ee051";
    const accessKey = process.env.MESOMB_ACCESS_KEY || "3ef066c6-dd64-4232-a148-c119e46f3224";
    const secretKey = process.env.MESOMB_SECRET_KEY || "1bf24b1d-7cae-466e-9765-7c7c5b84903e";

    const url = 'https://mesomb.hachther.com/api/v1.1/payment/collect/';
    const date = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(16).toString('hex');
    const signature = generateMeSombSignature('POST', url, date, nonce, secretKey);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-MeSomb-Application': applicationKey,
        'X-MeSomb-AccessKey': accessKey,
        'X-MeSomb-Signature': signature,
        'X-MeSomb-Nonce': nonce,
        'X-MeSomb-Timestamp': date.toString(),
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
      return { success: false, error: data.detail || "Erreur de la passerelle MeSomb." };
    }

  } catch (error: any) {
    console.error("INITIATE_PAYMENT_FATAL:", error.message);
    return { 
        success: false, 
        error: "Le service de paiement est indisponible. Veuillez réessayer." 
    };
  }
}
