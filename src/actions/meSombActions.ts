'use server';

import { createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Actions serveur pour MeSomb (Ndara Afrique V4).
 * ✅ SÉCURITÉ : Utilise uniquement les variables d'environnement.
 * ✅ FIX DEVISE : Détection automatique XAF/XOF selon le code pays.
 * ✅ ROBUSTESSE : Signature HMAC conforme aux specs MeSomb 1.1.
 */

// On récupère les clés depuis le fichier .env (Plus rien n'est écrit en dur ici)
const APPLICATION_KEY = process.env.MESOMB_APP_KEY?.trim();
const ACCESS_KEY = process.env.MESOMB_ACCESS_KEY?.trim();
const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();

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
    // 1. Vérification des clés API
    if (!APPLICATION_KEY || !ACCESS_KEY || !SECRET_KEY) {
      console.error("ERREUR CRITIQUE : Clés MeSomb manquantes dans .env");
      return { success: false, error: "Configuration serveur incomplète (API Keys)." };
    }

    const url = 'https://mesomb.hachther.com/api/v1.1/payment/collect';
    const date = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString('hex');
    
    // 2. Nettoyage strict du numéro (Retrait du +, des espaces, etc.)
    const cleanPhone = params.phoneNumber.replace(/\D/g, '');

    // 3. FIX DEVISE : Détection dynamique (Cameroun/RCA = XAF, Autres = XOF)
    let finalCurrency = 'XOF';
    if (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) {
        finalCurrency = 'XAF';
    }

    // 4. Génération de la signature HMAC
    const credentials = `POST\n${url}\n${date}\n${nonce}`;
    const signature = createHmac('sha256', SECRET_KEY).update(credentials).digest('hex');

    // 5. Formatage de l'en-tête Authorization
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
        message: "Demande de paiement envoyée. Vérifiez votre téléphone." 
      };
    } else {
      console.error("MESOMB_API_ERROR:", data);
      // Message d'erreur plus utile pour l'étudiant
      const errorMsg = data.detail || data.message || "La transaction a été refusée. Vérifiez votre solde mobile ou incluez le code pays (ex: 237...).";
      return { success: false, error: errorMsg };
    }

  } catch (error: any) {
    console.error("INITIATE_PAYMENT_FATAL:", error.message);
    return { 
        success: false, 
        error: "Le service de paiement est momentanément indisponible." 
    };
  }
}