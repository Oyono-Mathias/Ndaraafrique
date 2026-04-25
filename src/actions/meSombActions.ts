'use server';

/**
 * @fileOverview Actions MeSomb pour Next.js Server Actions.
 * ✅ STANDARD BANCAIRE : Création du document AVANT l'appel API.
 * ✅ FIABILITÉ : Utilisation d'une référence externe unique.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getMeSombClient, getMeSombTransactionStatus } from '@/lib/mesomb';
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
  country?: string;
  currency?: string;
  type?: 'course_purchase' | 'wallet_topup' | 'license_purchase';
  courseId?: string;
  courseTitle?: string;
}): Promise<MeSombResponse> {
  const db = getAdminDb();
  // Génération d'une référence unique NDARA avant tout appel
  const externalReference = `ND-TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const cleanPhone = params.phoneNumber.replace(/\D/g, '');
  const country = params.country || 'CM';
  const currency = params.currency || (['SN', 'CI', 'BJ', 'BF', 'NE', 'TG', 'ML'].includes(country) ? 'XOF' : 'XAF');

  try {
    const settingsSnap = await db.collection('settings').doc('global').get();
    const settings = settingsSnap.data() as any;
    const isTestMode = settings?.payments?.paymentMode === 'test';

    // 1. PRÉ-ENREGISTREMENT SYSTÉMATIQUE (Audit Trail)
    // On utilise l'externalReference comme ID de document pour être sûr de le retrouver
    await db.collection('payments').doc(externalReference).set({
      id: externalReference,
      userId: params.userId,
      amount: Number(params.amount),
      currency: currency,
      status: 'pending',
      type: params.type || 'course_purchase',
      provider: params.service.toLowerCase(),
      isSimulated: isTestMode,
      courseId: params.courseId || 'WALLET_TOPUP',
      courseTitle: params.courseTitle || (params.type === 'wallet_topup' ? 'Recharge Wallet' : 'Formation'),
      date: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      externalReference: externalReference,
      metadata: { 
        operator: params.service, 
        phone: cleanPhone, 
        country: country
      }
    });

    // 2. MODE TEST
    if (isTestMode) {
      await processNdaraPayment({
        transactionId: externalReference,
        provider: 'simulated',
        amount: params.amount,
        currency: currency,
        metadata: {
          userId: params.userId,
          type: params.type || 'course_purchase',
          courseId: params.courseId || 'WALLET_TOPUP',
          courseTitle: params.courseTitle || 'Achat Test',
          isSimulated: true
        }
      });
      return { success: true, type: 'SIMULATED', message: "Mode TEST : Crédit ajouté." };
    }

    // 3. PAIEMENT RÉEL
    const client = getMeSombClient();
    const response = await client.makeCollect({
        amount: params.amount,
        service: params.service,
        payer: cleanPhone,
        country: country,
        currency: currency,
        // CRITIQUE : On passe notre ID à MeSomb
        reference: externalReference 
    });

    if (response.isOperationSuccess()) {
        const transaction = (response as any).transaction;
        const realId = String(transaction.pk || transaction.id);
        
        // On met à jour le document avec l'ID réel de MeSomb pour la double traçabilité
        await db.collection('payments').doc(externalReference).update({
            gatewayTransactionId: realId,
            updatedAt: FieldValue.serverTimestamp()
        });

        return { 
          success: true, 
          type: 'REAL', 
          transactionId: externalReference, 
          message: "Validez le prompt USSD." 
        };
    } else {
        const errorMsg = (response as any).message || "Rejeté par l'opérateur.";
        await db.collection('payments').doc(externalReference).update({
            status: 'failed',
            'metadata.errorMessage': errorMsg
        });
        return { success: false, error: errorMsg };
    }

  } catch (error: any) {
    console.error("[MeSomb Action Error]", error.message);
    return { success: false, error: error.message || "Erreur de connexion." };
  }
}

/** 🛠️ Réconciliation manuelle */
export async function reconcilePendingPaymentsAction(adminId: string) {
    try {
        const db = getAdminDb();
        const pendingSnap = await db.collection('payments').where('status', '==', 'pending').limit(20).get();
        let processed = 0;

        for (const docSnap of pendingSnap.docs) {
            const paymentData = docSnap.data();
            // On cherche par le gateway ID si présent, sinon par l'ID doc
            const searchId = paymentData.gatewayTransactionId || docSnap.id;
            const officialTxn = await getMeSombTransactionStatus(searchId);

            if (officialTxn && (officialTxn as any).status === 'SUCCESS') {
                await processNdaraPayment({
                    transactionId: docSnap.id,
                    provider: 'mesomb_reconciled',
                    amount: Number((officialTxn as any).amount),
                    currency: (officialTxn as any).currency || 'XAF',
                    metadata: {
                        userId: paymentData.userId,
                        courseId: paymentData.courseId,
                        courseTitle: paymentData.courseTitle,
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
