'use server';

import { randomUUID, randomBytes } from 'crypto';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * @fileOverview Initiation sécurisée des paiements MeSomb.
 * ✅ TYPAGE : Union Type pour séparer Simulation et Production.
 * ✅ SÉCURITÉ : Validation de vélocité et clés masquées.
 */

export type MeSombResponse =
  | { success: true; type: 'REAL'; transactionId: string; message: string }
  | { success: true; type: 'SIMULATED'; message: string }
  | { success: false; error: string };

interface MeSombPaymentParams {
  amount: number;
  phoneNumber: string;
  service: 'ORANGE' | 'MTN';
  userId: string;
  type?: 'course_purchase' | 'wallet_topup';
  courseId?: string;
  affiliateId?: string;
  couponId?: string;
}

/**
 * Vérifie si l'utilisateur ne dépasse pas les limites de tentatives (Anti-Fraude).
 */
async function checkUserVelocity(db: FirebaseFirestore.Firestore, userId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentTxns = await db.collection('payments')
        .where('userId', '==', userId)
        .where('createdAt', '>=', Timestamp.fromDate(fiveMinutesAgo))
        .count()
        .get();
    
    return recentTxns.data().count < 5; 
}

export async function initiateMeSombPayment(params: MeSombPaymentParams): Promise<MeSombResponse> {
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();
  const APPLICATION_KEY = process.env.MESOMB_APP_KEY?.trim();
  const IS_DEV = process.env.NODE_ENV === 'development';

  // 🛡️ MODE SIMULATION AUTOMATIQUE
  if (!SECRET_KEY || !APPLICATION_KEY || IS_DEV) {
    console.warn("[MeSomb] Mode Simulation activé (Clés manquantes ou mode DEV).");
    return { 
        success: true, 
        type: 'SIMULATED', 
        message: "Simulation : Paiement validé automatiquement en mode test." 
    };
  }

  // Si on arrive ici, on est en production avec les clés présentes
  const db = getAdminDb();
  
  // 1. Protection Anti-Fraude
  const isVelocityOk = await checkUserVelocity(db, params.userId);
  if (!isVelocityOk) {
      return { success: false, error: "Trop de tentatives. Veuillez patienter 5 minutes." };
  }

  const internalRef = randomUUID();
  const secretNonce = randomBytes(32).toString('hex');
  const cleanPhone = params.phoneNumber.replace(/\D/g, '');

  try {
    // 2. Enregistrement de l'intention
    await db.collection('payments').doc(internalRef).set({
        id: internalRef,
        userId: params.userId,
        amount: Number(params.amount),
        currency: (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) ? 'XAF' : 'XOF',
        status: 'pending',
        provider: 'mesomb',
        type: params.type || 'wallet_topup',
        courseId: params.courseId || 'WALLET_TOPUP',
        createdAt: FieldValue.serverTimestamp(),
        security: {
            nonce: secretNonce,
            attempts: 0
        },
        metadata: {
            affiliateId: params.affiliateId || null,
            couponId: params.couponId || null
        }
    });

    // 3. Appel API avec headers garantis strings
    const headers: HeadersInit = {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'X-MeSomb-Application': APPLICATION_KEY,
        'Content-Type': 'application/json',
    };

    const response = await fetch('https://mesomb.hachther.com/api/v1.1/payment/collect', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: params.amount,
        service: params.service,
        receiver: cleanPhone,
        currency: (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) ? 'XAF' : 'XOF',
        nonce: randomBytes(16).toString('hex'),
        extra: {
          internalReference: internalRef,
          securityToken: secretNonce
        }
      }),
    });

    const data = await response.json();

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      return { 
        success: true, 
        type: 'REAL',
        transactionId: internalRef, 
        message: "Veuillez valider le paiement sur votre mobile." 
      };
    } else {
      await db.collection('payments').doc(internalRef).update({
          status: 'failed',
          error: data.detail || "Refus opérateur"
      });
      return { success: false, error: data.detail || "Transaction refusée." };
    }

  } catch (error: any) {
    console.error("[MeSomb Hardened Error]", error);
    return { success: false, error: "Erreur de connexion sécurisée." };
  }
}
