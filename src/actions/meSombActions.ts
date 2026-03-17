'use server';

import { processNdaraPayment } from '@/services/paymentProcessor';
import { createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Actions serveur pour l'intégration de MeSomb via l'API REST.
 * ✅ RÉSOLU : Ajout de la génération de signature HMAC-SHA256 pour corriger "No signature provided".
 */

/**
 * Génère la signature de sécurité exigée par MeSomb v1.1
 */
function generateMeSombSignature(method: string, url: string, date: number, nonce: string, secretKey: string): string {
    const credentials = `${method}\n${url}\n${date}\n${nonce}`;
    return createHmac('sha256', secretKey).update(credentials).digest('hex');
}

interface MeSombPaymentParams {
  amount: number;
  phoneNumber: string;
  service: 'ORANGE' | 'MTN';
  courseId: string;
  userId: string;
  affiliateId?: string;
  couponId?: string;
}

export async function initiateMeSombPayment(params: MeSombPaymentParams) {
  const applicationKey = process.env.MESOMB_APP_KEY;
  const accessKey = process.env.MESOMB_ACCESS_KEY;
  const secretKey = process.env.MESOMB_SECRET_KEY;

  // --- MODE SIMULATION (POUR DÉMO NDARA) ---
  if (!applicationKey || applicationKey.includes('YOUR_') || !accessKey || !secretKey) {
    console.warn("MESOMB_SIMULATION_MODE: Clés manquantes. Simulation du paiement en cours...");
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    await processNdaraPayment({
        transactionId: `SIM-MOMO-${Date.now()}`,
        provider: 'mesomb',
        amount: params.amount,
        currency: 'XOF',
        metadata: {
            userId: params.userId,
            courseId: params.courseId,
            affiliateId: params.affiliateId,
            couponId: params.couponId,
            type: 'course_purchase'
        }
    });

    return { 
        success: true, 
        transactionId: "SIMULATED", 
        message: "Simulation réussie ! (Aucune clé MeSomb détectée)" 
    };
  }

  try {
    const url = 'https://mesomb.hachther.com/api/v1.1/payment/collect/';
    const date = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(16).toString('hex');
    const signature = generateMeSombSignature('POST', url, date, nonce, secretKey);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-MeSomb-Application': applicationKey,
        'X-MeSomb-AccessKey': accessKey,
        'X-MeSomb-Signature': signature,
        'X-MeSomb-Nonce': nonce,
        'X-MeSomb-Timestamp': date.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount,
        service: params.service,
        receiver: params.phoneNumber,
        currency: 'XOF',
        nonce: `NDARA-${Date.now()}`,
        extra: {
          userId: params.userId,
          courseId: params.courseId,
          affiliateId: params.affiliateId || '',
          couponId: params.couponId || '',
          type: 'course_purchase'
        }
      }),
    });

    const data = await response.json();

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      return { 
        success: true, 
        transactionId: data.pk || data.id,
        message: "Demande de paiement envoyée. Veuillez valider sur votre téléphone." 
      };
    } else {
      const errorDetail = data.detail || data.message || "Erreur de communication MeSomb.";
      return { success: false, error: errorDetail };
    }

  } catch (error: any) {
    console.error("MESOMB_API_ERROR:", error.message);
    return { success: false, error: "Impossible de contacter la passerelle MeSomb." };
  }
}
