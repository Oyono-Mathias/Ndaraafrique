'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendUserNotification } from '@/actions/notificationActions';
import type { NdaraPaymentDetails, Course, Settings, NdaraUser } from '@/lib/types';

/**
 * @fileOverview Ndara Payment Processor (Le Cerveau Financier).
 * Seul point d'entrée pour l'activation des droits après paiement.
 * ✅ ROBUSTE : Capture les erreurs de configuration Firebase Admin.
 */

export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = details;
  
  let db;
  try {
      db = getAdminDb();
  } catch (e: any) {
      console.error("PAYMENT_PROCESSOR_CONFIG_ERROR:", e.message);
      throw new Error("Le serveur n'est pas configuré pour traiter les transactions (FIREBASE_SERVICE_ACCOUNT_KEY manquante).");
  }

  try {
    // 1. VÉRIFICATION IDEMPOTENCE
    const existingPayment = await db.collection('payments').doc(String(transactionId)).get();
    if (existingPayment.exists && existingPayment.data()?.status === 'Completed') {
      return { success: true };
    }

    const isTopup = metadata.type === 'wallet_topup';

    // 2. RÉCUPÉRATION DES DONNÉES CONTEXTUELLES
    const promises: any[] = [
      db.collection('settings').doc('global').get(),
      db.collection('users').doc(metadata.userId).get()
    ];

    if (!isTopup) {
        promises.push(db.collection('courses').doc(metadata.courseId).get());
    }

    const [settingsDoc, userDoc, courseDoc] = await Promise.all(promises);

    if (!userDoc.exists) {
        throw new Error("Utilisateur introuvable pour activation.");
    }

    const settings = (settingsDoc.exists ? settingsDoc.data() : {}) as Settings;
    const userData = userDoc.data() as NdaraUser;
    
    const batch = db.batch();

    // 3. ENREGISTREMENT TRANSACTION FINANCIÈRE
    const paymentRef = db.collection('payments').doc(String(transactionId));
    const paymentData: any = {
      id: transactionId,
      gatewayTransactionId: gatewayTransactionId || transactionId,
      userId: metadata.userId,
      amount,
      currency,
      provider,
      date: FieldValue.serverTimestamp(),
      status: 'Completed',
      metadata
    };

    if (isTopup) {
        // --- LOGIQUE RECHARGE WALLET ---
        paymentData.courseTitle = "Recharge Wallet Ndara";
        
        const userRef = db.collection('users').doc(metadata.userId);
        batch.update(userRef, {
            balance: FieldValue.increment(amount)
        });

    } else {
        // --- LOGIQUE ACHAT FORMATION ---
        if (!courseDoc || !courseDoc.exists) throw new Error("Cours introuvable.");
        const courseData = courseDoc.data() as Course;

        const instructorSharePercent = settings.commercial?.instructorShare || 80;
        const affiliateSharePercent = metadata.affiliateId ? (settings.commercial?.affiliatePercentage || 10) : 0;
        
        const affiliateCommission = (amount * affiliateSharePercent) / 100;
        const instructorRevenue = (amount * instructorSharePercent) / 100;
        const platformFee = amount - instructorRevenue - affiliateCommission;

        paymentData.courseId = metadata.courseId;
        paymentData.courseTitle = courseData.title;
        paymentData.instructorId = courseData.instructorId;
        paymentData.platformFee = platformFee;
        paymentData.instructorRevenue = instructorRevenue;
        paymentData.affiliateCommission = affiliateCommission;

        // Inscription
        const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
        const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
        batch.set(enrollmentRef, {
          id: enrollmentId,
          studentId: metadata.userId,
          courseId: metadata.courseId,
          instructorId: courseData.instructorId,
          status: 'active', 
          progress: 0,
          enrollmentDate: FieldValue.serverTimestamp(),
          lastAccessedAt: FieldValue.serverTimestamp(),
          priceAtEnrollment: amount,
          transactionId,
          enrollmentType: 'paid'
        }, { merge: true });

        // Crédit Vendeur
        const sellerId = courseData.ownerId || courseData.instructorId;
        if (sellerId && sellerId !== 'NDARA_OFFICIAL') {
            const sellerRef = db.collection('users').doc(sellerId);
            batch.update(sellerRef, {
                balance: FieldValue.increment(instructorRevenue),
                'affiliateStats.sales': FieldValue.increment(1)
            });
        }

        // Affiliation
        if (metadata.affiliateId && metadata.affiliateId !== metadata.userId) {
            const affiliateId = metadata.affiliateId;
            const affTransRef = db.collection('affiliate_transactions').doc();
            const unlockDate = new Date();
            unlockDate.setDate(unlockDate.getDate() + (settings.commercial?.payoutDelayDays || 14));

            batch.set(affTransRef, {
                id: affTransRef.id,
                affiliateId,
                courseId: metadata.courseId,
                courseTitle: courseData.title,
                buyerId: metadata.userId,
                buyerName: userData.fullName,
                amount,
                commissionAmount: affiliateCommission,
                status: 'pending',
                createdAt: FieldValue.serverTimestamp(),
                unlockDate: Timestamp.fromDate(unlockDate)
            });

            const affiliateRef = db.collection('users').doc(affiliateId);
            batch.update(affiliateRef, {
                pendingAffiliateBalance: FieldValue.increment(affiliateCommission),
                'affiliateStats.earnings': FieldValue.increment(affiliateCommission)
            });
        }
    }

    batch.set(paymentRef, paymentData);

    // 4. FINALISATION
    await batch.commit();

    // Notifier l'utilisateur (optionnel, capture les erreurs de messaging)
    try {
        await sendUserNotification(metadata.userId, {
          text: isTopup 
            ? `Votre compte a été crédité de ${amount.toLocaleString()} XOF.`
            : `Félicitations ! Votre formation "${paymentData.courseTitle}" est disponible.`,
          link: isTopup ? `/student/wallet` : `/student/courses/${metadata.courseId}`,
          type: 'success'
        });
    } catch (e) {
        console.warn("Notification failed, but payment processed.");
    }

    return { success: true };

  } catch (error: any) {
    console.error("PAYMENT_PROCESSOR_FATAL:", error.message);
    throw error;
  }
}
