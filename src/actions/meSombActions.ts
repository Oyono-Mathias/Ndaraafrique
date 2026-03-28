'use server';

import { randomBytes } from 'crypto';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Actions serveur pour MeSomb (Ndara Afrique).
 * ✅ DEBUG : Mode simulation automatique si les clés API sont absentes.
 * ✅ LOGGING : Traces détaillées pour le diagnostic backend.
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
  // Récupération et nettoyage des clés
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();
  const APPLICATION_KEY = process.env.MESOMB_APP_KEY?.trim();

  // 🛠️ LOG DE DIAGNOSTIC (Côté Serveur uniquement)
  console.log(`[MeSomb Debug] Init: ${params.service} | Amount: ${params.amount} | User: ${params.userId}`);
  if (!SECRET_KEY) console.warn("[MeSomb Debug] MESOMB_SECRET_KEY est manquant.");
  if (!APPLICATION_KEY) console.warn("[MeSomb Debug] MESOMB_APP_KEY est manquant.");

  // 🛡️ FALLBACK SIMULATION (Mode Prototype / Développement)
  if (!SECRET_KEY || !APPLICATION_KEY) {
    console.warn(`[MeSomb] ⚠️ MODE SIMULATION ACTIVÉ pour l'utilisateur ${params.userId}`);
    
    // Pour que l'expérience utilisateur soit complète, on déclenche le traitement interne
    // Cela simule le retour positif du Webhook GSM
    try {
        await processNdaraPayment({
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
            message: "Mode Test : Votre opération a été validée avec succès (Simulation)." 
        };
    } catch (e: any) {
        console.error("[MeSomb Simulation] Échec du processeur interne:", e.message);
        return { success: false, error: "Erreur lors de la simulation du paiement." };
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
        message: "Demande envoyée. Validez sur votre téléphone." 
      };
    } else {
      console.error("[MeSomb API Error]", JSON.stringify(data));
      return { 
        success: false, 
        transactionId: null,
        error: data.detail || data.message || "La passerelle de paiement a rejeté la demande." 
      };
    }

  } catch (error: any) {
    console.error("[MeSomb Fatal Error]", error.message);
    return { success: false, transactionId: null, error: "Impossible de joindre le service de paiement." };
  }
}
