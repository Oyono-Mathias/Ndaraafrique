'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendUserNotification } from '@/actions/notificationActions';
import type { NdaraPaymentDetails, Course, Settings, NdaraUser } from '@/lib/types';

/**
 * @fileOverview Ndara Payment Processor (Le Cerveau Financier).
 * ✅ STANDARD : Statuts en minuscules.
 */

export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = details;
  
  const db = getAdminDb();

  try {
    const existingPayment = await db.collection('payments').doc(String(transactionId)).get();
    if (existingPayment.exists && existingPayment.data()?.status === 'completed') {
      return { success: true };
    }

    const isTopup = metadata.type === 'wallet_topup';

    const promises: any[] = [
      db.collection('settings').doc('global').get(),
      db.collection('users').doc(metadata.userId).get()
    ];

    if (!isTopup) {
        promises.push(db.collection('courses').doc(metadata.courseId).get());
    }

    const [settingsDoc, userDoc, courseDoc] = await Promise.all(promises);

    if (!userDoc.exists) {
        throw new Error("UTILISATEUR_NON_TROUVE");
    }

    const settings = (settingsDoc.exists ? settingsDoc.data() : {}) as Settings;
    const userData = userDoc.data() as NdaraUser;
    
    const batch = db.batch();

    const paymentRef = db.collection('payments').doc(String(transactionId));
    const paymentData: any = {
      id: transactionId,
      gatewayTransactionId: gatewayTransactionId || transactionId,
      userId: metadata.userId,
      amount,
      currency,
      provider,
      date: FieldValue.serverTimestamp(),
      status: 'completed', // ✅ STANDARD
      metadata
    };

    if (isTopup) {
        paymentData.courseTitle = "Recharge Wallet Ndara";
        const userRef = db.collection('users').doc(metadata.userId);
        batch.update(userRef, { balance: FieldValue.increment(amount) });
    } else {
        if (!courseDoc || !courseDoc.exists) throw new Error("COURS_NON_TROUVE");
        const courseData = courseDoc.data() as Course;

        const instructorSharePercent = settings.commercial?.instructorShare || 80;
        const affiliateSharePercent = settings.commercial?.affiliatePercentage || 10;
        
        const effectiveAffiliateId = metadata.affiliateId || userData.referredBy;
        const hasAffiliate = !!effectiveAffiliateId && effectiveAffiliateId !== metadata.userId;

        const affiliateCommission = hasAffiliate ? (amount * affiliateSharePercent) / 100 : 0;
        const instructorRevenue = (amount * instructorSharePercent) / 100;
        const platformFee = amount - instructorRevenue - affiliateCommission;

        paymentData.courseId = metadata.courseId;
        paymentData.courseTitle = courseData.title;
        paymentData.instructorId = courseData.instructorId;
        paymentData.platformFee = platformFee;
        paymentData.instructorRevenue = instructorRevenue;
        paymentData.affiliateCommission = affiliateCommission;
        paymentData.affiliateId = hasAffiliate ? effectiveAffiliateId : null;

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

        const sellerId = courseData.ownerId || courseData.instructorId;
        if (sellerId && sellerId !== 'NDARA_OFFICIAL') {
            const sellerRef = db.collection('users').doc(sellerId);
            batch.update(sellerRef, {
                balance: FieldValue.increment(instructorRevenue),
                'affiliateStats.sales': FieldValue.increment(1)
            });
        }

        if (hasAffiliate) {
            const affiliateId = effectiveAffiliateId!;
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
    await batch.commit();

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
    console.error("PAYMENT_PROCESSOR_CORE_ERROR:", error.message);
    throw error;
  }
}
