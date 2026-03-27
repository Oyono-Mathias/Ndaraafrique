'use server';

import { createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Actions serveur pour MeSomb (Ndara Afrique V4).
 * ✅ HYBRIDE : Utilise .env avec fallback automatique pour Firebase Studio.
 * ✅ FIX DEVISE : Détection automatique XAF/XOF.
 */

// On récupère les clés : Priorité au .env, sinon on utilise tes clés de prod directement
const APPLICATION_KEY = (process.env.MESOMB_APP_KEY || "9f9efc20ca14004f962c7d129ca724c6543ee051").trim();
const ACCESS_KEY = (process.env.MESOMB_ACCESS_KEY || "3ef066c6-dd64-4232-a148-c119e46f3224").trim();
const SECRET_KEY = (process.env.MESOMB_SECRET_KEY || "1bf24b1d-7cae-466e-9765-7c7c5b84903e").trim();

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
    // 1. Double vérification de sécurité
    if (!APPLICATION_KEY || APPLICATION_KEY.length < 10) {
      return { success: false, error: "Configuration API MeSomb introuvable." };
    }

    const url = 'https://mesomb.hachther.com/api/v1.1/payment/collect';
    const date = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString('hex');
    
    // 2. Nettoyage du numéro
    const cleanPhone = params.phoneNumber.replace(/\D/g, '');

    // 3. FIX DEVISE AUTOMATIQUE (Cameroun/RCA = XAF, reste = XOF)
    let finalCurrency = 'XOF';
    if (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) {
        finalCurrency = 'XAF';
    }

    // 4. Signature HMAC
    const credentials = `POST\n${url}\n${date}\n${nonce}`;
    const signature = createHmac('sha256', SECRET_KEY).update(credentials).digest('hex');
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
        receiver: cleanPhone,
        currency: finalCurrency,
        nonce: `NDARA-${Date.now()}`,
        extra: {
          userId: params.userId,
          courseId: params.courseId || 'WALLET_TOPUP',
          type: params.type || 'wallet_topup'
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
      console.error("MESOMB_ERROR_LOG:", data);
      return { 
        success: false, 
        error: data.detail || data.message || "La transaction a échoué. Vérifiez votre solde mobile." 
      };
    }

  } catch (error: any) {
    return { success: false, error: "Le service de paiement est indisponible." };
  }
}