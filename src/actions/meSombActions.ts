'use server';

/**
 * @fileOverview Actions MeSomb utilisant le SDK officiel pour garantir une signature valide.
 * ✅ SÉCURITÉ : Signature V4 gérée nativement par le SDK.
 * ✅ PROPRE : Suppression des préfixes hardcodés (ex: 49b59f91).
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getMeSombClient, generateNonce } from '@/lib/mesomb';
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
    if (cleanPhone.length === 9 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('2'))) {
      cleanPhone = '237' + cleanPhone;
    }

    const client = getMeSombClient();
    
    // Appel au SDK MeSomb (la signature est générée ici)
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
        // ✅ On utilise l'ID de MeSomb (pk) comme seule source de vérité
        const gatewayId = String(transaction.pk || transaction.id);
        
        // Création du reçu "pending" dans Firestore avec l'ID réel
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

  } catch (error: any) {
    console.error("[MeSomb Action Error]", error.message);
    return { success: false, error: error.message };
  }
}
