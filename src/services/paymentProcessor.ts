'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendUserNotification } from '@/actions/notificationActions';
import type { PaymentProvider, Course, Settings, NdaraUser, NdaraPaymentMetadata } from '@/lib/types';

/**
 * @fileOverview Ndara Payment Processor (Le Cerveau Financier).
 * ✅ WALLET V1 : Gestion des flux de crédit/débit portefeuille.
 */

export interface NdaraPaymentDetails {
  transactionId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  metadata: NdaraPaymentMetadata;
}

export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, provider, amount, currency, metadata } = details;
  const db = getAdminDb();

  try {
    const existingPayment = await db.collection('payments').doc(String(transactionId)).get();
    if (existingPayment.exists && existingPayment.data()?.status === 'Completed') {
      return { success: true, message: 'Transaction déjà traitée.' };
    }

    const [courseDoc, settingsDoc, userDoc] = await Promise.all([
      (metadata.courseId && metadata.courseId !== 'wallet') ? db.collection('courses').doc(metadata.courseId).get() : Promise.resolve(null),
      db.collection('settings').doc('global').get(),
      db.collection('users').doc(metadata.userId).get()
    ]);

    if (!userDoc.exists) throw new Error("Utilisateur introuvable.");

    const settings = settingsDoc.data() as Settings;
    const batch = db.batch();

    // --- ENREGISTREMENT TRANSACTION ---
    const paymentRef = db.collection('payments').doc(String(transactionId));
    const basePaymentData: any = {
      id: transactionId,
      userId: metadata.userId,
      amount,
      currency,
      provider,
      date: FieldValue.serverTimestamp(),
      status: 'Completed',
      metadata
    };

    if (courseDoc?.exists) {
        const courseData = courseDoc.data() as Course;
        basePaymentData.courseId = metadata.courseId;
        basePaymentData.courseTitle = courseData.title;
        basePaymentData.instructorId = courseData.instructorId;
        basePaymentData.ownerId = courseData.ownerId || courseData.instructorId;
    }

    batch.set(paymentRef, basePaymentData);

    // --- LOGIQUE PORTEFEUILLE (TOP-UP) ---
    if (metadata.type === 'wallet_topup') {
        const userRef = db.collection('users').doc(metadata.userId);
        batch.update(userRef, {
            balance: FieldValue.increment(amount),
            updatedAt: FieldValue.serverTimestamp()
        });
        
        await batch.commit();
        await sendUserNotification(metadata.userId, {
            text: `Votre compte a été crédité de ${amount.toLocaleString()} XOF. Votre solde est à jour.`,
            type: 'success'
        });
        return { success: true };
    }

    // --- LOGIQUE ACHAT COURS ---
    if (metadata.type === 'course_purchase' && courseDoc?.exists) {
      const courseData = courseDoc.data() as Course;
      const enrollmentRef = db.collection('enrollments').doc(`${metadata.userId}_${metadata.courseId}`);
      
      batch.set(enrollmentRef, {
        studentId: metadata.userId,
        courseId: metadata.courseId,
        instructorId: courseData.instructorId,
        status: 'active',
        enrollmentDate: FieldValue.serverTimestamp(),
        lastAccessedAt: FieldValue.serverTimestamp(),
        progress: 0,
        priceAtEnrollment: amount,
        transactionId,
        enrollmentType: 'paid'
      }, { merge: true });

      // 💰 CRÉDITER LE VENDEUR (Wallet System)
      const ownerId = courseData.ownerId || courseData.instructorId;
      if (ownerId && ownerId !== 'NDARA_OFFICIAL') {
          const ownerRef = db.collection('users').doc(ownerId);
          const netAmount = (amount * (settings?.commercial?.instructorShare || 80)) / 100;
          batch.update(ownerRef, {
              balance: FieldValue.increment(netAmount),
              'affiliateStats.sales': FieldValue.increment(1)
          });
      }

      if (metadata.affiliateId && metadata.affiliateId !== metadata.userId) {
        const affiliateRef = db.collection('users').doc(metadata.affiliateId);
        const commissionAmount = (amount * (settings?.commercial?.affiliatePercentage || 10)) / 100;
        batch.update(affiliateRef, {
          pendingAffiliateBalance: FieldValue.increment(commissionAmount)
        });
      }
    }

    await batch.commit();

    await sendUserNotification(metadata.userId, {
      text: `Bara ala ! Votre formation est maintenant disponible.`,
      link: `/student/courses/${metadata.courseId}`,
      type: 'success'
    });

    return { success: true };

  } catch (error: any) {
    console.error("PAYMENT_PROCESSOR_FATAL:", error.message);
    throw error;
  }
}
