import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendUserNotification } from '@/actions/notificationActions';

/**
 * @fileOverview Webhook Moneroo mis à jour pour la sécurité financière Ndara.
 * ✅ COMMISSIONS SÉCURISÉES : Statut 'pending' avec délai de 14 jours.
 * ✅ TRAÇABILITÉ : Enregistrement dans 'affiliate_transactions'.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status, metadata, id: transactionId, amount } = body.data || {};

    if (status === 'successful') {
      const { userId, courseId, affiliateId } = metadata || {};

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

      // 3. LOGIQUE AMBASSADEUR SÉCURISÉE (PENDING 14 JOURS)
      if (affiliateId && settings?.commercial?.affiliateEnabled) {
          const affiliateRef = db.collection('users').doc(affiliateId);
          const affDoc = await affiliateRef.get();
          const affData = affDoc.data();
          const currentSales = affData?.affiliateStats?.sales || 0;

          let basePerc = settings.commercial.affiliatePercentage || 10;
          
          // Bonus Tiers Logic
          if (currentSales >= 50) basePerc += 10;
          else if (currentSales >= 20) basePerc += 5;
          else if (currentSales >= 5) basePerc += 2;

          const affCommission = (amount * basePerc) / 100;
          
          // Création de la transaction d'affiliation sécurisée
          const affTransRef = db.collection('affiliate_transactions').doc();
          const unlockDate = new Date();
          unlockDate.setDate(unlockDate.getDate() + 14); // Geler pendant 14 jours

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

          // Mise à jour des compteurs (On incrémente le SOLDE EN ATTENTE)
          batch.update(affiliateRef, {
              pendingAffiliateBalance: FieldValue.increment(affCommission),
              'affiliateStats.sales': FieldValue.increment(1),
              'affiliateStats.earnings': FieldValue.increment(affCommission)
          });

          await sendUserNotification(affiliateId, {
              text: `Nouvelle vente ! +${affCommission.toLocaleString('fr-FR')} XOF en attente de sécurisation (14j).`,
              type: 'info',
              link: '/student/ambassadeur'
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
                  text: `Gain parrainage : +${refCommission.toLocaleString('fr-FR')} XOF sur une vente de votre filleul.`,
                  type: 'success',
                  link: '/instructor/dashboard'
              });
          }
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
