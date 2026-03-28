'use server';

import { randomBytes } from 'crypto';

/**
 * @fileOverview Actions serveur pour MeSomb (Ndara Afrique).
 * ✅ FIX : Format Authorization standardisé (Bearer TOKEN).
 * ✅ SÉCURITÉ : Clés provenant exclusivement de process.env.
 */

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
  // Récupération sécurisée des clés
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();
  const APPLICATION_KEY = process.env.MESOMB_APP_KEY?.trim();

  // Vérification de la présence des clés
  if (!SECRET_KEY || !APPLICATION_KEY) {
    console.error("ERREUR : Clés MeSomb manquantes dans l'environnement.");
    return { 
      success: false, 
      transactionId: null, 
      error: "Le service de paiement n'est pas configuré. Veuillez contacter l'administrateur." 
    };
  }

  try {
    const url = 'https://mesomb.hachther.com/api/v1.1/payment/collect';
    const nonce = randomBytes(16).toString('hex');
    
    const cleanPhone = params.phoneNumber.replace(/\D/g, '');
    let finalCurrency = (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) ? 'XAF' : 'XOF';

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

    // Application du format Bearer comme demandé
    const authHeader = `Bearer ${SECRET_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'X-MeSomb-Application': APPLICATION_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyObj),
    });

    const data = await response.json();

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      return { 
        success: true, 
        transactionId: String(data.pk || data.id || "PENDING"), 
        message: "Demande envoyée. Validez sur votre téléphone." 
      };
    } else {
      console.error("MeSomb API Error:", data);
      return { 
        success: false, 
        transactionId: null,
        error: data.detail || data.message || "L'en-tête d'autorisation a été rejeté par la passerelle." 
      };
    }

  } catch (error: any) {
    console.error("FATAL MeSomb Action Error:", error.message);
    return { success: false, transactionId: null, error: "Connexion au service de paiement impossible." };
  }
}
