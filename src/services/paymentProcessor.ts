'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NdaraPaymentDetails, Course, NdaraUser } from '@/lib/types';

/**
 * ✅ Processeur financier SÉCURISÉ v3.4
 * Garantit le lien atomique entre Paiement et Accès au cours.
 * ✅ ACTIVITÉ : Ajoute automatiquement une trace dans le flux récent de l'utilisateur.
 */
export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = details;

  if (!metadata?.userId) throw new Error("USER_ID_REQUIRED");

  const db = getAdminDb();

  try {
    return await db.runTransaction(async (transaction) => {
      const paymentRef = db.collection('payments').doc(String(transactionId));
      const userRef = db.collection('users').doc(metadata.userId);
      const activityRef = userRef.collection('activity').doc();

      // 1. IDEMPOTENCE : Éviter les doubles traitements
      const paymentSnap = await transaction.get(paymentRef);
      const currentStatus = paymentSnap.data()?.status?.toLowerCase();
      if (paymentSnap.exists && currentStatus === 'completed') {
        return { success: true, alreadyProcessed: true };
      }

      // 2. RÉCUPÉRATION UTILISATEUR
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
      
      const userData = userSnap.data() as NdaraUser;
      if (!userData) throw new Error("USER_DATA_MISSING");

      const isSimulated = metadata.isSimulated === true || provider === 'simulated' || provider === 'admin_recharge_test';
      const isTopup = metadata.type === 'wallet_topup' || metadata.courseId === 'WALLET_TOPUP';

      // 💾 Mise à jour du reçu de paiement vers SUCCESS
      const paymentData = {
        id: String(transactionId),
        userId: metadata.userId,
        amount: Number(amount),
        currency: currency || 'XAF',
        provider,
        status: 'completed',
        isSimulated,
        type: metadata.type || (isTopup ? 'wallet_topup' : 'course_purchase'),
        updatedAt: FieldValue.serverTimestamp(),
        gatewayTransactionId: gatewayTransactionId || transactionId,
        courseId: metadata.courseId || 'WALLET_TOPUP',
        courseTitle: isTopup ? 'Recharge Portefeuille' : (metadata.courseTitle || 'Achat formation'),
        metadata: { ...metadata }
      };

      if (!paymentSnap.exists) {
          (paymentData as any).date = FieldValue.serverTimestamp();
          (paymentData as any).createdAt = FieldValue.serverTimestamp();
      }

      transaction.set(paymentRef, paymentData, { merge: true });

      // =========================================================
      // 💰 CAS 1 : RECHARGE (DÉPÔT)
      // =========================================================
      if (isTopup) {
        const targetField = isSimulated ? 'virtualBalance' : 'balance';
        transaction.update(userRef, {
          [targetField]: FieldValue.increment(Number(amount)),
          updatedAt: FieldValue.serverTimestamp()
        });
        
        // Journal d'activité pour l'utilisateur
        transaction.set(activityRef, {
            userId: metadata.userId,
            type: 'payment',
            title: isSimulated ? 'Crédit Démo validé' : 'Portefeuille crédité',
            description: `Votre compte a été alimenté de ${amount.toLocaleString()} ${currency}.`,
            read: false,
            createdAt: FieldValue.serverTimestamp()
        });
      }

      // =========================================================
      // 🎓 CAS 2 : ACHAT DE COURS
      // =========================================================
      else if (metadata.courseId) {
        const courseRef = db.collection('courses').doc(metadata.courseId);
        const courseSnap = await transaction.get(courseRef);
        if (!courseSnap.exists) throw new Error("COURS_NON_TROUVÉ");
        const courseData = courseSnap.data() as Course;

        const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
        const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
        const enrollmentSnap = await transaction.get(enrollmentRef);

        if (enrollmentSnap.exists) {
            return { success: true, alreadyEnrolled: true };
        }

        if (!isSimulated) {
          const currentBalance = Number(userData.balance) || 0;
          if (provider === 'wallet' && currentBalance < Number(amount)) throw new Error("SOLDE_INSUFFISANT");

          if (provider === 'wallet') {
            transaction.update(userRef, {
                balance: FieldValue.increment(-Number(amount)),
                updatedAt: FieldValue.serverTimestamp()
            });
          }

          // Rémunération instructeur (70%)
          if (courseData.instructorId && courseData.instructorId !== 'NDARA_OFFICIAL') {
            const instructorRef = db.collection('users').doc(courseData.instructorId);
            transaction.update(instructorRef, {
              balance: FieldValue.increment(Number(amount) * 0.7)
            });
          }
        }

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

        transaction.update(courseRef, {
          participantsCount: FieldValue.increment(1)
        });

        // Journal d'activité pour l'utilisateur
        transaction.set(activityRef, {
            userId: metadata.userId,
            type: 'enrollment',
            title: 'Nouvelle formation acquise',
            description: `Vous avez rejoint le cours : ${courseData.title}`,
            link: `/student/courses/${metadata.courseId}`,
            read: false,
            createdAt: FieldValue.serverTimestamp()
        });
      }

      return { success: true };
    });

  } catch (error: any) {
    console.error("❌ [Payment Processor Error]:", error.message);
    throw error;
  }
}