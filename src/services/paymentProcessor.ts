'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendUserNotification, sendAdminNotification } from '@/actions/notificationActions';
import { detectFraud } from '@/ai/flows/detect-fraud-flow';
import type { PaymentProvider, Course, Settings, NdaraUser } from '@/lib/types';

/**
 * @fileOverview Ndara Payment Processor (Le Cerveau Financier).
 * Centralise la distribution des revenus, les inscriptions et les commissions d'affiliation.
 * Indépendant du prestataire (Moneroo ou MeSomb).
 */

export interface NdaraPaymentMetadata {
  userId: string;
  courseId: string;
  affiliateId?: string;
  couponId?: string;
  type: 'course_purchase' | 'license_purchase' | 'subscription';
}

export interface NdaraPaymentDetails {
  transactionId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  metadata: NdaraPaymentMetadata;
}

/**
 * Traite un paiement réussi à travers tout l'écosystème Ndara.
 */
export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, provider, amount, currency, metadata } = details;
  const db = getAdminDb();

  try {
    // 1. Vérification d'idempotence : ne pas traiter deux fois la même transaction
    const existingPayment = await db.collection('payments').doc(String(transactionId)).get();
    if (existingPayment.exists && existingPayment.data()?.status === 'Completed') {
      return { success: true, message: 'Transaction déjà traitée.' };
    }

    // 2. Récupération des données critiques
    const [courseDoc, settingsDoc, userDoc] = await Promise.all([
      db.collection('courses').doc(metadata.courseId).get(),
      db.collection('settings').doc('global').get(),
      db.collection('users').doc(metadata.userId).get()
    ]);

    if (!courseDoc.exists || !userDoc.exists) {
      throw new Error("Données manquantes : Utilisateur ou Cours introuvable.");
    }

    const courseData = courseDoc.data() as Course;
    const settings = settingsDoc.data() as Settings;
    const userData = userDoc.data() as NdaraUser;

    const batch = db.batch();

    // 3. Enregistrement de la transaction brute
    const paymentRef = db.collection('payments').doc(String(transactionId));
    batch.set(paymentRef, {
      id: transactionId,
      userId: metadata.userId,
      instructorId: courseData.instructorId,
      ownerId: courseData.ownerId || courseData.instructorId,
      courseId: metadata.courseId,
      courseTitle: courseData.title,
      amount,
      currency,
      provider,
      date: FieldValue.serverTimestamp(),
      status: 'Completed',
      metadata
    });

    // 4. Gestion de l'achat de formation (Enrollment)
    if (metadata.type === 'course_purchase') {
      const enrollmentRef = db.collection('enrollments').doc(`${metadata.userId}_${metadata.courseId}`);
      
      batch.set(enrollmentRef, {
        studentId: metadata.userId,
        courseId: metadata.courseId,
        instructorId: courseData.instructorId,
        ownerId: courseData.ownerId || courseData.instructorId,
        status: 'active',
        enrollmentDate: FieldValue.serverTimestamp(),
        lastAccessedAt: FieldValue.serverTimestamp(),
        progress: 0,
        priceAtEnrollment: amount,
        transactionId,
        affiliateId: metadata.affiliateId || null,
        couponId: metadata.couponId || null,
        enrollmentType: 'paid'
      }, { merge: true });

      // Incrémenter l'usage du coupon si présent
      if (metadata.couponId) {
        const couponRef = db.collection('course_coupons').doc(metadata.couponId);
        batch.update(couponRef, { usedCount: FieldValue.increment(1) });
      }

      // 5. Gestion de la commission Ambassadeur (Affiliation)
      if (metadata.affiliateId && settings?.commercial?.affiliatePercentage && metadata.affiliateId !== metadata.userId) {
        const affiliateRef = db.collection('users').doc(metadata.affiliateId);
        const affDoc = await affiliateRef.get();
        
        if (affDoc.exists) {
          const affData = affDoc.data() as NdaraUser;
          const currentSales = affData.affiliateStats?.sales || 0;

          // Logique de commission progressive Ndara
          let commissionPerc = settings.commercial.affiliatePercentage || 10;
          if (currentSales >= 50) commissionPerc += 10;
          else if (currentSales >= 20) commissionPerc += 5;

          const commissionAmount = (amount * commissionPerc) / 100;
          const unlockDate = new Date();
          unlockDate.setDate(unlockDate.getDate() + (settings.commercial.payoutDelayDays || 14));

          const affTransRef = db.collection('affiliate_transactions').doc();
          batch.set(affTransRef, {
            id: affTransRef.id,
            affiliateId: metadata.affiliateId,
            courseId: metadata.courseId,
            courseTitle: courseData.title,
            buyerId: metadata.userId,
            buyerName: userData.fullName,
            amount,
            commissionAmount,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
            unlockDate: Timestamp.fromDate(unlockDate)
          });

          batch.update(affiliateRef, {
            pendingAffiliateBalance: FieldValue.increment(commissionAmount),
            'affiliateStats.sales': FieldValue.increment(1),
            'affiliateStats.earnings': FieldValue.increment(commissionAmount)
          });
        }
      }
    }

    // Validation atomique du batch
    await batch.commit();

    // 6. Analyse de fraude IA (Asynchrone - ne bloque pas l'inscription)
    const accountAge = Math.floor((Date.now() / 1000) - ((userData.createdAt as any)?.seconds || 0));
    detectFraud({
      transactionId: String(transactionId),
      amount,
      courseTitle: courseData.title || 'Formation',
      user: {
        id: metadata.userId,
        accountAgeInSeconds: accountAge,
        isFirstTransaction: true,
        emailDomain: userData.email.split('@')[1] || '',
      }
    }).then(async (fraudResult) => {
      await paymentRef.set({
        fraudReview: {
          isSuspicious: fraudResult.isSuspicious,
          riskScore: fraudResult.riskScore,
          reason: fraudResult.reason,
          checkedAt: Timestamp.now(),
          reviewed: false
        }
      }, { merge: true });

      if (fraudResult.isSuspicious) {
        await sendAdminNotification({
          title: `⚠️ Alerte Fraude (${provider})`,
          body: `Transaction de ${amount} XOF suspecte par ${userData.email}.`,
          link: `/admin/payments?search=${transactionId}`,
          type: 'financialAnomalies'
        });
      }
    }).catch(e => console.error("AI Fraud Analysis failed:", e));

    // 7. Notification de l'étudiant
    await sendUserNotification(metadata.userId, {
      text: `Bara ala ! Votre formation "${courseData.title}" est maintenant disponible.`,
      link: `/student/courses/${metadata.courseId}`,
      type: 'success'
    });

    return { success: true };

  } catch (error: any) {
    console.error("PAYMENT_PROCESSOR_FATAL:", error.message);
    throw error;
  }
}
