'use server';

/**
 * @fileOverview Initiation sécurisée des paiements MeSomb.
 * ✅ SÉCURITÉ : Authentification Basic Auth (Base64) stricte.
 * ✅ FORMAT : applicationKey:accessKey:secretKey.
 */

import { randomUUID, randomBytes } from 'crypto';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NdaraUser } from '@/lib/types';

export type MeSombResponse =
  | { success: true; type: 'REAL'; transactionId: string; message: string }
  | { success: true; type: 'SIMULATED'; message: string }
  | { success: false; error: string };

interface MeSombPaymentParams {
  amount: number;
  phoneNumber: string;
  service: 'ORANGE' | 'MTN' | 'WAVE';
  userId: string;
  type?: 'course_purchase' | 'wallet_topup';
  courseId?: string;
}

export async function initiateMeSombPayment(params: MeSombPaymentParams): Promise<MeSombResponse> {
  const APPLICATION_KEY = process.env.MESOMB_APPLICATION_KEY?.trim();
  const ACCESS_KEY = process.env.MESOMB_ACCESS_KEY?.trim();
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();

  try {
    const db = getAdminDb();
    
    // 1. Charger les réglages et l'utilisateur
    const [settingsSnap, userSnap] = await Promise.all([
        db.collection('settings').doc('global').get(),
        db.collection('users').doc(params.userId).get()
    ]);

    const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as any;
    const userData = userSnap.data() as NdaraUser;

    if (!userData) return { success: false, error: "Utilisateur introuvable." };

    // 2. Mode Simulation (Test)
    if (settings?.payments?.paymentMode === 'test') {
        console.log(`[MeSomb Simulation] User: ${params.userId} | Amount: ${params.amount}`);
        return { 
            success: true, 
            type: 'SIMULATED', 
            message: "Simulation : Votre paiement a été validé par le système de test." 
        };
    }

    // 3. Validation Configuration
    if (!APPLICATION_KEY || !ACCESS_KEY || !SECRET_KEY) {
        console.error("[MeSomb] CRITICAL: Missing API Keys in environment variables.");
        return { success: false, error: "Le service de paiement est indisponible (Erreur Config Serveur)." };
    }

    if (params.amount < 100) {
        return { success: false, error: "Le montant minimum est de 100 XOF." };
    }

    // --- CONSTRUCTION DU HEADER AUTHORIZATION (Basic Auth) ---
    const credentials = `${APPLICATION_KEY}:${ACCESS_KEY}:${SECRET_KEY}`;
    const encoded = Buffer.from(credentials).toString('base64');

    const headers: HeadersInit = {
        'Authorization': `Basic ${encoded}`,
        'Content-Type': 'application/json',
    };

    // 4. Préparation Transaction Firestore (Statut: pending)
    const internalRef = randomUUID();
    const secretNonce = randomBytes(32).toString('hex');
    const currency = settings?.payments?.currency || 'XOF';
    
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    // Standardisation Cameroun (237)
    if (cleanPhone.length === 9 && cleanPhone.startsWith('6')) {
        cleanPhone = '237' + cleanPhone;
    }

    const transactionData = {
        id: internalRef,
        userId: params.userId,
        amount: Number(params.amount),
        currency,
        status: 'pending',
        provider: 'mesomb',
        type: params.type || 'course_purchase',
        courseId: params.courseId || 'WALLET_TOPUP',
        courseTitle: params.type === 'wallet_topup' ? 'Recharge Portefeuille' : 'Achat formation',
        createdAt: FieldValue.serverTimestamp(),
        security: { nonce: secretNonce },
        metadata: { source: 'web_app', env: settings?.payments?.paymentMode }
    };

    await db.collection('payments').doc(internalRef).set(transactionData);

    const payload = {
        amount: params.amount,
        service: params.service,
        receiver: cleanPhone,
        currency,
        nonce: randomBytes(16).toString('hex'),
        extra: { internalReference: internalRef, securityToken: secretNonce }
    };

    console.log(`[MeSomb Request] Sending collect request for ${internalRef}`);

    // 5. Appel API MeSomb
    const response = await fetch('https://mesomb.hachther.com/api/v1.1/payment/collect', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      console.log(`[MeSomb Success] Transaction ${internalRef} initiated.`);
      return { 
        success: true, 
        type: 'REAL', 
        transactionId: internalRef, 
        message: "Veuillez valider l'opération sur votre téléphone." 
      };
    } else {
      const errorMsg = data.detail || data.message || "Transaction refusée par l'opérateur.";
      console.error("[MeSomb API Error]", data);
      await db.collection('payments').doc(internalRef).update({ 
          status: 'failed', 
          error: errorMsg,
          updatedAt: FieldValue.serverTimestamp()
      });
      return { success: false, error: errorMsg };
    }
  } catch (error: any) {
    console.error("[MeSomb Fatal Error]:", error.message);
    return { success: false, error: "Connexion impossible avec la passerelle de paiement." };
  }
}