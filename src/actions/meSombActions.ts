'use server';

/**
 * @fileOverview Initiation sécurisée des paiements MeSomb.
 * ✅ AUDIT : Validation des clés API et logs de diagnostic.
 * ✅ FORMAT : Correction du header Authorization (Basic Base64).
 * ✅ GÉO : Optimisation pour le Cameroun (+237 / XAF).
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
  const APP_KEY = process.env.MESOMB_APPLICATION_KEY?.trim();
  const ACCESS_KEY = process.env.MESOMB_ACCESS_KEY?.trim();
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();

  // 📡 LOGS DE DIAGNOSTIC (Visible uniquement dans les logs serveur)
  console.log("[MeSomb Audit] Checking API Keys...", {
    hasAppKey: !!APP_KEY,
    hasAccessKey: !!ACCESS_KEY,
    hasSecretKey: !!SECRET_KEY,
    env: process.env.NODE_ENV
  });

  try {
    const db = getAdminDb();
    
    // 1. Charger les réglages
    const [settingsSnap, userSnap] = await Promise.all([
        db.collection('settings').doc('global').get(),
        db.collection('users').doc(params.userId).get()
    ]);

    const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as any;
    const userData = userSnap.data() as NdaraUser;

    if (!userData) return { success: false, error: "Utilisateur introuvable." };

    // 2. Mode Simulation (Déterminé par les réglages Admin)
    if (settings?.payments?.paymentMode === 'test') {
        console.log(`[MeSomb Simulation] User: ${params.userId} | Amount: ${params.amount}`);
        return { 
            success: true, 
            type: 'SIMULATED', 
            message: "Mode TEST : Votre paiement a été validé sans débit réel." 
        };
    }

    // 3. Validation Configuration Critique
    if (!APP_KEY || !ACCESS_KEY || !SECRET_KEY) {
        console.error("[MeSomb] CRITICAL: API Keys missing in Vercel environment.");
        return { success: false, error: "Le service de paiement est indisponible (Erreur Config Serveur)." };
    }

    // 4. Préparation du numéro (Standard Cameroun +237)
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 9 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('2'))) {
        cleanPhone = '237' + cleanPhone;
    }

    // 5. Paramètres Financiers
    const internalRef = randomUUID();
    const secretNonce = randomBytes(32).toString('hex');
    // Pour le Cameroun, on privilégie XAF si MeSomb est utilisé
    const currency = 'XAF'; 

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
        metadata: { 
            source: 'ndara_afrique_v2', 
            operator: params.service,
            phone: cleanPhone
        }
    };

    // Enregistrement de l'intention de paiement
    await db.collection('payments').doc(internalRef).set(transactionData);

    // 6. Construction de l'appel API MeSomb
    const credentials = `${APP_KEY}:${ACCESS_KEY}:${SECRET_KEY}`;
    const encodedAuth = Buffer.from(credentials).toString('base64');

    const payload = {
        amount: params.amount,
        service: params.service, // MTN, ORANGE, WAVE
        receiver: cleanPhone,
        currency: currency,
        nonce: randomBytes(16).toString('hex'),
        extra: { 
            internalReference: internalRef, 
            securityToken: secretNonce 
        }
    };

    console.log(`[MeSomb Request] Dispatching collect for ${internalRef} to ${cleanPhone}`);

    const response = await fetch('https://mesomb.hachther.com/api/v1.1/payment/collect', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && (data.status === 'SUCCESS' || data.status === 'PENDING')) {
      return { 
        success: true, 
        type: 'REAL', 
        transactionId: internalRef, 
        message: "Veuillez valider l'opération sur votre téléphone via le prompt USSD." 
      };
    } else {
      const errorMsg = data.detail || data.message || "La transaction a été refusée par l'opérateur.";
      console.error("[MeSomb API Error]", data);
      
      // Mise à jour de l'échec pour l'historique
      await db.collection('payments').doc(internalRef).update({ 
          status: 'failed', 
          error: errorMsg,
          updatedAt: FieldValue.serverTimestamp()
      });
      
      return { success: false, error: errorMsg };
    }
  } catch (error: any) {
    console.error("[MeSomb Fatal Error]:", error.message);
    return { success: false, error: "Connexion impossible avec la passerelle de paiement. Vérifiez votre réseau." };
  }
}