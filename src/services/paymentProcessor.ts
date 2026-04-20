'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NdaraPaymentDetails, Course } from '@/lib/types';

/**
 * ✅ Processeur financier sécurisé et corrigé
 * ✔ Respect strict Firestore (READ → WRITE)
 * ✔ Idempotent (pas de double paiement)
 * ✔ Compatible wallet + achat cours
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
      // ✅ 1. READS (TOUJOURS EN PREMIER)
      // ======================

      const paymentSnap = await transaction.get(paymentRef);

      // Idempotence (évite double traitement)
      if (paymentSnap.exists && paymentSnap.data()?.status === 'completed') {
        return { success: true, alreadyProcessed: true };
      }

      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");

      const isSimulated = metadata.isSimulated === true || provider === 'simulated';
      const isTopup = metadata.type === 'wallet_topup' || metadata.courseId === 'WALLET_TOPUP';

      let courseSnap = null;
      let courseRef = null;

      if (!isTopup && metadata.courseId) {
        courseRef = db.collection('courses').doc(metadata.courseId);
        courseSnap = await transaction.get(courseRef); // ✅ READ AVANT WRITE
      }

      // ======================
      // ✅ 2. WRITES (APRÈS TOUS LES READS)
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

      if (isTopup) {
        // 💰 Recharge wallet
        const field = isSimulated ? 'virtualBalance' : 'balance';

        transaction.update(userRef, {
          [field]: FieldValue.increment(Number(amount)),
          updatedAt: FieldValue.serverTimestamp()
        });

      } else if (courseSnap && courseSnap.exists && courseRef) {

        const courseData = courseSnap.data() as Course;
        const enrollmentId = `${metadata.userId}_${metadata.courseId}`;

        // 🎓 Inscription cours
        transaction.set(db.collection('enrollments').doc(enrollmentId), {
          id: enrollmentId,
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

        // 📊 Update stats cours
        transaction.update(courseRef, {
          participantsCount: FieldValue.increment(1)
        });

        // 💸 Paiement formateur (70%)
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