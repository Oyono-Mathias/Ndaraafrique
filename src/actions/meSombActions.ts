'use server';

import { randomBytes } from 'crypto';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Actions serveur pour MeSomb (Ndara Afrique).
 * ✅ DEBUG : Traces détaillées des requêtes et réponses API.
 * ✅ SIMULATION : Remontée des erreurs réelles du processeur interne.
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

  // 🛠️ LOG DE DIAGNOSTIC INITIAL
  console.log(`[MeSomb API] Démarrage transaction pour l'utilisateur: ${params.userId}`);
  console.log(`[MeSomb API] Paramètres: Service=${params.service}, Montant=${params.amount}`);

  // 🛡️ FALLBACK SIMULATION (Mode Prototype / Développement)
  if (!SECRET_KEY || !APPLICATION_KEY) {
    console.warn(`[MeSomb] ⚠️ CLÉS MANQUANTES : Bascule en mode SIMULATION`);
    
    try {
        const result = await processNdaraPayment({
            transactionId: `SIM-${Math.random().toString(36).substring(7).toUpperCase()}`,
            gatewayTransactionId: "SIMULATED_BY_SYSTEM",
            provider: 'mesomb',
            amount: params.amount,
            currency: 'XAF',
            metadata: {
                userId: params.userId,
                courseId: params.courseId || 'WALLET_TOPUP',
                type: params.type || 'wallet_topup',
                affiliateId: params.affiliateId,
                couponId: params.couponId
            }
        });

        return { 
            success: true, 
            transactionId: "SIMULATED", 
            message: "Mode Test : Opération validée avec succès par le simulateur." 
        };
    } catch (e: any) {
        console.error("[MeSomb Simulation] Échec du processeur interne:", e.message);
        // On renvoie l'erreur réelle (ex: UTILISATEUR_INTROUVABLE) pour le debug frontend
        return { success: false, error: `Erreur Simulateur: ${e.message}` };
    }
  }

  try {
    const url = 'https://mesomb.hachther.com/api/v1.1/payment/collect';
    const nonce = randomBytes(16).toString('hex');
    const cleanPhone = params.phoneNumber.replace(/\D/g, '');
    
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

    // 🚀 LOG DE LA REQUÊTE API
    console.log(`[MeSomb Request] URL: ${url}`);
    console.log(`[MeSomb Request] App-Key: ${APPLICATION_KEY.substring(0, 8)}...`);
    console.log(`[MeSomb Request] Body:`, JSON.stringify(bodyObj));

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

    // 📥 LOG DE LA RÉPONSE API
    console.log(`[MeSomb Response] Status: ${response.status}`);
    console.log(`[MeSomb Response] Data:`, JSON.stringify(data));

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      return { 
        success: true, 
        transactionId: String(data.pk || data.id || "PENDING"), 
        message: "Demande de débit envoyée. Veuillez valider sur votre téléphone." 
      };
    } else {
      const errorDetail = data.detail || data.message || "Refus de la passerelle.";
      console.error(`[MeSomb API Rejet] Cause: ${errorDetail}`);
      return { 
        success: false, 
        transactionId: null,
        error: `Erreur API MeSomb (${response.status}): ${errorDetail}` 
      };
    }

  } catch (error: any) {
    console.error("[MeSomb Fatal Error] Connexion impossible:", error.message);
    return { success: false, transactionId: null, error: "Impossible de joindre le serveur MeSomb. Vérifiez votre connexion." };
  }
}
