'use server';

import { createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Actions serveur pour MeSomb (Ndara Afrique V4.3).
 * ✅ FIX : Interface complète (affiliateId, couponId) pour corriger le build Vercel.
 * ✅ FIX : Retour explicite de transactionId pour TypeScript.
 */

const APPLICATION_KEY = (process.env.MESOMB_APP_KEY || "9f9efc20ca14004f962c7d129ca724c6543ee051").trim();
const ACCESS_KEY = (process.env.MESOMB_ACCESS_KEY || "3ef066c6-dd64-4232-a148-c119e46f3224").trim();
const SECRET_KEY = (process.env.MESOMB_SECRET_KEY || "1bf24b1d-7cae-466e-9765-7c7c5b84903e").trim();

interface MeSombPaymentParams {
  amount: number;
  phoneNumber: string;
  service: 'ORANGE' | 'MTN';
  courseId: string;
  userId: string;
  type?: 'course_purchase' | 'wallet_topup';
  affiliateId?: string; // Ajouté pour le build
  couponId?: string;    // Ajouté pour le build
}

export async function initiateMeSombPayment(params: MeSombPaymentParams) {
  try {
    const url = 'https://mesomb.hachther.com/api/v1.1/payment/collect';
    const date = new Date();
    const timestamp = Math.floor(date.getTime() / 1000);
    const nonce = randomBytes(16).toString('hex');
    
    const cleanPhone = params.phoneNumber.replace(/\D/g, '');

    // Détection devise (Cameroun/RCA = XAF)
    let finalCurrency = 'XOF';
    if (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) {
        finalCurrency = 'XAF';
    }

    const bodyData = {
        amount: params.amount,
        service: params.service,
        receiver: cleanPhone,
        currency: finalCurrency,
        nonce: nonce
    };

    // Signature HMAC conforme MeSomb 1.1
    const credentials = `POST\n${url}\n${timestamp}\n${nonce}`;
    const signature = createHmac('sha256', SECRET_KEY).update(credentials).digest('hex');
    const authHeader = `MeSomb ${ACCESS_KEY}:${signature}:${timestamp}:${nonce}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'X-MeSomb-Application': APPLICATION_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...bodyData,
        extra: {
          userId: params.userId,
          courseId: params.courseId || 'WALLET_TOPUP',
          type: params.type || 'wallet_topup',
          affiliateId: params.affiliateId || undefined,
          couponId: params.couponId || undefined
        }
      }),
    });

    const data = await response.json();

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      return { 
        success: true, 
        transactionId: String(data.pk || data.id || "PENDING"), 
        message: "Demande envoyée. Validez sur votre téléphone." 
      };
    } else {
      console.error("MESOMB_REJECTED:", data);
      return { 
        success: false, 
        transactionId: null,
        error: data.detail || data.message || "Erreur d'autorisation MeSomb." 
      };
    }

  } catch (error: any) {
    console.error("MESOMB_FATAL_ERROR:", error.message);
    return { success: false, transactionId: null, error: "Service indisponible." };
  }
}