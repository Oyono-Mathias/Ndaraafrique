'use server';

import { processNdaraPayment } from '@/services/paymentProcessor';
import { createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Actions serveur pour MeSomb avec signature HMAC-SHA256.
 * Inclut un mode simulation pour le prototypage.
 * ✅ SÉCURISÉ : Gestion des erreurs fatales pour éviter le crash des Server Components.
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
  type?: 'course_purchase' | 'wallet_topup';
}

export async function initiateMeSombPayment(params: MeSombPaymentParams) {
  try {
    const applicationKey = process.env.MESOMB_APP_KEY;
    const accessKey = process.env.MESOMB_ACCESS_KEY;
    const secretKey = process.env.MESOMB_SECRET_KEY;

    // --- MODE SIMULATION (POUR DÉMO NDARA) ---
    if (!applicationKey || applicationKey.includes('YOUR_') || !accessKey || !secretKey) {
      console.warn("MESOMB_SIMULATION: Clés absentes. Passage en mode démo.");
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      const simId = `DEMO-MOMO-${Date.now()}`;

      // On appelle le processeur directement pour simuler le webhook
      // On enveloppe dans un try/catch interne car processNdaraPayment utilise Firebase Admin
      try {
          await processNdaraPayment({
              transactionId: simId,
              gatewayTransactionId: "SIMULATED_GATEWAY_ID",
              provider: 'mesomb',
              amount: params.amount,
              currency: 'XOF',
              metadata: {
                  userId: params.userId,
                  courseId: params.courseId,
                  affiliateId: params.affiliateId,
                  couponId: params.couponId,
                  type: params.type || 'course_purchase'
              }
          });
      } catch (adminError: any) {
          console.error("ADMIN_SDK_ERROR during simulation:", adminError.message);
          return { 
              success: false, 
              error: "Configuration serveur incomplète : La clé FIREBASE_SERVICE_ACCOUNT_KEY est manquante dans les réglages Vercel." 
          };
      }

      return { 
          success: true, 
          transactionId: "SIMULATED", 
          message: "Simulation réussie ! Votre solde est mis à jour." 
      };
    }

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
          type: params.type || 'course_purchase'
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
      return { success: false, error: data.detail || "Erreur de la passerelle MeSomb." };
    }

  } catch (error: any) {
    console.error("INITIATE_PAYMENT_FATAL:", error.message);
    return { 
        success: false, 
        error: "Le service de paiement est indisponible. Détails : " + error.message 
    };
  }
}
