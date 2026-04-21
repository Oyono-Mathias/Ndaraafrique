'use server';

/**
 * @fileOverview Actions MeSomb utilisant le moteur de signature manuel.
 * ✅ FIABILITÉ : Utilise callMeSombApi pour un contrôle total des requêtes.
 * ✅ TRAÇABILITÉ : Enregistre le paiement en statut 'pending' dès l'initiation.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { callMeSombApi, getMeSombTransactionStatus } from '@/lib/mesomb';
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

    // 1. MODE TEST
    if (isTestMode) {
      const simTxnId = `SIM-${Date.now()}`;
      await processNdaraPayment({
        transactionId: simTxnId,
        provider: 'simulated',
        amount: params.amount,
        currency: 'XAF',
        metadata: {
          userId: params.userId,
          type: params.type || 'course_purchase',
          courseId: params.courseId || 'WALLET_TOPUP',
          isSimulated: true,
          reason: 'Achat simulé (Mode Test)'
        }
      });

      return { 
        success: true, 
        type: 'SIMULATED', 
        message: "MODE TEST : Crédit virtuel ajouté instantanément." 
      };
    }

    // 2. PAIEMENT RÉEL via API Manuelle
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 9 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('2'))) {
      cleanPhone = '237' + cleanPhone;
    }

    const internalRef = randomUUID();

    const response = await callMeSombApi({
        endpoint: '/api/v1.1/payment/collect/',
        method: 'POST',
        body: {
            amount: params.amount,
            service: params.service,
            payer: cleanPhone,
            country: 'CM',
            currency: 'XAF',
            fees: true,
            conversion: true,
            extra: {
                internalReference: internalRef
            }
        }
    });

    if (response.status === 'SUCCESS' || response.status === 'PENDING') {
        const transaction = response.transaction; 
        const gatewayId = String(transaction.pk || transaction.id);
        
        // Sauvegarde immédiate pour le webhook
        await db.collection('payments').doc(gatewayId).set({
          id: gatewayId,
          userId: params.userId,
          amount: Number(params.amount),
          currency: 'XAF',
          status: 'pending',
          type: params.type || 'course_purchase',
          provider: params.service.toLowerCase(),
          isSimulated: false,
          courseId: params.courseId || 'WALLET_TOPUP',
          date: FieldValue.serverTimestamp(),
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
        return { success: false, error: response.message || "Le paiement a été rejeté." };
    }

  } catch (error: any) {
    console.error("[MeSomb Action Error]", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * ACTION ADMIN : Réconciliation des paiements bloqués
 */
export async function reconcilePendingPaymentsAction(adminId: string) {
    const db = getAdminDb();
    const adminSnap = await db.collection('users').doc(adminId).get();
    if (adminSnap.data()?.role !== 'admin') throw new Error("UNAUTHORIZED");

    try {
        const pendingSnap = await db.collection('payments')
            .where('status', '==', 'pending')
            .where('isSimulated', '==', false)
            .limit(20)
            .get();

        if (pendingSnap.empty) return { success: true, processed: 0 };

        let successCount = 0;

        for (const paymentDoc of pendingSnap.docs) {
            const data = paymentDoc.data();
            const gatewayId = paymentDoc.id;

            const realTxn = await getMeSombTransactionStatus(gatewayId);

            if (realTxn && realTxn.status === 'SUCCESS') {
                await processNdaraPayment({
                    transactionId: gatewayId,
                    gatewayTransactionId: gatewayId,
                    provider: 'reconciliation_service',
                    amount: Number(realTxn.amount),
                    currency: realTxn.currency || 'XAF',
                    metadata: {
                        ...data.metadata,
                        userId: data.userId,
                        type: data.type,
                        courseId: data.courseId,
                        reconciledBy: adminId
                    }
                });
                successCount++;
            }
        }

        return { success: true, processed: successCount };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getMeSombBalanceAction(adminId: string) {
  try {
    const db = getAdminDb();
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') throw new Error("UNAUTHORIZED");
    return { success: true, balance: 0, currency: 'XAF' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
