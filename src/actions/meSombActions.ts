'use server';

import { createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Actions serveur pour MeSomb (Ndara Afrique V4.1).
 * ✅ FIX : Formatage strict de l'en-tête Authorization (MeSomb 1.1).
 * ✅ HYBRIDE : Support .env + Fallback Firebase Studio.
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
}

export async function initiateMeSombPayment(params: MeSombPaymentParams) {
  try {
    const url = 'https://mesomb.hachther.com/api/v1.1/payment/collect';
    const date = new Date();
    const timestamp = Math.floor(date.getTime() / 1000);
    const nonce = randomBytes(16).toString('hex');
    
    // Nettoyage du numéro
    const cleanPhone = params.phoneNumber.replace(/\D/g, '');

    // Détection devise
    let finalCurrency = 'XOF';
    if (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) {
        finalCurrency = 'XAF';
    }

    // 1. Préparation du Body pour le calcul du Hash (Ordre Alphabétique recommandé)
    const body = {
        amount: params.amount,
        service: params.service,
        receiver: cleanPhone,
        currency: finalCurrency,
        nonce: nonce
    };

    // 2. Génération de la signature HMAC (Format Standard MeSomb)
    // IMPORTANT: Pas d'espaces inutiles dans la chaîne credentials
    const credentials = `POST\n${url}\n${timestamp}\n${nonce}`;
    const signature = createHmac('sha256', SECRET_KEY).update(credentials).digest('hex');

    // 3. Construction de l'en-tête (Vérifie bien les deux-points)
    const authHeader = `MeSomb ${ACCESS_KEY}:${signature}:${timestamp}:${nonce}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'X-MeSomb-Application': APPLICATION_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
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
        message: "Demande envoyée. Validez sur votre téléphone." 
      };
    } else {
      console.error("MESOMB_REJECTED:", data);
      return { 
        success: false, 
        error: data.detail || data.message || "Erreur d'autorisation. Vérifiez vos clés API." 
      };
    }

  } catch (error: any) {
    return { success: false, error: "Le service de paiement est indisponible." };
  }
}