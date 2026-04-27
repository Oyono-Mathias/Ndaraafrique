'use server';

/**
 * @fileOverview Actions MeSomb pour Next.js Server Actions.
 * ✅ SÉCURITÉ : Suppression totale du mode simulé pour la production.
 * ✅ FIABILITÉ : Création systématique du document AVANT l'appel MeSomb.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getMeSombClient } from '@/lib/mesomb';
import type { NdaraUser } from '@/lib/types';

export type MeSombResponse =
  | { success: true; transactionId: string; message: string }
  | { success: false; error: string };

/** 💸 1. Initier un paiement réel (Collect) */
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
  const externalReference = `ND-TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const cleanPhone = params.phoneNumber.replace(/\D/g, '');
  const country = params.country || 'CM';
  const currency = params.currency || (['SN', 'CI', 'BJ', 'BF', 'NE', 'TG', 'ML'].includes(country) ? 'XOF' : 'XAF');

  try {
    // 🛡️ 1. ENREGISTREMENT PRÉALABLE (Impératif Fintech)
    await db.collection('payments').doc(externalReference).set({
      id: externalReference,
      userId: params.userId,
      amount: Number(params.amount),
      currency: currency,
      status: 'pending',
      type: params.type || 'course_purchase',
      provider: params.service.toLowerCase(),
      isSimulated: false,
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

    // ⚡ 2. APPEL API MESOMB
    const client = getMeSombClient();
    const response = await client.makeCollect({
        amount: params.amount,
        service: params.service,
        payer: cleanPhone,
        country: country,
        currency: currency,
        reference: externalReference 
    });

    if (response.isOperationSuccess()) {
        const transaction = (response as any).transaction;
        const gatewayId = String(transaction.pk || transaction.id);
        
        // On lie l'ID MeSomb au document Ndara
        await db.collection('payments').doc(externalReference).update({
            gatewayTransactionId: gatewayId,
            updatedAt: FieldValue.serverTimestamp()
        });

        return { 
          success: true, 
          transactionId: externalReference,
          message: "Veuillez valider le prompt sur votre téléphone." 
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
    return { success: false, error: error.message || "Erreur de connexion aux serveurs de paiement." };
  }
}

/** 💰 2. Vérifier le solde marchand MeSomb (Pour Admin) */
export async function getMeSombBalanceAction(adminId: string) {
    try {
        const db = getAdminDb();
        const adminDoc = await db.collection('users').doc(adminId).get();
        if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') throw new Error("Accès refusé.");

        const client = getMeSombClient();
        const appStatus = await client.getStatus();
        const balances = (appStatus as any).balances || [];
        const mainBalance = balances[0] || { value: 0, currency: 'XAF' };
        
        return { 
            success: true, 
            balance: Number(mainBalance.value), 
            currency: mainBalance.currency 
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
