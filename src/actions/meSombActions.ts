'use server';

/**
 * @fileOverview Actions MeSomb pour Next.js Server Actions.
 * Utilise le SDK officiel @hachther/mesomb v2.0.1.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getMeSombClient, getMeSombTransactionStatus, getMeSombAccountBalance } from '@/lib/mesomb';
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

    // 1. MODE TEST : Crédit virtuel instantané
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
        message: "Mode TEST : Crédit ajouté." 
      };
    }

    // 2. PAIEMENT RÉEL VIA SDK OFFICIEL
    const cleanPhone = params.phoneNumber.replace(/\D/g, '');
    const client = getMeSombClient();
    
    // Appel makeCollect tel que documenté dans le SDK v2.0.1
    const response = await client.makeCollect({
        amount: params.amount,
        service: params.service,
        payer: cleanPhone,
        country: 'CM',
        currency: 'XAF'
    });

    if (response.isOperationSuccess()) {
        const transaction = (response as any).transaction; 
        const gatewayId = String(transaction.pk || transaction.id);
        
        // Enregistrer la transaction en 'pending' pour la traçabilité
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
          message: "Validez le prompt USSD sur votre mobile." 
        };
    } else {
        const errorMsg = (response as any).message || "Le paiement a été rejeté par l'opérateur.";
        return { success: false, error: errorMsg };
    }

  } catch (error: any) {
    console.error("[MeSomb Action Error]", error.message);
    return { success: false, error: error.message || "Erreur de connexion aux serveurs de paiement." };
  }
}

/** 🛠️ Réconciliation manuelle par l'admin */
export async function reconcilePendingPaymentsAction(adminId: string) {
    try {
        const db = getAdminDb();
        const pendingSnap = await db.collection('payments').where('status', '==', 'pending').limit(20).get();
        let processed = 0;

        for (const docSnap of pendingSnap.docs) {
            const paymentData = docSnap.data();
            const officialTxn = await getMeSombTransactionStatus(docSnap.id);

            // Cast en any pour éviter les erreurs de build sur les propriétés de l'objet transaction
            if (officialTxn && (officialTxn as any).status === 'SUCCESS') {
                await processNdaraPayment({
                    transactionId: docSnap.id,
                    provider: 'mesomb_reconciled',
                    amount: Number((officialTxn as any).amount),
                    currency: 'XAF',
                    metadata: {
                        userId: paymentData.userId,
                        courseId: paymentData.courseId,
                        type: paymentData.type,
                    }
                });
                processed++;
            }
        }
        return { success: true, processed };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 💰 Consultation solde marchand */
export async function getMeSombBalanceAction(adminId: string) {
    try {
        const response = await getMeSombAccountBalance();
        // Le SDK renvoie l'objet Application. On force le cast en any car les types TS du SDK sont incomplets.
        return { 
            success: true, 
            balance: (response as any).balance || 0, 
            currency: 'XAF' 
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
