'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NdaraPaymentDetails, Course, NdaraUser } from '@/lib/types';

/**
 * ✅ Processeur financier SÉCURISÉ v2.0
 * Flux hermétiques : balance (réel) vs virtualBalance (simulé)
 */

export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = details;

  if (!metadata?.userId) throw new Error("USER_ID_REQUIRED");

  const db = getAdminDb();

  try {
    return await db.runTransaction(async (transaction) => {

      const paymentRef = db.collection('payments').doc(String(transactionId));
      const userRef = db.collection('users').doc(metadata.userId);

      // 1. VÉRIFICATION D'IDEMPOTENCE
      const paymentSnap = await transaction.get(paymentRef);
      if (paymentSnap.exists && paymentSnap.data()?.status === 'completed') {
        return { success: true, alreadyProcessed: true };
      }

      // 2. RÉCUPÉRATION UTILISATEUR
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
      const userData = userSnap.data() as NdaraUser;
      if (!userData) throw new Error("USER_DATA_MISSING");

      // DÉTERMINATION DU MODE (RÉEL VS SIMULÉ)
      // Une transaction est simulée si metadata.isSimulated est true OU si le provider est 'simulated'
      const isSimulated = metadata.isSimulated === true || provider === 'simulated' || provider === 'admin_recharge_test';
      const isTopup = metadata.type === 'wallet_topup' || metadata.courseId === 'WALLET_TOPUP';

      // 💾 Préparation du reçu de paiement
      const paymentData = {
        id: String(transactionId),
        userId: metadata.userId,
        amount: Number(amount),
        currency: currency || 'XOF',
        provider,
        status: 'completed',
        isSimulated, // Marqueur critique pour l'audit
        date: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        gatewayTransactionId: gatewayTransactionId || transactionId,
        courseId: metadata.courseId || 'WALLET_TOPUP',
        courseTitle: isTopup ? 'Recharge Portefeuille' : (metadata.courseTitle || 'Achat formation'),
        metadata: { ...metadata }
      };

      transaction.set(paymentRef, paymentData, { merge: true });

      // =========================================================
      // 💰 CAS 1 : RECHARGE (DÉPÔT)
      // =========================================================
      if (isTopup) {
        // SÉPARATION STRICTE : On ne crédite QUE le champ correspondant au mode
        const targetField = isSimulated ? 'virtualBalance' : 'balance';
        
        transaction.update(userRef, {
          [targetField]: FieldValue.increment(Number(amount)),
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      // =========================================================
      // 🎓 CAS 2 : ACHAT DE COURS
      // =========================================================
      else if (metadata.courseId) {
        const courseRef = db.collection('courses').doc(metadata.courseId);
        const courseSnap = await transaction.get(courseRef);
        if (!courseSnap.exists) throw new Error("COURSE_NOT_FOUND");
        const courseData = courseSnap.data() as Course;

        const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
        const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
        const enrollmentSnap = await transaction.get(enrollmentRef);

        if (enrollmentSnap.exists) {
          return { success: true, alreadyEnrolled: true };
        }

        // SÉCURITÉ ACHAT RÉEL
        if (!isSimulated) {
          const currentBalance = Number(userData.balance) || 0;
          if (currentBalance < Number(amount)) {
            throw new Error("SOLDE_INSUFFISANT");
          }

          // DÉBIT RÉEL UNIQUEMENT
          transaction.update(userRef, {
            balance: FieldValue.increment(-Number(amount)),
            updatedAt: FieldValue.serverTimestamp()
          });

          // PAIEMENT FORMATEUR (70%) - Uniquement sur achat réel
          if (courseData.instructorId && courseData.instructorId !== 'NDARA_OFFICIAL') {
            const instructorRef = db.collection('users').doc(courseData.instructorId);
            transaction.update(instructorRef, {
              balance: FieldValue.increment(Number(amount) * 0.7)
            });
          }
        } else {
          // MODE TEST : On débite la balance virtuelle si elle existe (optionnel mais propre)
          const currentVirtual = Number(userData.virtualBalance) || 0;
          if (currentVirtual >= Number(amount)) {
             transaction.update(userRef, {
                virtualBalance: FieldValue.increment(-Number(amount))
             });
          }
        }

        // INSCRIPTION (Marquée comme simulée si nécessaire)
        transaction.set(enrollmentRef, {
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

        // 📊 Mise à jour du compteur global (Uniquement pour le réel ?)
        if (!isSimulated) {
            transaction.update(courseRef, {
                participantsCount: FieldValue.increment(1)
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
