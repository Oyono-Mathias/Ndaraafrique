'use server';

/**
 * @fileOverview Actions serveur MeSomb sécurisées par Signature.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { fetchMeSomb } from '@/lib/mesomb';
import { randomUUID } from 'crypto';
import { processNdaraPayment } from '@/services/paymentProcessor';

export type MeSombResponse =
  | { success: true; type: 'REAL'; transactionId: string; message: string }
  | { success: true; type: 'SIMULATED'; message: string }
  | { success: false; error: string };

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

    const isTestMode = settings?.payments?.paymentMode === 'test';

    if (isTestMode) {
      await processNdaraPayment({
        transactionId: `SIM-${Date.now()}`,
        provider: 'simulated',
        amount: params.amount,
        currency: 'XAF',
        metadata: {
          userId: params.userId,
          type: params.type || 'course_purchase',
          courseId: params.courseId || 'WALLET_TOPUP',
          isSimulated: true
        }
      });

      return { 
        success: true, 
        type: 'SIMULATED', 
        message: "MODE TEST : Crédit virtuel ajouté." 
      };
    }

    // Normalisation du numéro (Cameroun)
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 9 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('2'))) {
      cleanPhone = '237' + cleanPhone;
    }

    const internalRef = randomUUID();

    const payload = {
      amount: params.amount,
      service: params.service,
      payer: cleanPhone,
      currency: 'XAF',
      nonce: Math.random().toString(36).substring(2, 15),
    };

    // Appel via le client avec signature
    const data = await fetchMeSomb('payment/collect/', 'POST', payload);

    await db.collection('payments').doc(internalRef).set({
      id: internalRef,
      userId: params.userId,
      amount: Number(params.amount),
      currency: 'XAF',
      status: 'pending',
      provider: 'mesomb',
      type: params.type || 'course_purchase',
      courseId: params.courseId || 'WALLET_TOPUP',
      createdAt: FieldValue.serverTimestamp(),
      metadata: { 
        operator: params.service, 
        phone: cleanPhone, 
        gatewayId: data.pk || data.id 
      }
    });

    return { 
      success: true, 
      type: 'REAL', 
      transactionId: internalRef, 
      message: "Veuillez valider le prompt USSD sur votre téléphone." 
    };

  } catch (error: any) {
    console.error("[MeSomb Action Error]", error.message);
    return { success: false, error: error.message || "Erreur lors de la communication avec MeSomb" };
  }
}

export async function getMeSombBalanceAction(adminId: string) {
  try {
    const db = getAdminDb();
    const adminDoc = await db.collection('users').doc(adminId).get();
    
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      throw new Error("UNAUTHORIZED");
    }

    const data = await fetchMeSomb('application/status/', 'GET');

    return { 
      success: true, 
      balance: data?.balance ?? data?.account_balance ?? 0, 
      currency: 'XAF' 
    };
  } catch (error: any) {
    console.error("[MeSomb Balance Error]", error.message);
    return { success: false, error: error.message };
  }
}
