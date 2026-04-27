'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NdaraPaymentDetails, Course, NdaraUser } from '@/lib/types';

/**
 * ✅ PROCESSEUR FINANCIER ÉLITE v5.0
 * Priorité absolue à l'expérience utilisateur : Débloque l'accès avant les stats.
 * Gère l'idempotence stricte pour éviter les doubles débits/inscriptions.
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
        return { success: true, alreadyProcessed: true };
      }

      // 2. RÉCUPÉRATION UTILISATEUR
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
      
      const userData = userSnap.data() as NdaraUser;
      const isTopup = metadata.type === 'wallet_topup' || metadata.courseId === 'WALLET_TOPUP';

      // 💾 Mise à jour du document de paiement (C'est ce qui débloque l'UI en temps réel)
      const paymentData = {
        status: 'completed',
        updatedAt: FieldValue.serverTimestamp(),
        gatewayTransactionId: gatewayTransactionId || transactionId,
        metadata: { 
          ...metadata,
          processedAt: new Date().toISOString()
        }
      };

      transaction.update(paymentRef, paymentData);

      // =========================================================
      // 🎓 CAS : ACHAT DE COURS DIRECT (Priorité Étudiant)
      // =========================================================
      if (!isTopup && metadata.courseId) {
        const courseRef = db.collection('courses').doc(metadata.courseId);
        const courseSnap = await transaction.get(courseRef);
        
        // On crée l'inscription même si le document cours a un souci (fallback instructor)
        const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
        const enrollmentRef = db.collection('enrollments').doc(enrollmentId);

        let instructorId = 'NDARA_OFFICIAL';
        let courseTitle = metadata.courseTitle || 'Formation';

        if (courseSnap.exists) {
            const courseData = courseSnap.data() as Course;
            instructorId = courseData.instructorId || instructorId;
            courseTitle = courseData.title || courseTitle;
            
            // Mise à jour des compteurs (non-bloquant pour l'étudiant)
            transaction.update(courseRef, {
                participantsCount: FieldValue.increment(1)
            });
        }

        // CRÉATION DE L'ACCÈS (L'élément vital)
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
            transaction.update(instructorRef, {
                balance: FieldValue.increment(Number(amount) * 0.7) // 70% pour l'expert
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
      // 💰 CAS : RECHARGE DU WALLET
      // =========================================================
      else if (isTopup) {
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
    throw error;
  }
}
