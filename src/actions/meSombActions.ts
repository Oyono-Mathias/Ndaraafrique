'use server';

/**
 * @fileOverview Actions MeSomb pour Next.js Server Actions.
 * Utilise le SDK officiel @hachther/mesomb v2.0.1.
 * ✅ DYNAMIQUE : Supporte désormais le pays et la devise passés en paramètres.
 * ✅ TRAÇABILITÉ : Enregistre systématiquement les tentatives avec le titre du cours.
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
  country?: string; // Ex: 'CM', 'SN', 'CF'
  currency?: string; // Ex: 'XAF', 'XOF'
  type?: 'course_purchase' | 'wallet_topup' | 'license_purchase';
  courseId?: string;
  courseTitle?: string;
}): Promise<MeSombResponse> {
  const db = getAdminDb();
  const gatewayId = `TRY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
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
        currency: params.currency || 'XAF',
        metadata: {
          userId: params.userId,
          type: params.type || 'course_purchase',
          courseId: params.courseId || 'WALLET_TOPUP',
          courseTitle: params.courseTitle || (params.type === 'wallet_topup' ? 'Recharge Wallet' : 'Formation'),
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
    
    // Détermination dynamique du pays et de la devise
    const country = params.country || 'CM';
    const currency = params.currency || (['SN', 'CI', 'BJ', 'BF', 'NE', 'TG', 'ML'].includes(country) ? 'XOF' : 'XAF');

    const response = await client.makeCollect({
        amount: params.amount,
        service: params.service,
        payer: cleanPhone,
        country: country,
        currency: currency
    });

    const realId = response.isOperationSuccess() 
        ? String((response as any).transaction.pk || (response as any).transaction.id)
        : gatewayId;

    // Enregistrer la transaction (Succès ou Échec partiel) pour la traçabilité
    await db.collection('payments').doc(realId).set({
      id: realId,
      userId: params.userId,
      amount: Number(params.amount),
      currency: currency,
      status: response.isOperationSuccess() ? 'pending' : 'failed',
      type: params.type || 'course_purchase',
      provider: params.service.toLowerCase(),
      isSimulated: false,
      courseId: params.courseId || 'WALLET_TOPUP',
      courseTitle: params.courseTitle || (params.type === 'wallet_topup' ? 'Recharge Wallet' : 'Formation'),
      date: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      metadata: { 
        operator: params.service, 
        phone: cleanPhone, 
        gatewayId: realId,
        country: country,
        errorMessage: !response.isOperationSuccess() ? (response as any).message : null
      }
    });

    // Ajouter au flux d'activité si c'est un échec
    if (!response.isOperationSuccess()) {
        await db.collection('users').doc(params.userId).collection('activity').add({
            userId: params.userId,
            type: 'payment',
            title: 'Tentative de recharge échouée',
            description: `Le paiement de ${params.amount} F par ${params.service} a été rejeté par l'opérateur.`,
            read: false,
            createdAt: FieldValue.serverTimestamp()
        });
    }

    if (response.isOperationSuccess()) {
        return { 
          success: true, 
          type: 'REAL', 
          transactionId: realId, 
          message: "Validez le prompt USSD sur votre mobile." 
        };
    } else {
        const errorMsg = (response as any).message || "Le paiement a été rejeté par l'opérateur.";
        return { success: false, error: errorMsg };
    }

  } catch (error: any) {
    console.error("[MeSomb Action Error]", error.message);
    
    // Log de l'erreur fatale
    await db.collection('payments').doc(gatewayId).set({
      id: gatewayId,
      userId: params.userId,
      amount: Number(params.amount),
      currency: 'XAF',
      status: 'failed',
      type: params.type || 'course_purchase',
      provider: params.service?.toLowerCase() || 'unknown',
      courseTitle: params.courseTitle || 'Transaction Ndara',
      date: FieldValue.serverTimestamp(),
      metadata: { error: error.message }
    });

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

/** 💰 Consultation solde marchand */
export async function getMeSombBalanceAction(adminId: string) {
    try {
        const response = await getMeSombAccountBalance();
        const data = response as any;
        
        let totalBalance = data.balance || 0;

        if (data.balances && Array.isArray(data.balances)) {
            const sum = data.balances.reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0);
            if (sum > totalBalance) totalBalance = sum;
        }

        return { 
            success: true, 
            balance: totalBalance, 
            currency: 'XAF' 
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
