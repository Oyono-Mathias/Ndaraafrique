
'use server';

/**
 * @fileOverview Initiation sécurisée des paiements MeSomb et consultation du solde.
 * ✅ AUTH : Passage au format Token Auth (X-MeSomb-Application + Token API_KEY).
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

/**
 * 💰 Récupérer le solde réel du compte marchand MeSomb (Action Admin)
 */
export async function getMeSombBalanceAction(adminId: string): Promise<{ success: boolean; balance?: number; currency?: string; error?: string }> {
    try {
        const db = getAdminDb();
        const adminDoc = await db.collection('users').doc(adminId).get();
        
        if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
            throw new Error("UNAUTHORIZED: Droits d'administrateur requis.");
        }

        const APP_KEY = process.env.MESOMB_APP_KEY?.trim();
        const API_KEY = process.env.MESOMB_API_KEY?.trim();

        if (!APP_KEY || !API_KEY) {
            throw new Error("Configuration MeSomb manquante (API_KEY ou APP_KEY).");
        }

        const response = await fetch('https://mesomb.hachther.com/api/v1.1/payment/balance', {
            method: 'GET',
            headers: {
                'Authorization': `Token ${API_KEY}`,
                'X-MeSomb-Application': APP_KEY,
                'accept': 'application/json',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || errData.message || "Erreur lors de la récupération du solde.");
        }

        const data = await response.json();
        return { 
            success: true, 
            balance: data.balance, 
            currency: data.currency || 'XAF' 
        };

    } catch (error: any) {
        console.error("[MeSomb Balance Error]:", error.message);
        return { success: false, error: error.message };
    }
}

export async function initiateMeSombPayment(params: MeSombPaymentParams): Promise<MeSombResponse> {
  const APP_KEY = process.env.MESOMB_APP_KEY?.trim();
  const API_KEY = process.env.MESOMB_API_KEY?.trim();

  // 📡 LOGS DE DIAGNOSTIC
  console.log("[MeSomb Migration Check]", {
    hasAppKey: !!APP_KEY,
    hasApiKey: !!API_KEY
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

    // 2. Mode Simulation
    if (settings?.payments?.paymentMode === 'test') {
        console.log(`[MeSomb Simulation] User: ${params.userId} | Amount: ${params.amount}`);
        return { 
            success: true, 
            type: 'SIMULATED', 
            message: "Mode TEST : Votre paiement a été validé sans débit réel." 
        };
    }

    // 3. Validation Configuration
    if (!APP_KEY || !API_KEY) {
        console.error("[MeSomb] CRITICAL: Keys missing in environment.");
        return { success: false, error: "Le service de paiement est indisponible (Server Config Error)." };
    }

    // 4. Préparation du numéro (Standard Cameroun +237)
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 9 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('2'))) {
        cleanPhone = '237' + cleanPhone;
    }

    // 5. Paramètres Financiers
    const internalRef = randomUUID();
    const secretNonce = randomBytes(32).toString('hex');
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

    await db.collection('payments').doc(internalRef).set(transactionData);

    // 6. Construction de l'appel API MeSomb (Token Auth)
    const payload = {
        amount: params.amount,
        service: params.service, 
        receiver: cleanPhone,
        currency: currency,
        nonce: randomBytes(16).toString('hex'),
        extra: { 
            internalReference: internalRef, 
            securityToken: secretNonce 
        }
    };

    const response = await fetch('https://mesomb.hachther.com/api/v1.1/payment/collect', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${API_KEY}`,
        'X-MeSomb-Application': APP_KEY,
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
