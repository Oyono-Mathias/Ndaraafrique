'use server';

import { randomBytes } from 'crypto';

/**
 * @fileOverview Actions serveur pour MeSomb (Ndara Afrique).
 * ✅ SÉCURITÉ : Validation stricte des préfixes MTN (67, 68) et Orange (69).
 * ✅ INTÉGRITÉ : Suppression de la simulation de succès interne.
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
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();
  const APPLICATION_KEY = process.env.MESOMB_APP_KEY?.trim();

  // 1. Nettoyage et Validation du numéro
  const cleanPhone = params.phoneNumber.replace(/\D/g, '');
  
  // Validation des préfixes selon l'opérateur (Standards Cameroun)
  if (params.service === 'MTN') {
      // Un numéro MTN valide doit commencer par 67 ou 68 (après le code pays éventuel)
      if (!cleanPhone.match(/^(237)?6(7|8)/)) {
          return { success: false, error: "Le numéro ne correspond pas à l'opérateur MTN (doit commencer par 67 ou 68)." };
      }
  } else if (params.service === 'ORANGE') {
      // Un numéro Orange valide doit commencer par 69
      if (!cleanPhone.match(/^(237)?69/)) {
          return { success: false, error: "Le numéro ne correspond pas à l'opérateur Orange (doit commencer par 69)." };
      }
  }

  // 🛡️ VÉRIFICATION CONFIGURATION (Pas de simulation ici)
  if (!SECRET_KEY || !APPLICATION_KEY) {
    console.error(`[MeSomb] ❌ CLÉS MANQUANTES : La passerelle n'est pas configurée sur le serveur.`);
    return { 
        success: false, 
        error: "Le service de paiement Mobile Money n'est pas encore configuré par l'administrateur." 
    };
  }

  try {
    const url = 'https://mesomb.hachther.com/api/v1.1/payment/collect';
    const nonce = randomBytes(16).toString('hex');
    
    // Mapping Géo : Cameroun (237) et Centrafrique (236) utilisent XAF. Le reste XOF.
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

    console.log(`[MeSomb Request] Initiation de débit pour ${cleanPhone} | Montant: ${params.amount}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SECRET_KEY}`,
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
        message: "Demande de paiement envoyée. Veuillez valider avec votre code PIN sur votre téléphone." 
      };
    } else {
      const errorDetail = data.detail || data.message || "Refus de la passerelle.";
      console.error(`[MeSomb API Rejet] Cause: ${errorDetail}`);
      return { 
        success: false, 
        error: `Échec : ${errorDetail}` 
      };
    }

  } catch (error: any) {
    console.error("[MeSomb Fatal Error]", error.message);
    return { success: false, error: "Connexion aux services Mobile Money impossible. Réessayez plus tard." };
  }
}
