
'use server';

import { randomUUID, randomBytes } from 'crypto';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * @fileOverview Initiation Hardened des paiements MeSomb.
 * ✅ SÉCURITÉ : UUID v4, Secret Nonce, et Vérification de Vélocité.
 */

interface MeSombPaymentParams {
  amount: number;
  phoneNumber: string;
  service: 'ORANGE' | 'MTN';
  userId: string;
  type?: 'course_purchase' | 'wallet_topup';
  courseId?: string;
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
    
    // Limite à 3 tentatives par 5 minutes
    return recentTxns.data().count < 3;
}

export async function initiateMeSombPayment(params: MeSombPaymentParams) {
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();
  const APPLICATION_KEY = process.env.MESOMB_APP_KEY?.trim();

  if (!SECRET_KEY || !APPLICATION_KEY) {
    console.error("[MeSomb] Configuration manquante.");
    return { success: false, error: "Service indisponible." };
  }

  const db = getAdminDb();
  
  // 1. Protection Anti-Fraude : Vélocité
  const isVelocityOk = await checkUserVelocity(db, params.userId);
  if (!isVelocityOk) {
      return { success: false, error: "Trop de tentatives. Veuillez patienter 5 minutes." };
  }

  // 2. Génération d'identifiants haute entropie
  const internalRef = randomUUID(); // UUID v4 imprédictible
  const secretNonce = randomBytes(32).toString('hex'); // Jeton de session secret
  const cleanPhone = params.phoneNumber.replace(/\D/g, '');

  try {
    // 3. Enregistrement de l'intention avec Secret Nonce
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
            nonce: secretNonce, // Stocké pour vérification au webhook
            ip: 'server_action',
            attempts: 0
        }
    });

    // 4. Appel API avec Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch('https://mesomb.hachther.com/api/v1.1/payment/collect', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'X-MeSomb-Application': APPLICATION_KEY,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        amount: params.amount,
        service: params.service,
        receiver: cleanPhone,
        currency: (cleanPhone.startsWith('237') || cleanPhone.startsWith('236')) ? 'XAF' : 'XOF',
        nonce: randomBytes(16).toString('hex'),
        extra: {
          internalReference: internalRef,
          securityToken: secretNonce // Transmis et retourné par MeSomb
        }
      }),
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      return { 
        success: true, 
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
