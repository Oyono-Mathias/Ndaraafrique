'use server';

/**
 * @fileOverview Actions serveur pour MeSomb utilisant le client de signature.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { fetchMeSomb } from '@/lib/mesomb';
import { randomUUID } from 'crypto';

export type MeSombResponse =
  | { success: true; type: 'REAL'; transactionId: string; message: string }
  | { success: true; type: 'SIMULATED'; message: string }
  | { success: false; error: string };

/** 💸 Initier un paiement Mobile Money */
export async function initiateMeSombPayment(params: {
  amount: number;
  phoneNumber: string;
  service: 'ORANGE' | 'MTN' | 'WAVE';
  userId: string;
  type?: 'course_purchase' | 'wallet_topup';
  courseId?: string;
}): Promise<MeSombResponse> {
  try {
    const db = getAdminDb();
    const settingsSnap = await db.collection('settings').doc('global').get();
    const settings = settingsSnap.data() as any;

    // Mode Simulation
    if (settings?.payments?.paymentMode === 'test') {
        return { 
            success: true, 
            type: 'SIMULATED', 
            message: "Mode TEST : Votre paiement a été simulé avec succès." 
        };
    }

    // Standardisation du numéro
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 9 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('2'))) {
        cleanPhone = '237' + cleanPhone;
    }

    const internalRef = randomUUID();

    const payload = {
        amount: params.amount,
        service: params.service, 
        receiver: cleanPhone,
        currency: 'XAF',
        nonce: Math.random().toString(36).substring(2, 15),
    };

    // Utilisation du client centralisé avec signature
    const data = await fetchMeSomb('payment/collect/', 'POST', payload);

    // Enregistrement de la transaction en attente
    await db.collection('payments').doc(internalRef).set({
        id: internalRef,
        userId: params.userId,
        amount: Number(params.amount),
        currency: 'XAF',
        status: 'pending',
        provider: 'mesomb',
        type: params.type || 'course_purchase',
        courseId: params.courseId || 'WALLET_TOPUP',
        courseTitle: params.type === 'wallet_topup' ? 'Recharge Portefeuille' : 'Achat formation',
        createdAt: FieldValue.serverTimestamp(),
        metadata: { operator: params.service, phone: cleanPhone, gatewayId: data.pk || data.id }
    });

    return { 
        success: true, 
        type: 'REAL', 
        transactionId: internalRef, 
        message: "Veuillez valider l'opération sur votre téléphone." 
    };

  } catch (error: any) {
    console.error("[MeSomb Action Error]", error.message);
    return { success: false, error: error.message || "Erreur de configuration serveur." };
  }
}

/** 💰 Récupérer le solde réel du compte marchand */
export async function getMeSombBalanceAction(adminId: string) {
    try {
        const db = getAdminDb();
        const adminDoc = await db.collection('users').doc(adminId).get();
        
        if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
            throw new Error("UNAUTHORIZED");
        }

        const data = await fetchMeSomb('payment/balance/', 'GET');

        return { 
            success: true, 
            balance: data.balance, 
            currency: data.currency || 'XAF' 
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
