'use server';

import { randomBytes } from 'crypto';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Actions serveur sécurisées pour MeSomb.
 * ✅ SÉCURITÉ : Exécuté uniquement côté serveur.
 * ✅ INTÉGRITÉ : Utilise Admin SDK pour l'initiation.
 */

interface MeSombPaymentParams {
  amount: number;
  phoneNumber: string;
  service: 'ORANGE' | 'MTN';
  courseId: string;
  userId: string;
  type?: 'course_purchase' | 'wallet_topup';
}

export async function initiateMeSombPayment(params: MeSombPaymentParams) {
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();
  const APPLICATION_KEY = process.env.MESOMB_APP_KEY?.trim();

  if (!SECRET_KEY || !APPLICATION_KEY) {
    console.error("[MeSomb] Config serveur manquante");
    return { success: false, error: "Erreur de configuration serveur." };
  }

  const db = getAdminDb();
  const internalRef = `TXN-${Date.now()}-${randomBytes(3).toString('hex')}`;
  const cleanPhone = params.phoneNumber.replace(/\D/g, '');

  try {
    // 1. Enregistrement de l'intention de paiement via Admin SDK (Sécurisé)
    await db.collection('payments').doc(internalRef).set({
        id: internalRef,
        userId: params.userId,
        amount: params.amount,
        currency: (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) ? 'XAF' : 'XOF',
        status: 'pending',
        provider: 'mesomb',
        type: params.type || 'wallet_topup',
        courseId: params.courseId,
        createdAt: FieldValue.serverTimestamp()
    });

    // 2. Appel API MeSomb depuis le serveur
    const response = await fetch('https://mesomb.hachther.com/api/v1.1/payment/collect', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'X-MeSomb-Application': APPLICATION_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount,
        service: params.service,
        receiver: cleanPhone,
        currency: (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) ? 'XAF' : 'XOF',
        nonce: randomBytes(16).toString('hex'),
        extra: {
          internalReference: internalRef,
          userId: params.userId
        }
      }),
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
    console.error("[MeSomb Initiation Error]", error);
    return { success: false, error: "Erreur de connexion à la passerelle." };
  }
}
