'use server';

/**
 * @fileOverview Initiation sécurisée des paiements MeSomb.
 * ✅ PRODUCTION : Utilisation impérative des clés secrètes.
 * ✅ RÉGLAGES : Respect strict de la devise et du verrouillage admin.
 */

import { randomUUID, randomBytes } from 'crypto';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Settings } from '@/lib/types';

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
    
    return recentTxns.data().count < 5; 
}

export async function initiateMeSombPayment(params: MeSombPaymentParams): Promise<MeSombResponse> {
  const IS_DEV = process.env.NODE_ENV === 'development';
  
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY;
  const APPLICATION_KEY = process.env.MESOMB_APP_KEY;

  if (!SECRET_KEY || !APPLICATION_KEY) {
    if (IS_DEV) {
        return { 
            success: true, 
            type: 'SIMULATED', 
            message: "Mode Test : Paiement validé automatiquement (Clés absentes)." 
        };
    }
    return { 
        success: false, 
        error: "Configuration MeSomb manquante sur le serveur." 
    };
  }

  try {
    const db = getAdminDb();
    
    // 🛡️ RÉGLAGES ADMIN : Vérification du verrouillage
    const settingsSnap = await db.collection('settings').doc('global').get();
    const settings = settingsSnap.data() as Settings;

    if (!settings?.payments?.mesombEnabled) {
        return { success: false, error: "Le service de paiement est actuellement désactivé." };
    }

    // ✅ STANDARDISATION : Uniquement la devise des réglages
    const currency = settings?.commercial?.currency || 'XOF';

    // 2. Vérification vélocité
    const isVelocityOk = await checkUserVelocity(db, params.userId);
    if (!isVelocityOk) {
        return { success: false, error: "Trop de tentatives. Veuillez patienter." };
    }

    const internalRef = randomUUID();
    const secretNonce = randomBytes(32).toString('hex');
    
    // 3. Normalisation du numéro (Cameroun standard)
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 9 && (cleanPhone.startsWith('65') || cleanPhone.startsWith('67') || cleanPhone.startsWith('68') || cleanPhone.startsWith('69'))) {
        cleanPhone = '237' + cleanPhone;
    }

    // 4. Enregistrement de l'intention
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
      await db.collection('payments').doc(internalRef).update({
          status: 'failed',
          error: data.detail || "Refus opérateur"
      });
      return { success: false, error: data.detail || "Transaction refusée par l'opérateur." };
    }

  } catch (error: any) {
    console.error("[MeSomb Fatal Error]", error);
    return { success: false, error: "Erreur de connexion avec la passerelle." };
  }
}
