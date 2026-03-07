import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendUserNotification } from '@/actions/notificationActions';

/**
 * @fileOverview Webhook Moneroo mis à jour pour gérer l'affiliation et le parrainage.
 * ✅ AMBASSADEURS : Calcule et crédite la commission si un affiliateId est présent.
 * ✅ PARRAINAGE : Crédite le parrain si l'instructeur a été invité par un autre formateur.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status, metadata, id: transactionId, amount, currency_code } = body.data || {};

    if (status === 'successful') {
      const { userId, courseId, affiliateId } = metadata || {};

      if (!userId || !courseId) {
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      const db = getAdminDb();
      const batch = db.batch();

      // 1. Récupération des données critiques
      const [courseDoc, settingsDoc] = await Promise.all([
        db.collection('courses').doc(courseId).get(),
        db.collection('settings').doc('global').get()
      ]);

      const courseData = courseDoc.data();
      const settings = settingsDoc.data();
      const instructorId = courseData?.instructorId;

      // 2. Création de l'inscription
      const enrollmentRef = db.collection('enrollments').doc(`${userId}_${courseId}`);
      batch.set(enrollmentRef, {
        studentId: userId,
        courseId: courseId,
        instructorId: instructorId || '',
        status: 'active', 
        enrollmentDate: FieldValue.serverTimestamp(),
        lastAccessedAt: FieldValue.serverTimestamp(),
        progress: 0,
        priceAtEnrollment: amount || 0,
        transactionId: transactionId,
        affiliateId: affiliateId || null,
        enrollmentType: 'paid'
      }, { merge: true });

      // 3. LOGIQUE AMBASSADEUR (SI COURS NDARA)
      if (affiliateId && courseData?.isPlatformOwned && settings?.commercial?.affiliateEnabled) {
          const affPerc = settings.commercial.affiliatePercentage || 10;
          const affCommission = (amount * affPerc) / 100;
          
          const affiliateRef = db.collection('users').doc(affiliateId);
          batch.update(affiliateRef, {
              affiliateBalance: FieldValue.increment(affCommission)
          });

          // Notifier l'ambassadeur
          await sendUserNotification(affiliateId, {
              text: `Félicitations ! Vous avez gagné ${affCommission.toLocaleString('fr-FR')} XOF de commission ambassadeur.`,
              type: 'success',
              link: '/student/dashboard'
          });
      }

      // 4. LOGIQUE PARRAINAGE FORMATEUR
      if (instructorId && settings?.commercial?.referralEnabled) {
          const instructorDoc = await db.collection('users').doc(instructorId).get();
          const sponsorId = instructorDoc.data()?.referredBy;

          if (sponsorId) {
              const refPerc = settings.commercial.referralPercentage || 5;
              const refCommission = (amount * refPerc) / 100;

              const sponsorRef = db.collection('users').doc(sponsorId);
              batch.update(sponsorRef, {
                  referralBalance: FieldValue.increment(refCommission)
              });

              await sendUserNotification(sponsorId, {
                  text: `Gain de parrainage : +${refCommission.toLocaleString('fr-FR')} XOF sur une vente de votre filleul.`,
                  type: 'success',
                  link: '/instructor/dashboard'
              });
          }
      }

      await batch.commit();

      // Notifications et Logs d'activité
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