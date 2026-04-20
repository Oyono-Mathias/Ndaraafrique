'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NdaraPaymentDetails, Course, NdaraUser } from '@/lib/types';

/**
 * ✅ Processeur financier COMPLET
 * ✔ Wallet (crédit + débit)
 * ✔ Achat cours sécurisé
 * ✔ Anti double paiement
 * ✔ Idempotent
 * ✔ Respect Firestore
 */

export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = details;

  if (!metadata?.userId) throw new Error("USER_ID_REQUIRED");

  const db = getAdminDb();

  try {
    return await db.runTransaction(async (transaction) => {

      const paymentRef = db.collection('payments').doc(String(transactionId));
      const userRef = db.collection('users').doc(metadata.userId);

      // ======================
      // ✅ 1. TOUS LES READS
      // ======================

      const paymentSnap = await transaction.get(paymentRef);

      if (paymentSnap.exists && paymentSnap.data()?.status === 'completed') {
        return { success: true, alreadyProcessed: true };
      }

      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");

      // On force le typage ici pour le build Vercel et on garantit la présence des données
      const userData = userSnap.data() as NdaraUser;
      if (!userData) throw new Error("USER_DATA_MISSING");

      const isSimulated = metadata.isSimulated === true || provider === 'simulated';
      const isTopup = metadata.type === 'wallet_topup' || metadata.courseId === 'WALLET_TOPUP';

      let courseSnap = null;
      let courseRef = null;
      let enrollmentRef = null;
      let enrollmentSnap = null;

      if (!isTopup && metadata.courseId) {
        courseRef = db.collection('courses').doc(metadata.courseId);
        courseSnap = await transaction.get(courseRef);

        const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
        enrollmentRef = db.collection('enrollments').doc(enrollmentId);
        enrollmentSnap = await transaction.get(enrollmentRef);
      }

      // ======================
      // ✅ 2. WRITES
      // ======================

      const paymentData = {
        id: String(transactionId),
        userId: metadata.userId,
        amount: Number(amount),
        currency: currency || 'XAF',
        provider,
        status: 'completed',
        isSimulated,
        date: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        gatewayTransactionId: gatewayTransactionId || transactionId,
        courseId: metadata.courseId || 'WALLET_TOPUP',
        courseTitle: isTopup
          ? 'Recharge Portefeuille'
          : (metadata.courseTitle || 'Achat formation'),
        metadata: { ...metadata }
      };

      // 💾 Enregistrer paiement
      transaction.set(paymentRef, paymentData, { merge: true });

      // ======================
      // 💰 CAS 1 : RECHARGE WALLET
      // ======================
      if (isTopup) {

        const field = isSimulated ? 'virtualBalance' : 'balance';

        transaction.update(userRef, {
          [field]: FieldValue.increment(Number(amount)),
          updatedAt: FieldValue.serverTimestamp()
        });

      }

      // ======================
      // 🎓 CAS 2 : ACHAT COURS
      // ======================
      else if (courseSnap && courseSnap.exists && courseRef && enrollmentRef) {

        // 🔒 Anti double achat
        if (enrollmentSnap && enrollmentSnap.exists) {
          return { success: true, alreadyEnrolled: true };
        }

        const courseData = courseSnap.data() as Course;

        // 💰 Débit wallet (si réel)
        if (!isSimulated) {
          // TS check : userData est maintenant garanti non-undefined
          const currentBalance = (userData.balance as number) || 0;

          if (currentBalance < Number(amount)) {
            throw new Error("SOLDE_INSUFFISANT");
          }

          transaction.update(userRef, {
            balance: FieldValue.increment(-Number(amount)),
            updatedAt: FieldValue.serverTimestamp()
          });
        }

        // 🎓 Inscription
        transaction.set(enrollmentRef, {
          id: `${metadata.userId}_${metadata.courseId}`,
          studentId: metadata.userId,
          courseId: metadata.courseId,
          instructorId: courseData.instructorId,
          status: 'active',
          progress: 0,
          isSimulated,
          enrollmentDate: FieldValue.serverTimestamp(),
          lastAccessedAt: FieldValue.serverTimestamp(),
          priceAtEnrollment: Number(amount)
        });

        // 📊 Update cours
        transaction.update(courseRef, {
          participantsCount: FieldValue.increment(1)
        });

        // 💸 Paiement formateur
        if (!isSimulated && courseData.instructorId && courseData.instructorId !== 'NDARA_OFFICIAL') {
          const instructorRef = db.collection('users').doc(courseData.instructorId);
          const share = Number(amount) * 0.7;

          transaction.update(instructorRef, {
            balance: FieldValue.increment(share)
          });
        }
      }

      return { success: true };
    });

  } catch (error: any) {
    console.error("❌ [Payment Processor Error]:", error.message);
    throw error;
  }
}