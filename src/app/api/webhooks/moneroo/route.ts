import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendUserNotification } from '@/actions/notificationActions';

/**
 * @fileOverview Webhook pour recevoir les notifications de paiement de Moneroo.
 * Active automatiquement le cours pour l'étudiant et envoie une notification de succès.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Structure type Moneroo : body.data.status, body.data.metadata
    const { status, metadata, id: transactionId, amount, currency_code } = body.data || {};

    if (status === 'successful') {
      const { userId, courseId } = metadata || {};

      if (!userId || !courseId) {
        console.error('Moneroo Webhook: Missing metadata', metadata);
        return NextResponse.json({ error: 'Missing metadata in transaction' }, { status: 400 });
      }

      const db = getAdminDb();
      const enrollmentId = `${userId}_${courseId}`;
      
      // 1. Récupération des infos du cours pour enrichir l'inscription
      const courseDoc = await db.collection('courses').doc(courseId).get();
      const courseData = courseDoc.data();

      // 2. Création/Mise à jour de l'inscription
      const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
      await enrollmentRef.set({
        studentId: userId,
        courseId: courseId,
        instructorId: courseData?.instructorId || '',
        status: 'active', // Passage au statut actif
        enrollmentDate: FieldValue.serverTimestamp(),
        lastAccessedAt: FieldValue.serverTimestamp(),
        progress: 0,
        priceAtEnrollment: amount || 0,
        currency: currency_code || 'XOF',
        transactionId: transactionId,
        enrollmentType: 'paid'
      }, { merge: true });

      // 3. Notification In-App de succès
      await sendUserNotification(userId, {
        text: `Bienvenue dans la famille Ndara ! Votre formation "${courseData?.title || 'demandée'}" est maintenant débloquée.`,
        link: `/student/courses/${courseId}`,
        type: 'success'
      });

      // 4. Log de l'activité
      const activityRef = db.collection('users').doc(userId).collection('activity').doc();
      await activityRef.set({
        userId,
        type: 'enrollment',
        title: 'Nouvelle formation débloquée',
        description: `Vous avez rejoint "${courseData?.title}"`,
        link: `/student/courses/${courseId}`,
        read: false,
        createdAt: FieldValue.serverTimestamp()
      });

      console.log(`Moneroo Webhook: Enrollment ${enrollmentId} activated successfully.`);
      return NextResponse.json({ received: true, activated: true });
    }

    console.log(`Moneroo Webhook: Transaction ${transactionId} received with status ${status}. No action taken.`);
    return NextResponse.json({ received: true, activated: false });

  } catch (error: any) {
    console.error('Moneroo Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
