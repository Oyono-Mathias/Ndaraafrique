'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NdaraPaymentDetails, Course, NdaraUser } from '@/lib/types';

/**
 * ✅ Processeur financier SÉCURISÉ v3.1
 * Garantit le lien atomique entre Paiement et Accès au cours.
 * ✅ TRAÇABILITÉ : Mise à jour du document de paiement existant ou création si manquant.
 */
export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = details;

  if (!metadata?.userId) throw new Error("USER_ID_REQUIRED");

  const db = getAdminDb();

  try {
    return await db.runTransaction(async (transaction) => {
      const paymentRef = db.collection('payments').doc(String(transactionId));
      const userRef = db.collection('users').doc(metadata.userId);

      // 1. IDEMPOTENCE : Éviter les doubles traitements
      const paymentSnap = await transaction.get(paymentRef);
      if (paymentSnap.exists && paymentSnap.data()?.status === 'completed') {
        return { success: true, alreadyProcessed: true };
      }

      // 2. RÉCUPÉRATION UTILISATEUR
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
      const userData = userSnap.data() as NdaraUser;

      const isSimulated = metadata.isSimulated === true || provider === 'simulated' || provider === 'admin_recharge_test';
      const isTopup = metadata.type === 'wallet_topup' || metadata.courseId === 'WALLET_TOPUP';

      // 💾 Mise à jour du reçu de paiement vers SUCCESS
      const paymentData = {
        id: String(transactionId),
        userId: metadata.userId,
        amount: Number(amount),
        currency: currency || 'XOF',
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

      // Si le document n'existe pas encore (cas achat direct wallet), on ajoute la date de création
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
        
        // Log de sécurité
        const securityLogRef = db.collection('security_logs').doc();
        transaction.set(securityLogRef, {
            eventType: isSimulated ? 'wallet_topup_virtual' : 'wallet_topup_real',
            userId: metadata.userId,
            targetId: String(transactionId),
            details: `Crédit de ${amount} ${currency} via ${provider}.`,
            timestamp: FieldValue.serverTimestamp()
        });
      }

      // =========================================================
      // 🎓 CAS 2 : ACHAT DE COURS (TYPE course_purchase)
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

        // SÉCURITÉ PAIEMENT RÉEL
        if (!isSimulated) {
          const currentBalance = Number(userData.balance) || 0;
          
          // Vérification ultime avant débit (Wallet case)
          if (provider === 'wallet' && currentBalance < Number(amount)) {
            throw new Error("SOLDE_INSUFFISANT");
          }

          // Débit du solde réel si achat via Wallet
          if (provider === 'wallet') {
            transaction.update(userRef, {
                balance: FieldValue.increment(-Number(amount)),
                updatedAt: FieldValue.serverTimestamp()
            });
          }

          // Rémunération Formateur (70%)
          if (courseData.instructorId && courseData.instructorId !== 'NDARA_OFFICIAL') {
            const instructorRef = db.collection('users').doc(courseData.instructorId);
            transaction.update(instructorRef, {
              balance: FieldValue.increment(Number(amount) * 0.7)
            });
          }
        }

        // CRÉATION DE L'ACCÈS (ENROLLMENT)
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

        // Mise à jour des statistiques du cours
        transaction.update(courseRef, {
          participantsCount: FieldValue.increment(1)
        });

        // Log de sécurité
        const securityLogRef = db.collection('security_logs').doc();
        transaction.set(securityLogRef, {
            eventType: 'course_enrollment',
            userId: metadata.userId,
            targetId: metadata.courseId,
            details: `Inscription au cours "${courseData.title}" validée par paiement ${provider}.`,
            timestamp: FieldValue.serverTimestamp()
        });
      }

      return { success: true };
    });

  } catch (error: any) {
    console.error("❌ [Payment Processor Error]:", error.message);
    throw error;
  }
}