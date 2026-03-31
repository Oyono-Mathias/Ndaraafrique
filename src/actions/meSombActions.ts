'use server';

import { randomBytes } from 'crypto';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Initiation sécurisée des paiements MeSomb (Server Action).
 * ✅ SÉCURITÉ : Les clés API ne quittent jamais le serveur.
 * ✅ INTÉGRITÉ : Création d'une référence interne AVANT l'appel opérateur.
 */

interface MeSombPaymentParams {
  amount: number;
  phoneNumber: string;
  service: 'ORANGE' | 'MTN';
  userId: string;
  type?: 'course_purchase' | 'wallet_topup';
  courseId?: string;
}

export async function initiateMeSombPayment(params: MeSombPaymentParams) {
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();
  const APPLICATION_KEY = process.env.MESOMB_APP_KEY?.trim();

  // 🛡️ Vérification des secrets côté serveur uniquement
  if (!SECRET_KEY || !APPLICATION_KEY) {
    console.error("[MeSomb] Erreur de configuration : Clés manquantes sur le serveur.");
    return { success: false, error: "Le service de paiement n'est pas disponible." };
  }

  const db = getAdminDb();
  
  // 💎 Génération d'une référence interne unique (Idempotence)
  const internalRef = `TXN-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  const cleanPhone = params.phoneNumber.replace(/\D/g, '');

  try {
    // 1. Enregistrement de l'intention de paiement en statut 'pending'
    // On utilise l'Admin SDK pour contourner les limitations des règles de sécurité client
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
        metadata: {
            service: params.service,
            phoneNumber: cleanPhone,
            isVerified: false
        }
    });

    // 2. Appel à l'API MeSomb depuis le serveur
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
          internalReference: internalRef, // Transmis pour le Webhook
          userId: params.userId
        }
      }),
    });

    const data = await response.json();

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      return { 
        success: true, 
        transactionId: internalRef, 
        message: "Demande envoyée. Veuillez valider sur votre téléphone." 
      };
    } else {
      // Log de l'échec pour l'audit
      await db.collection('payments').doc(internalRef).update({
          status: 'failed',
          error: data.detail || "Refus opérateur"
      });
      return { success: false, error: data.detail || "La transaction a été refusée par l'opérateur." };
    }

  } catch (error: any) {
    console.error("[MeSomb Initiation Fatal Error]", error);
    return { success: false, error: "Erreur de connexion avec la passerelle de paiement." };
  }
}
