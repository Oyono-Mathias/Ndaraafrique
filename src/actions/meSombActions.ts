
'use server';

/**
 * @fileOverview Actions serveur MeSomb pour Ndara Afrique.
 * ✅ RÉSOLU : Utilisation du client centralisé fetchMeSomb.
 * ✅ RÉSOLU : Headers Token Auth standardisés.
 */

import { randomUUID, randomBytes } from 'crypto';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { fetchMeSomb } from '@/lib/mesomb';
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

        // Appel via le client centralisé
        const data = await fetchMeSomb('payment/balance/');

        return { 
            success: true, 
            balance: data.balance, 
            currency: data.currency || 'XAF' 
        };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * 💸 Initier un paiement Mobile Money
 */
export async function initiateMeSombPayment(params: MeSombPaymentParams): Promise<MeSombResponse> {
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
        return { 
            success: true, 
            type: 'SIMULATED', 
            message: "Mode TEST : Votre paiement a été validé sans débit réel." 
        };
    }

    // 3. Préparation du numéro (Standard Cameroun +237)
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 9 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('2'))) {
        cleanPhone = '237' + cleanPhone;
    }

    const internalRef = randomUUID();
    const secretNonce = randomBytes(32).toString('hex');
    const currency = 'XAF'; 

    // 4. Appel API Collect via client centralisé
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

    console.log(`[MeSomb] Initiation transaction ${internalRef} pour ${params.amount} ${currency}`);

    const data = await fetchMeSomb('payment/collect/', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    // 5. Enregistrement de la transaction en attente
    await db.collection('payments').doc(internalRef).set({
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
        metadata: { operator: params.service, phone: cleanPhone }
    });

    return { 
        success: true, 
        type: 'REAL', 
        transactionId: internalRef, 
        message: "Veuillez valider l'opération sur votre téléphone." 
    };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
