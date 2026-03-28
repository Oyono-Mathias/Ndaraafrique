
'use client';

import { randomBytes } from 'crypto';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Actions serveur pour MeSomb (Ndara Afrique).
 * ✅ SÉCURITÉ : Pré-enregistrement de la transaction pour validation croisée.
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

  // 1. Nettoyage et validation
  const cleanPhone = params.phoneNumber.replace(/\D/g, '');
  
  if (!SECRET_KEY || !APPLICATION_KEY) {
    console.error(`[MeSomb] ❌ CONFIG_MISSING`);
    return { success: false, error: "Configuration serveur incomplète." };
  }

  const db = getFirestore();
  const internalRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    // 🛡️ SÉCURITÉ FINTECH : On enregistre l'intention de paiement AVANT l'appel API
    // Cela permet de vérifier le montant lors du retour du Webhook.
    await setDoc(doc(db, 'payments', internalRef), {
        id: internalRef,
        userId: params.userId,
        amount: params.amount,
        currency: (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) ? 'XAF' : 'XOF',
        status: 'pending',
        provider: 'mesomb',
        type: params.type || 'wallet_topup',
        courseId: params.courseId,
        createdAt: serverTimestamp()
    });

    const url = 'https://mesomb.hachther.com/api/v1.1/payment/collect';
    const nonce = randomBytes(16).toString('hex');
    
    let finalCurrency = (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) ? 'XAF' : 'XOF';

    const bodyObj = {
        amount: params.amount,
        service: params.service,
        receiver: cleanPhone,
        currency: finalCurrency,
        nonce: nonce,
        extra: {
          internalReference: internalRef, // On passe notre ID interne
          userId: params.userId,
          courseId: params.courseId || 'WALLET_TOPUP',
          type: params.type || 'wallet_topup'
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
        transactionId: internalRef, 
        message: "Demande envoyée. Validez sur votre téléphone." 
      };
    } else {
      return { success: false, error: data.detail || "Refus de la passerelle." };
    }

  } catch (error: any) {
    return { success: false, error: "Erreur de connexion à la passerelle." };
  }
}