'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { NdaraPaymentDetails, Course, NdaraUser, NdaraTransaction, NdaraEarning, AffiliateTransaction } from '@/lib/types';

/**
 * ✅ PROCESSEUR FINANCIER ÉLITE v7.0 (Source de Vérité)
 * Gère l'intégrité, l'idempotence et le MOTEUR DE PARRAINAGE avec ANTI-FRAUDE.
 * Seul point d'entrée pour la modification des soldes réels.
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
      // Empêche de créditer deux fois si le webhook est renvoyé.
      const paymentSnap = await transaction.get(paymentRef);
      if (paymentSnap.exists && paymentSnap.data()?.status === 'completed') {
        console.log(`[PaymentProcessor] Transaction ${transactionId} déjà finalisée. Ignoré.`);
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

      // 📊 CRÉATION DU LOG COMPTABLE (Transactions)
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

        // CRÉATION DE L'ACCÈS (SOURCE DE VÉRITÉ)
        transaction.set(enrollmentRef, {
            id: enrollmentId,
            studentId: metadata.userId,
            courseId: metadata.courseId,
            instructorId: instructorId,
            status: 'active',
            accessStatus: 'active',
            progress: 0,
            enrollmentDate: now,
            lastAccessedAt: now,
            priceAtEnrollment: Number(amount),
            paymentId: String(transactionId) // 💰 Preuve financière liée
        }, { merge: true });

        // 👥 MOTEUR DE PARRAINAGE : Reward the Referrer
        if (userData.referredBy && userData.referredBy !== metadata.userId) {
            const referrerId = userData.referredBy;
            const referrerRef = db.collection('users').doc(referrerId);
            
            const referrerSnap = await transaction.get(referrerRef);
            if (referrerSnap.exists && referrerSnap.data()?.status === 'active') {
                const commissionRate = 0.10; 
                const commissionAmount = Number(amount) * commissionRate;

                if (commissionAmount > 0) {
                    // 🔒 SÉQUESTRE : On injecte dans pendingAffiliateBalance (libéré sous 14j par Cron)
                    transaction.update(referrerRef, {
                        pendingAffiliateBalance: FieldValue.increment(commissionAmount),
                        'affiliateStats.earnings': FieldValue.increment(commissionAmount),
                        'affiliateStats.sales': FieldValue.increment(1)
                    });

                    const affRef = db.collection('affiliate_transactions').doc();
                    const unlockDate = new Date();
                    unlockDate.setDate(unlockDate.getDate() + 14);

                    const affTransaction: AffiliateTransaction = {
                        id: affRef.id,
                        affiliateId: referrerId,
                        buyerId: metadata.userId,
                        buyerName: userData.fullName || 'Ndara Student',
                        courseId: metadata.courseId,
                        courseTitle: courseTitle,
                        amount: Number(amount),
                        commissionAmount: commissionAmount,
                        status: 'pending',
                        createdAt: now,
                        unlockDate: Timestamp.fromDate(unlockDate)
                    };
                    transaction.set(affRef, affTransaction);
                }
            }
        }

        // 💰 VENTILATION DES REVENUS
        if (instructorId !== 'NDARA_OFFICIAL') {
            const instructorRef = db.collection('users').doc(instructorId);
            const instructorShare = Number(amount) * 0.7; 
            transaction.update(instructorRef, { balance: FieldValue.increment(instructorShare) });

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
        }

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
        const targetField = metadata.isSimulated ? 'virtualBalance' : 'balance';
        transaction.update(userRef, {
          [targetField]: FieldValue.increment(Number(amount)),
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
