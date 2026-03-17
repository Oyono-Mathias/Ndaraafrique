'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendUserNotification } from '@/actions/notificationActions';
import type { NdaraPaymentDetails, Course, Settings, NdaraUser } from '@/lib/types';

/**
 * @fileOverview Ndara Payment Processor (Le Cerveau Financier).
 * Seul point d'entrée pour l'activation des droits après paiement.
 * Gère l'idempotence, l'attribution, les commissions et le wallet.
 * ✅ ENRICHI : Traçabilité passerelle et répartition financière détaillée.
 */

export async function processNdaraPayment(details: NdaraPaymentDetails) {
  const { transactionId, gatewayTransactionId, provider, amount, currency, metadata } = details;
  const db = getAdminDb();

  try {
    // 1. VÉRIFICATION IDEMPOTENCE (Évite le double traitement)
    const existingPayment = await db.collection('payments').doc(String(transactionId)).get();
    if (existingPayment.exists && existingPayment.data()?.status === 'Completed') {
      console.log(`Transaction ${transactionId} déjà traitée.`);
      return { success: true };
    }

    // 2. RÉCUPÉRATION DES DONNÉES CONTEXTUELLES
    const [courseDoc, settingsDoc, userDoc] = await Promise.all([
      db.collection('courses').doc(metadata.courseId).get(),
      db.collection('settings').doc('global').get(),
      db.collection('users').doc(metadata.userId).get()
    ]);

    if (!courseDoc.exists || !userDoc.exists) {
        throw new Error("Cours ou Utilisateur introuvable pour activation.");
    }

    const courseData = courseDoc.data() as Course;
    const settings = settingsDoc.data() as Settings;
    const userData = userDoc.data() as NdaraUser;
    
    const batch = db.batch();

    // 3. CALCUL DES RÉPARTITIONS FINANCIÈRES
    const instructorSharePercent = settings.commercial?.instructorShare || 80;
    const affiliateSharePercent = metadata.affiliateId ? (settings.commercial?.affiliatePercentage || 10) : 0;
    
    const instructorRevenue = (amount * instructorSharePercent) / 100;
    const affiliateCommission = (amount * affiliateSharePercent) / 100;
    const platformFee = amount - instructorRevenue - affiliateCommission;

    // 4. ENREGISTREMENT TRANSACTION FINANCIÈRE
    const paymentRef = db.collection('payments').doc(String(transactionId));
    batch.set(paymentRef, {
      id: transactionId,
      gatewayTransactionId: gatewayTransactionId || transactionId,
      userId: metadata.userId,
      courseId: metadata.courseId,
      courseTitle: courseData.title,
      instructorId: courseData.instructorId,
      ownerId: courseData.ownerId || courseData.instructorId,
      amount,
      currency,
      provider,
      platformFee,
      instructorRevenue,
      affiliateCommission,
      date: FieldValue.serverTimestamp(),
      status: 'Completed',
      metadata
    });

    // 5. ATTRIBUTION DE LA FORMATION (ENROLLMENT)
    const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
    const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
    
    batch.set(enrollmentRef, {
      id: enrollmentId,
      studentId: metadata.userId,
      courseId: metadata.courseId,
      instructorId: courseData.instructorId,
      status: 'active', // ✅ Statut unifié
      progress: 0,
      enrollmentDate: FieldValue.serverTimestamp(),
      lastAccessedAt: FieldValue.serverTimestamp(),
      priceAtEnrollment: amount,
      transactionId,
      enrollmentType: 'paid'
    }, { merge: true });

    // 6. CRÉDIT DU PORTEFEUILLE VENDEUR (Wallet)
    const sellerId = courseData.ownerId || courseData.instructorId;
    if (sellerId && sellerId !== 'NDARA_OFFICIAL') {
        const sellerRef = db.collection('users').doc(sellerId);
        batch.update(sellerRef, {
            balance: FieldValue.increment(instructorRevenue),
            'affiliateStats.sales': FieldValue.increment(1)
        });
    }

    // 7. GESTION DE L'AFFILIATION (Commission Ambassadeur)
    if (metadata.affiliateId && metadata.affiliateId !== metadata.userId) {
        const affiliateId = metadata.affiliateId;

        // On crée une transaction d'affiliation gelée (pending)
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

        // On crédite le solde 'en attente' de l'ambassadeur
        const affiliateRef = db.collection('users').doc(affiliateId);
        batch.update(affiliateRef, {
            pendingAffiliateBalance: FieldValue.increment(affiliateCommission),
            'affiliateStats.earnings': FieldValue.increment(affiliateCommission)
        });
    }

    // 8. FINALISATION ET NOTIFICATION
    await batch.commit();

    await sendUserNotification(metadata.userId, {
      text: `Félicitations ! Votre formation "${courseData.title}" est maintenant disponible.`,
      link: `/student/courses/${metadata.courseId}`,
      type: 'success'
    });

    return { success: true };

  } catch (error: any) {
    console.error("PAYMENT_PROCESSOR_FATAL:", error.message);
    throw error;
  }
}
