'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NdaraPaymentDetails, Course, NdaraUser, NdaraTransaction, NdaraEarning } from '@/lib/types';

/**
 * ✅ PROCESSEUR FINANCIER ÉLITE v6.0 - Infrastructure Step 1
 * Gère l'intégrité, l'idempotence et la ventilation comptable (Transactions & Earnings).
 */
export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = details;

  if (!metadata?.userId) throw new Error("USER_ID_REQUIRED");

  const db = getAdminDb();
  const now = FieldValue.serverTimestamp();

  try {
    return await db.runTransaction(async (transaction) => {
      const paymentRef = db.collection('payments').doc(String(transactionId));
      const userRef = db.collection('users').doc(metadata.userId);
      const activityRef = userRef.collection('activity').doc();

      // 1. VÉRIFICATION IDEMPOTENCE (Audit Gateway)
      const paymentSnap = await transaction.get(paymentRef);
      if (paymentSnap.exists && paymentSnap.data()?.status === 'completed') {
        console.log(`[PaymentProcessor] Transaction ${transactionId} déjà traitée.`);
        return { success: true, alreadyProcessed: true };
      }

      // 2. RÉCUPÉRATION UTILISATEUR ET VÉRIFICATION SOLDE
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
      
      const userData = userSnap.data() as NdaraUser;
      const isTopupOrDeposit = metadata.type === 'wallet_topup' || metadata.type === 'deposit' || metadata.courseId === 'WALLET_TOPUP';

      // 🛡️ SÉCURITÉ FINTECH : Vérification du solde si achat par Wallet
      if (provider === 'wallet' && !isTopupOrDeposit) {
          const currentBalance = userData.balance || 0;
          if (currentBalance < amount) {
              console.error(`[CRITICAL] Solde insuffisant pour ${metadata.userId} (${currentBalance} < ${amount})`);
              throw new Error("SOLDE_INSUFFISANT");
          }
          transaction.update(userRef, {
              balance: FieldValue.increment(-amount),
              updatedAt: now
          });
      }

      // 💾 MISE À JOUR DU REGISTRE GATEWAY (Payments)
      const paymentData = {
        id: String(transactionId),
        userId: metadata.userId,
        amount: Number(amount),
        currency: currency || 'XOF',
        provider: provider,
        type: metadata.type || (isTopupOrDeposit ? 'wallet_topup' : 'course_purchase'),
        status: 'completed',
        isSimulated: metadata.isSimulated || false,
        courseId: metadata.courseId || null,
        courseTitle: metadata.courseTitle || null,
        date: now,
        updatedAt: now,
        gatewayTransactionId: gatewayTransactionId || transactionId,
        metadata: { ...metadata, processedAt: new Date().toISOString() }
      };
      transaction.set(paymentRef, paymentData, { merge: true });

      // 📊 CRÉATION DU LOG COMPTABLE (Transactions) - Pour le client (Audit Acheteur)
      const buyerTransactionRef = db.collection('transactions').doc();
      const buyerTransaction: NdaraTransaction = {
        id: buyerTransactionRef.id,
        userId: metadata.userId,
        type: isTopupOrDeposit ? 'deposit' : 'purchase',
        amount: Number(amount),
        status: 'success',
        meta: { 
            courseId: metadata.courseId, 
            courseTitle: metadata.courseTitle,
            gatewayId: String(transactionId),
            provider 
        },
        createdAt: now
      };
      transaction.set(buyerTransactionRef, buyerTransaction);

      // =========================================================
      // 🎓 CAS : ACHAT DE COURS / LICENCE (Fulfillment)
      // =========================================================
      if (!isTopupOrDeposit && metadata.courseId) {
        const courseRef = db.collection('courses').doc(metadata.courseId);
        const courseSnap = await transaction.get(courseRef);
        
        const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
        const enrollmentRef = db.collection('enrollments').doc(enrollmentId);

        let instructorId = 'NDARA_OFFICIAL';
        let courseTitle = metadata.courseTitle || 'Formation';

        if (courseSnap.exists) {
            const courseData = courseSnap.data() as Course;
            instructorId = courseData.instructorId || instructorId;
            courseTitle = courseData.title || courseTitle;
            
            transaction.update(courseRef, { participantsCount: FieldValue.increment(1) });
        }

        // CRÉATION DE L'ACCÈS
        transaction.set(enrollmentRef, {
            id: enrollmentId,
            studentId: metadata.userId,
            courseId: metadata.courseId,
            instructorId: instructorId,
            status: 'active',
            progress: 0,
            enrollmentDate: now,
            lastAccessedAt: now,
            priceAtEnrollment: Number(amount)
        }, { merge: true });

        // 💰 VENTILATION DES REVENUS (Earnings & Commission)
        if (instructorId !== 'NDARA_OFFICIAL') {
            const instructorRef = db.collection('users').doc(instructorId);
            const instructorShare = Number(amount) * 0.7; // Standard 70%
            const platformCommission = Number(amount) * 0.3; // Standard 30%

            // 1. Crédit balance instructeur
            transaction.update(instructorRef, { balance: FieldValue.increment(instructorShare) });

            // 2. Log Earning instructeur
            const earningRef = db.collection('earnings').doc();
            const earning: NdaraEarning = {
                id: earningRef.id,
                userId: instructorId,
                type: 'course_sale',
                amount: instructorShare,
                sourceId: metadata.courseId,
                createdAt: now
            };
            transaction.set(earningRef, earning);

            // 3. Log Commission Plateforme (Comptabilité Interne)
            const commissionTransRef = db.collection('transactions').doc();
            const commissionTrans: NdaraTransaction = {
                id: commissionTransRef.id,
                userId: 'PLATFORM_REVENUE',
                type: 'commission',
                amount: platformCommission,
                status: 'success',
                meta: { sourceCourseId: metadata.courseId, buyerId: metadata.userId },
                createdAt: now
            };
            transaction.set(commissionTransRef, commissionTrans);
        }

        // Notification d'activité
        transaction.set(activityRef, {
            userId: metadata.userId,
            type: 'enrollment',
            title: 'Formation activée !',
            description: `Vous avez désormais accès à : ${courseTitle}`,
            link: `/courses/${metadata.courseId}`,
            read: false,
            createdAt: now
        });
      }

      // =========================================================
      // 💰 CAS : RECHARGE DU WALLET (Fulfillment)
      // =========================================================
      else if (isTopupOrDeposit && provider !== 'wallet') {
        transaction.update(userRef, {
          balance: FieldValue.increment(Number(amount)),
          updatedAt: now
        });
        
        transaction.set(activityRef, {
            userId: metadata.userId,
            type: 'payment',
            title: 'Wallet crédité',
            description: `Votre recharge de ${amount.toLocaleString()} ${currency || 'XOF'} est disponible.`,
            read: false,
            createdAt: now
        });
      }

      return { success: true };
    });

  } catch (error: any) {
    console.error("❌ [CRITICAL_PAYMENT_FAILURE]:", error.message);
    return { success: false, error: error.message };
  }
}
