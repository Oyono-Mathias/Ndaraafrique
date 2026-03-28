'use server';

import { randomBytes } from 'crypto';

/**
 * @fileOverview Actions serveur pour MeSomb (Ndara Afrique).
 * ✅ SÉCURITÉ : Validation exhaustive des préfixes Cameroun (Orange & MTN).
 * ✅ INTÉGRITÉ : Mapping dynamique des devises XAF/XOF.
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

  // 1. Nettoyage du numéro
  const cleanPhone = params.phoneNumber.replace(/\D/g, '');
  
  // 🛡️ VALIDATION STRICTE DES PRÉFIXES (CAMEROUN)
  if (params.service === 'MTN') {
      // MTN Cameroun : 650-654, 67x, 680-683
      if (!cleanPhone.match(/^(237)?6(5[0-4]|7\d|8[0-3])/)) {
          return { 
            success: false, 
            error: "Numéro invalide pour MTN (préfixes valides: 650-654, 67x, 680-683)." 
          };
      }
  } else if (params.service === 'ORANGE') {
      // Orange Cameroun : 69x, 655-659, 686-689, 640
      if (!cleanPhone.match(/^(237)?6(9\d|5[5-9]|8[6-9]|40)/)) {
          return { 
            success: false, 
            error: "Numéro invalide pour Orange (préfixes valides: 69x, 655-659, 686-689, 640)." 
          };
      }
  }

  if (!SECRET_KEY || !APPLICATION_KEY) {
    console.error(`[MeSomb] ❌ CONFIG_MISSING : Clés API introuvables.`);
    return { 
        success: false, 
        error: "Le service de paiement Mobile Money n'est pas encore configuré sur ce serveur." 
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

    console.log(`[MeSomb] Requête : ${params.service} | ${cleanPhone} | ${params.amount} ${finalCurrency}`);

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
        message: "Demande envoyée. Saisissez votre code PIN sur votre téléphone." 
      };
    } else {
      const errorDetail = data.detail || data.message || "La passerelle a refusé la transaction.";
      console.error(`[MeSomb API Rejet] : ${errorDetail}`);
      return { success: false, error: `Échec : ${errorDetail}` };
    }

  } catch (error: any) {
    console.error("[MeSomb Fatal]", error.message);
    return { success: false, error: "Impossible de joindre la passerelle de paiement." };
  }
}
