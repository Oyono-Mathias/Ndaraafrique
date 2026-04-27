'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NdaraPaymentDetails, Course, NdaraUser } from '@/lib/types';

/**
 * ✅ PROCESSEUR FINANCIER ÉLITE v4.0
 * Supprime toute logique de simulation pour MeSomb.
 * Force le crédit sur le solde réel (balance).
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

      // 1. IDEMPOTENCE : Ne jamais créditer deux fois
      const paymentSnap = await transaction.get(paymentRef);
      if (paymentSnap.exists && paymentSnap.data()?.status === 'completed') {
        return { success: true, alreadyProcessed: true };
      }

      // 2. RÉCUPÉRATION UTILISATEUR
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
      
      const userData = userSnap.data() as NdaraUser;

      const isTopup = metadata.type === 'wallet_topup' || metadata.courseId === 'WALLET_TOPUP';

      // 💾 Préparation des données de paiement standardisées
      const paymentData = {
        id: String(transactionId),
        userId: metadata.userId,
        amount: Number(amount),
        currency: currency || 'XAF',
        provider: (metadata.operator || provider || 'mobile_money').toLowerCase(),
        status: 'completed',
        isSimulated: false, // Forcé à false car flux MeSomb Webhook = Réel
        type: metadata.type || (isTopup ? 'wallet_topup' : 'course_purchase'),
        updatedAt: FieldValue.serverTimestamp(),
        gatewayTransactionId: gatewayTransactionId || transactionId,
        courseId: metadata.courseId || 'WALLET_TOPUP',
        courseTitle: metadata.courseTitle || (isTopup ? 'Recharge Wallet' : 'Formation'),
        metadata: { ...metadata }
      };

      if (!paymentSnap.exists) {
          (paymentData as any).date = FieldValue.serverTimestamp();
          (paymentData as any).createdAt = FieldValue.serverTimestamp();
      }

      transaction.set(paymentRef, paymentData, { merge: true });

      // =========================================================
      // 💰 CAS 1 : RECHARGE DU WALLET (RÉEL UNIQUEMENT)
      // =========================================================
      if (isTopup) {
        transaction.update(userRef, {
          balance: FieldValue.increment(Number(amount)),
          updatedAt: FieldValue.serverTimestamp()
        });
        
        transaction.set(activityRef, {
            userId: metadata.userId,
            type: 'payment',
            title: 'Portefeuille crédité',
            description: `Votre recharge de ${amount.toLocaleString()} ${currency} a été validée.`,
            read: false,
            createdAt: FieldValue.serverTimestamp()
        });
      }

      // =========================================================
      // 🎓 CAS 2 : ACHAT DE COURS DIRECT
      // =========================================================
      else if (metadata.courseId) {
        const courseRef = db.collection('courses').doc(metadata.courseId);
        const courseSnap = await transaction.get(courseRef);
        
        if (courseSnap.exists) {
            const courseData = courseSnap.data() as Course;
            const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
            const enrollmentRef = db.collection('enrollments').doc(enrollmentId);

            transaction.set(enrollmentRef, {
                id: enrollmentId,
                studentId: metadata.userId,
                courseId: metadata.courseId,
                instructorId: courseData.instructorId,
                status: 'active',
                progress: 0,
                enrollmentDate: FieldValue.serverTimestamp(),
                lastAccessedAt: FieldValue.serverTimestamp(),
                priceAtEnrollment: Number(amount)
            });

            transaction.update(courseRef, {
                participantsCount: FieldValue.increment(1)
            });

            // Commission Instructeur (70% par défaut)
            if (courseData.instructorId && courseData.instructorId !== 'NDARA_OFFICIAL') {
                const instructorRef = db.collection('users').doc(courseData.instructorId);
                transaction.update(instructorRef, {
                    balance: FieldValue.increment(Number(amount) * 0.7)
                });
            }

            transaction.set(activityRef, {
                userId: metadata.userId,
                type: 'enrollment',
                title: 'Formation activée',
                description: `Vous avez rejoint : ${courseData.title}`,
                link: `/student/courses/${metadata.courseId}`,
                read: false,
                createdAt: FieldValue.serverTimestamp()
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
