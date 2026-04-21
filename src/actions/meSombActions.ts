'use server';

/**
 * @fileOverview Actions MeSomb utilisant le SDK officiel pour garantir une signature valide.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getMeSombClient, getMeSombTransactionStatus, generateNonce } from '@/lib/mesomb';
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

    // 2. PAIEMENT RÉEL VIA SDK
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 9 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('2'))) {
      cleanPhone = '237' + cleanPhone;
    }

    try {
        const client = getMeSombClient();
        
        // Appel au SDK MeSomb (makeCollect gère la signature nativement)
        const response = await client.makeCollect({
            amount: params.amount,
            service: params.service,
            payer: cleanPhone,
            country: 'CM',
            currency: 'XAF',
            nonce: generateNonce()
        });

        if (response.isOperationSuccess()) {
            const transaction = (response as any).transaction; 
            const gatewayId = String(transaction.pk || transaction.id);
            
            // Sauvegarde immédiate avec l'ID réel pour le futur Webhook
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
                gatewayId: gatewayId
              }
            });

            return { 
              success: true, 
              type: 'REAL', 
              transactionId: gatewayId, 
              message: "Veuillez valider le prompt USSD sur votre téléphone." 
            };
        } else {
            return { success: false, error: "Le paiement a été rejeté par MeSomb." };
        }
    } catch (apiError: any) {
        console.error("MeSomb SDK Error:", apiError.message);
        return { success: false, error: `MeSomb: ${apiError.message}` };
    }

  } catch (error: any) {
    console.error("[Action Error]", error.message);
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
    
    // Le SDK gère aussi la récupération du solde
    const client = getMeSombClient();
    const response = await (client as any).getTransactions(); // Placeholder pour balance API
    
    return { success: true, balance: 0, currency: 'XAF' }; // La balance nécessite un endpoint spécifique
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
