'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NdaraPaymentDetails, Course, NdaraUser } from '@/lib/types';

/**
 * ✅ PROCESSEUR FINANCIER ÉLITE v5.1
 * Priorité absolue à l'expérience utilisateur et à l'intégrité des fonds.
 * Gère l'idempotence stricte et le verrouillage anti race-condition.
 * SÉCURISÉ : Vérification du solde pour les paiements par Wallet (Anti Race-Condition).
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

      // 1. VÉRIFICATION IDEMPOTENCE (Évite les doublons)
      const paymentSnap = await transaction.get(paymentRef);
      if (paymentSnap.exists && paymentSnap.data()?.status === 'completed') {
        console.log(`[PaymentProcessor] Transaction ${transactionId} déjà traitée.`);
        return { success: true, alreadyProcessed: true };
      }

      // 2. RÉCUPÉRATION UTILISATEUR ET VÉRIFICATION SOLDE
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
      
      const userData = userSnap.data() as NdaraUser;
      const isTopup = metadata.type === 'wallet_topup' || metadata.courseId === 'WALLET_TOPUP';

      // 🛡️ SÉCURITÉ FINTECH : Vérification du solde si achat par Wallet
      if (provider === 'wallet' && !isTopup) {
          const currentBalance = userData.balance || 0;
          if (currentBalance < amount) {
              console.error(`[CRITICAL] Solde insuffisant pour ${metadata.userId} (${currentBalance} < ${amount})`);
              throw new Error("SOLDE_INSUFFISANT");
          }
          // Déduction immédiate et atomique (uniquement pour le wallet)
          transaction.update(userRef, {
              balance: FieldValue.increment(-amount),
              updatedAt: FieldValue.serverTimestamp()
          });
      }

      // 💾 Mise à jour/Création du document de paiement
      const paymentData = {
        id: String(transactionId),
        userId: metadata.userId,
        amount: Number(amount),
        currency: currency || 'XOF',
        provider: provider,
        type: metadata.type || (isTopup ? 'wallet_topup' : 'course_purchase'),
        status: 'completed',
        isSimulated: metadata.isSimulated || false,
        courseId: metadata.courseId || null,
        courseTitle: metadata.courseTitle || null,
        date: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        gatewayTransactionId: gatewayTransactionId || transactionId,
        metadata: { 
          ...metadata,
          processedAt: new Date().toISOString()
        }
      };

      transaction.set(paymentRef, paymentData, { merge: true });

      // =========================================================
      // 🎓 CAS : ACHAT DE COURS / LICENCE (Fulfillment)
      // =========================================================
      if (!isTopup && metadata.courseId) {
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
            
            // Mise à jour des compteurs
            transaction.update(courseRef, {
                participantsCount: FieldValue.increment(1)
            });
        }

        // CRÉATION DE L'ACCÈS
        transaction.set(enrollmentRef, {
            id: enrollmentId,
            studentId: metadata.userId,
            courseId: metadata.courseId,
            instructorId: instructorId,
            status: 'active',
            progress: 0,
            enrollmentDate: FieldValue.serverTimestamp(),
            lastAccessedAt: FieldValue.serverTimestamp(),
            priceAtEnrollment: Number(amount)
        }, { merge: true });

        // Crédit Instructeur (Sauf si Ndara Officiel)
        if (instructorId !== 'NDARA_OFFICIAL') {
            const instructorRef = db.collection('users').doc(instructorId);
            // L'instructeur reçoit 70% du prix brut
            const instructorShare = Number(amount) * 0.7;
            transaction.update(instructorRef, {
                balance: FieldValue.increment(instructorShare)
            });
        }

        transaction.set(activityRef, {
            userId: metadata.userId,
            type: 'enrollment',
            title: 'Formation activée !',
            description: `Vous avez désormais accès à : ${courseTitle}`,
            link: `/courses/${metadata.courseId}`,
            read: false,
            createdAt: FieldValue.serverTimestamp()
        });
      }

      // =========================================================
      // 💰 CAS : RECHARGE DU WALLET (Fulfillment)
      // =========================================================
      else if (isTopup && provider !== 'wallet') {
        transaction.update(userRef, {
          balance: FieldValue.increment(Number(amount)),
          updatedAt: FieldValue.serverTimestamp()
        });
        
        transaction.set(activityRef, {
            userId: metadata.userId,
            type: 'payment',
            title: 'Wallet crédité',
            description: `Votre recharge de ${amount.toLocaleString()} ${currency || 'XOF'} est disponible.`,
            read: false,
            createdAt: FieldValue.serverTimestamp()
        });
      }

      return { success: true };
    });

  } catch (error: any) {
    console.error("❌ [CRITICAL_PAYMENT_FAILURE]:", error.message);
    return { success: false, error: error.message };
  }
}
