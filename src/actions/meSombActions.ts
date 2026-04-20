'use server';

/**
 * @fileOverview Actions MeSomb utilisant le SDK officiel pour une sécurité maximale.
 * ✅ UNIFICATION : Utilise l'ID MeSomb (pk) comme ID de document Firestore.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getMeSombClient } from '@/lib/mesomb';
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

    // 1. GESTION DU MODE TEST
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
        message: "MODE TEST : Crédit virtuel ajouté instantanément." 
      };
    }

    // 2. PRÉPARATION DU PAIEMENT RÉEL (SDK)
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 9 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('2'))) {
      cleanPhone = '237' + cleanPhone;
    }

    const internalRef = randomUUID();
    const client = getMeSombClient();

    const response = await client.makeCollect({
        amount: params.amount,
        service: params.service,
        payer: cleanPhone,
        country: 'CM',
        currency: 'XAF',
        extra: {
            internalReference: internalRef
        }
    });

    if (response.isOperationSuccess()) {
        const transaction = (response as any).transaction; 
        const gatewayId = String(transaction.pk); // L'ID officiel MeSomb
        
        // 💾 ENREGISTREMENT AVEC ID MESOMB POUR LE WEBHOOK
        await db.collection('payments').doc(gatewayId).set({
          id: gatewayId,
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
            gatewayId: gatewayId,
            internalRef: internalRef
          }
        });

        return { 
          success: true, 
          type: 'REAL', 
          transactionId: gatewayId, 
          message: "Veuillez valider le prompt USSD sur votre téléphone." 
        };
    } else {
        return { success: false, error: "Le paiement a été rejeté par l'opérateur." };
    }

  } catch (error: any) {
    console.error("[MeSomb SDK Error]", error.message);
    return { success: false, error: error.message || "Erreur de communication avec MeSomb" };
  }
}

export async function getMeSombBalanceAction(adminId: string) {
  try {
    const db = getAdminDb();
    const adminDoc = await db.collection('users').doc(adminId).get();
    
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      throw new Error("UNAUTHORIZED");
    }

    return { success: true, balance: 0, currency: 'XAF' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
