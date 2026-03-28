'use server';

import { createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Actions serveur pour MeSomb (Ndara Afrique V4.5).
 * ✅ FIX : Format de l'en-tête Authorization STRICT (AccessKey:Signature:Nonce:Timestamp).
 * ✅ FIX : Signature incluant le corps de la requête (Body) pour les requêtes POST.
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
  affiliateId?: string;
  couponId?: string;
}

export async function initiateMeSombPayment(params: MeSombPaymentParams) {
  try {
    const url = 'https://mesomb.hachther.com/api/v1.1/payment/collect';
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(16).toString('hex');
    
    const cleanPhone = params.phoneNumber.replace(/\D/g, '');
    let finalCurrency = (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) ? 'XAF' : 'XOF';

    // 1. Préparation du corps de la requête (Body)
    const bodyObj = {
        amount: params.amount,
        service: params.service,
        receiver: cleanPhone,
        currency: finalCurrency,
        nonce: nonce,
        extra: {
          userId: params.userId,
          courseId: params.courseId || 'WALLET_TOPUP',
          type: params.type || 'wallet_topup',
          affiliateId: params.affiliateId || "",
          couponId: params.couponId || ""
        }
    };
    const bodyStr = JSON.stringify(bodyObj);

    // 2. Création de la signature HMAC (Format STRICT MeSomb v1.1)
    // Signature = HMAC_SHA256(secret_key, method + "\n" + url + "\n" + timestamp + "\n" + nonce + "\n" + body)
    const method = "POST";
    const credentials = `${method}\n${url}\n${timestamp}\n${nonce}\n${bodyStr}`;
    
    const signature = createHmac('sha256', SECRET_KEY)
      .update(credentials)
      .digest('hex');

    // 3. Construction de l'en-tête Authorization
    // Format CORRECT : MeSomb <AccessKey>:<Signature>:<Nonce>:<Timestamp>
    const authHeader = `MeSomb ${ACCESS_KEY}:${signature}:${nonce}:${timestamp}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'X-MeSomb-Application': APPLICATION_KEY,
        'Content-Type': 'application/json',
      },
      body: bodyStr,
    });

    const data = await response.json();

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      return { 
        success: true, 
        transactionId: String(data.pk || data.id || "PENDING"), 
        message: "Demande envoyée. Validez sur votre téléphone." 
      };
    } else {
      console.error("DEBUG MeSomb Error Response:", data);
      return { 
        success: false, 
        transactionId: null,
        error: data.detail || data.message || "Erreur de validation des identifiants (Header Format)." 
      };
    }

  } catch (error: any) {
    console.error("FATAL MeSomb Action Error:", error.message);
    return { success: false, transactionId: null, error: "Connexion au service de paiement impossible." };
  }
}
