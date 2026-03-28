'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * @fileOverview Service de gestion du portefeuille Ndara.
 * Gère les crédits de compte de manière atomique.
 */

export async function creditUserWallet(userId: string, amount: number, transactionId: string, description: string) {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);
  const txnRef = db.collection('transactions').doc(transactionId);
  const paymentRef = db.collection('payments').doc(transactionId);

  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("Utilisateur introuvable.");

      // 1. Mise à jour du solde utilisateur
      transaction.update(userRef, {
        balance: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp()
      });

      // 2. Enregistrement dans l'historique des transactions
      transaction.set(txnRef, {
        id: transactionId,
        userId,
        amount,
        type: 'deposit',
        status: 'completed',
        provider: 'cinetpay',
        description,
        createdAt: FieldValue.serverTimestamp()
      });

      // 3. Doublage dans la collection payments pour compatibilité avec le reste de l'app
      transaction.set(paymentRef, {
        id: transactionId,
        userId,
        amount,
        currency: 'XOF',
        provider: 'cinetpay',
        status: 'completed',
        date: FieldValue.serverTimestamp(),
        courseTitle: `Recharge Wallet: ${description}`,
        metadata: { type: 'wallet_topup' }
      });
    });

    console.log(`[WalletService] Crédit réussi: ${amount} pour ${userId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[WalletService] Erreur lors du crédit:", error.message);
    throw error;
  }
}
