import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendUserNotification } from '@/actions/notificationActions';

/**
 * @fileOverview Webhook Moneroo - Version sécurisée pour la Bourse du Savoir.
 * ✅ REVENUS : Redirigés vers l'actuel 'ownerId' du cours.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status, metadata, id: transactionId, amount } = body.data || {};

    if (status === 'successful') {
      const { userId, courseId, affiliateId, couponId } = metadata || {};

      if (!userId || !courseId) {
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      const db = getAdminDb();
      const batch = db.batch();

      // 1. Récupération des données critiques
      const [courseDoc, settingsDoc, buyerDoc] = await Promise.all([
        db.collection('courses').doc(courseId).get(),
        db.collection('settings').doc('global').get(),
        db.collection('users').doc(userId).get()
      ]);

      const courseData = courseDoc.data();
      const settings = settingsDoc.data();
      const buyerData = buyerDoc.data();
      
      // ✅ LOGIQUE BOURSE : Le bénéficiaire financier est le OWNER actuel
      const financialOwnerId = courseData?.ownerId || courseData?.instructorId;

      // 2. Gestion du Coupon
      if (couponId) {
          const couponRef = db.collection('course_coupons').doc(couponId);
          batch.update(couponRef, { usedCount: FieldValue.increment(1) });
      }

      // 3. Création de l'inscription
      const enrollmentRef = db.collection('enrollments').doc(`${userId}_${courseId}`);
      batch.set(enrollmentRef, {
        studentId: userId,
        courseId: courseId,
        instructorId: courseData?.instructorId || '', // Pédagogie
        ownerId: financialOwnerId || '',               // Finance
        status: 'active', 
        enrollmentDate: FieldValue.serverTimestamp(),
        lastAccessedAt: FieldValue.serverTimestamp(),
        progress: 0,
        priceAtEnrollment: amount || 0,
        transactionId: transactionId,
        affiliateId: affiliateId || null,
        couponId: couponId || null,
        enrollmentType: 'paid'
      }, { merge: true });

      // 4. LOGIQUE AMBASSADEUR
      if (affiliateId && settings?.commercial?.affiliateEnabled && affiliateId !== userId) {
          const affiliateRef = db.collection('users').doc(affiliateId);
          const affDoc = await affiliateRef.get();
          const currentSales = affDoc.data()?.affiliateStats?.sales || 0;

          let basePerc = settings.commercial.affiliatePercentage || 10;
          if (currentSales >= 50) basePerc += 10;
          else if (currentSales >= 20) basePerc += 5;

          const affCommission = (amount * basePerc) / 100;
          
          const affTransRef = db.collection('affiliate_transactions').doc();
          const unlockDate = new Date();
          unlockDate.setDate(unlockDate.getDate() + 14);

          batch.set(affTransRef, {
              id: affTransRef.id,
              affiliateId: affiliateId,
              courseId: courseId,
              courseTitle: courseData?.title || 'Formation',
              buyerId: userId,
              buyerName: buyerData?.fullName || 'Étudiant',
              amount: amount,
              commissionAmount: affCommission,
              status: 'pending',
              createdAt: FieldValue.serverTimestamp(),
              unlockDate: Timestamp.fromDate(unlockDate)
          });

          batch.update(affiliateRef, {
              pendingAffiliateBalance: FieldValue.increment(affCommission),
              'affiliateStats.sales': FieldValue.increment(1),
              'affiliateStats.earnings': FieldValue.increment(affCommission)
          });
      }

      await batch.commit();

      await sendUserNotification(userId, {
        text: `Bienvenue ! Votre formation "${courseData?.title || 'demandée'}" est prête.`,
        link: `/student/courses/${courseId}`,
        type: 'success'
      });

      return NextResponse.json({ received: true, processed: true });
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Moneroo Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
