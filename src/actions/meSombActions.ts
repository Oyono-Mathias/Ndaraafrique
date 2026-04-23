'use server';

/**
 * @fileOverview Actions MeSomb utilisant le SDK officiel pour garantir une signature valide.
 * ✅ SÉCURITÉ : Signature V4 gérée nativement par le SDK.
 * ✅ DIAGNOSTIC : Retourne désormais le message d'erreur précis de MeSomb.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getMeSombClient, generateNonce, getMeSombTransactionStatus, getMeSombAccountBalance } from '@/lib/mesomb';
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

    // 1. MODE TEST : Crédit instantané via le processeur financier
    if (isTestMode) {
      const simTxnId = `SIM-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
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

    // 2. PAIEMENT RÉEL VIA SDK OFFICIEL
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    
    // Normalisation pour le Cameroun (MeSomb standard)
    if (cleanPhone.length === 9) {
      if (cleanPhone.startsWith('6') || cleanPhone.startsWith('2')) {
        cleanPhone = '237' + cleanPhone;
      }
    } else if (cleanPhone.length === 8 && (cleanPhone.startsWith('7'))) {
        // Cas spécifique RCA si applicable (à adapter selon pays)
        cleanPhone = '236' + cleanPhone;
    }

    const client = getMeSombClient();
    
    const response = await client.makeCollect({
        amount: params.amount,
        service: params.service,
        payer: cleanPhone,
        country: cleanPhone.startsWith('237') ? 'CM' : 'CF',
        currency: 'XAF',
        nonce: generateNonce()
    });

    if (response.isOperationSuccess()) {
        const transaction = (response as any).transaction; 
        const gatewayId = String(transaction.pk || transaction.id);
        
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
        const errorData = (response as any).data || {};
        const errorMsg = errorData.message || "Le paiement a été rejeté par MeSomb.";
        return { success: false, error: errorMsg };
    }

  } catch (error: any) {
    console.error("[MeSomb Action Error]", error.message);
    return { success: false, error: error.message || "Erreur de connexion aux serveurs de paiement." };
  }
}

/** 🛠️ Réconcilier les paiements en attente (Action Admin) */
export async function reconcilePendingPaymentsAction(adminId: string) {
    try {
        const db = getAdminDb();
        const adminDoc = await db.collection('users').doc(adminId).get();
        if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
            throw new Error("UNAUTHORIZED: Droits d'administrateur requis.");
        }

        const pendingSnap = await db.collection('payments').where('status', '==', 'pending').limit(20).get();
        let processed = 0;

        for (const docSnap of pendingSnap.docs) {
            const paymentData = docSnap.data();
            const officialTxn = await getMeSombTransactionStatus(docSnap.id);

            if (officialTxn && officialTxn.status === 'SUCCESS') {
                await processNdaraPayment({
                    transactionId: docSnap.id,
                    gatewayTransactionId: docSnap.id,
                    provider: 'mesomb_reconciled',
                    amount: Number(officialTxn.amount),
                    currency: officialTxn.currency || 'XAF',
                    metadata: {
                        ...paymentData.metadata,
                        userId: paymentData.userId,
                        courseId: paymentData.courseId || 'WALLET_TOPUP',
                        type: paymentData.type || 'wallet_topup',
                    }
                });

                await db.collection('security_logs').add({
                    eventType: 'payment_reconciled',
                    userId: adminId,
                    targetId: docSnap.id,
                    details: `Réconciliation manuelle réussie pour ${paymentData.amount} XAF.`,
                    timestamp: FieldValue.serverTimestamp()
                });
                
                processed++;
            }
        }

        return { success: true, processed };
    } catch (e: any) {
        console.error("[Reconcile Error]", e.message);
        return { success: false, error: e.message };
    }
}

/** 💰 Obtenir le solde du compte marchand (Action Admin) */
export async function getMeSombBalanceAction(adminId: string) {
    try {
        const response = await getMeSombAccountBalance();
        return { 
            success: true, 
            balance: response.balance || 0, 
            currency: response.currency || 'XAF' 
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
