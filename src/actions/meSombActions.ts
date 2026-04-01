'use server';

/**
 * @fileOverview Initiation sécurisée des paiements MeSomb.
 * ✅ PRODUCTION : Utilisation impérative des clés secrètes.
 * ✅ GÉO : Détection automatique des préfixes (Cameroun/Centrafrique).
 */

import { randomUUID, randomBytes } from 'crypto';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getRequiredEnv } from '@/lib/env';

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

/** 🛡️ Limite le spam de requêtes de paiement */
async function checkUserVelocity(db: FirebaseFirestore.Firestore, userId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentTxns = await db.collection('payments')
        .where('userId', '==', userId)
        .where('createdAt', '>=', Timestamp.fromDate(fiveMinutesAgo))
        .count()
        .get();
    
    return recentTxns.data().count < 3; 
}

export async function initiateMeSombPayment(params: MeSombPaymentParams): Promise<MeSombResponse> {
  const IS_DEV = process.env.NODE_ENV === 'development';
  
  // 1. Récupération sécurisée des clés (Fail early si manquant)
  let SECRET_KEY: string;
  let APPLICATION_KEY: string;

  try {
    SECRET_KEY = getRequiredEnv('MESOMB_SECRET_KEY');
    APPLICATION_KEY = getRequiredEnv('MESOMB_APP_KEY');
  } catch (e) {
    if (IS_DEV) {
        console.warn("[MeSomb] Mode Simulation activé en local.");
        return { 
            success: true, 
            type: 'SIMULATED', 
            message: "Mode Test : Paiement validé automatiquement (Clés absentes)." 
        };
    }
    throw e; // En prod, on ne simule pas si les clés manquent
  }

  const db = getAdminDb();
  
  // 2. Vérification vélocité
  const isVelocityOk = await checkUserVelocity(db, params.userId);
  if (!isVelocityOk) {
      return { success: false, error: "Trop de tentatives. Veuillez patienter 5 minutes." };
  }

  const internalRef = randomUUID();
  const secretNonce = randomBytes(32).toString('hex');
  
  // 3. Normalisation du numéro et devise
  let cleanPhone = params.phoneNumber.replace(/\D/g, '');
  
  // Si numéro à 9 chiffres commençant par 6 (Cameroun standard), on ajoute 237
  if (cleanPhone.length === 9 && cleanPhone.startsWith('6')) {
      cleanPhone = '237' + cleanPhone;
  }

  const currency = (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) ? 'XAF' : 'XOF';

  try {
    // 4. Enregistrement de l'intention (Admin SDK)
    await db.collection('payments').doc(internalRef).set({
        id: internalRef,
        userId: params.userId,
        amount: Number(params.amount),
        currency,
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

    // 5. Appel API MeSomb
    const headers: HeadersInit = {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'X-MeSomb-Application': APPLICATION_KEY,
        'Content-Type': 'application/json',
    };

    console.log(`[MeSomb] Collecte initiée pour ${cleanPhone} (${currency})`);
    
    const response = await fetch('https://mesomb.hachther.com/api/v1.1/payment/collect', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: params.amount,
        service: params.service,
        receiver: cleanPhone,
        currency,
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
      console.error(`[MeSomb] Erreur collecte:`, data.detail || data);
      await db.collection('payments').doc(internalRef).update({
          status: 'failed',
          error: data.detail || "Refus opérateur"
      });
      return { success: false, error: data.detail || "Transaction refusée par l'opérateur." };
    }

  } catch (error: any) {
    console.error("[MeSomb Hardened Error]", error);
    return { success: false, error: "Erreur de connexion sécurisée avec la passerelle." };
  }
}
