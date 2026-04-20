'use server';

/**
 * @fileOverview Actions MeSomb utilisant le SDK officiel pour une sécurité maximale.
 * ✅ UNIFICATION : Utilise l'ID MeSomb (pk) comme ID de document Firestore.
 * ✅ TRAÇABILITÉ : Création immédiate d'un document 'pending' pour historique.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getMeSombClient, getMeSombTransactionStatus } from '@/lib/mesomb';
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

    // 1. GESTION DU MODE TEST (SIMULATION)
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

    // 2. PRÉPARATION DU PAIEMENT RÉEL (SDK)
    let cleanPhone = params.phoneNumber.replace(/\D/g, '');
    // Normalisation Cameroun par défaut (MVP)
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
        
        // 💾 ENREGISTREMENT IMMÉDIAT (STATUS: PENDING) POUR TRAÇABILITÉ
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
        return { success: false, error: "Le paiement a été rejeté par l'opérateur." };
    }

  } catch (error: any) {
    console.error("[MeSomb SDK Error]", error.message);
    return { success: false, error: error.message || "Erreur de communication avec MeSomb" };
  }
}

/**
 * 🛠️ ACTION ADMIN : Réconciliation des paiements bloqués
 * Scanne Firestore pour les transactions 'pending' et vérifie leur statut réel.
 */
export async function reconcilePendingPaymentsAction(adminId: string) {
    const db = getAdminDb();
    
    // 1. Sécurité Admin
    const adminSnap = await db.collection('users').doc(adminId).get();
    if (adminSnap.data()?.role !== 'admin') throw new Error("UNAUTHORIZED");

    try {
        // 2. Trouver les transactions 'pending' (Max 20 pour éviter timeout)
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

            // 3. Interroger MeSomb
            const realTxn = await getMeSombTransactionStatus(gatewayId);

            if (realTxn && realTxn.status === 'SUCCESS') {
                // 4. Déclencher le processeur financier pour valider les fonds
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

                // 5. Log de sécurité
                await db.collection('security_logs').add({
                    eventType: 'payment_reconciled',
                    targetId: gatewayId,
                    userId: data.userId,
                    details: `Paiement orphelin de ${realTxn.amount} XAF récupéré via réconciliation manuelle par l'admin.`,
                    timestamp: FieldValue.serverTimestamp()
                });

                successCount++;
            }
        }

        return { success: true, processed: successCount };
    } catch (e: any) {
        console.error("Reconciliation Error:", e.message);
        return { success: false, error: e.message };
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
