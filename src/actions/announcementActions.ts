
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendUserNotification } from './notificationActions';

interface SendAnnouncementParams {
  courseId: string;
  instructorId: string;
  title: string;
  message: string;
}

export async function sendCourseAnnouncement({ courseId, instructorId, title, message }: SendAnnouncementParams): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: 'Service indisponible' };

  try {
    const courseRef = adminDb.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) {
      return { success: false, error: 'Cours introuvable.' };
    }

    if (courseDoc.data()?.instructorId !== instructorId) {
      return { success: false, error: 'Vous n\'êtes pas autorisé à envoyer des annonces pour ce cours.' };
    }

    const batch = adminDb.batch();

    // 1. Save the announcement
    const announcementRef = courseRef.collection('announcements').doc();
    batch.set(announcementRef, {
      courseId,
      instructorId,
      title,
      message,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 2. Find all enrolled students
    const enrollmentsQuery = adminDb.collection('enrollments').where('courseId', '==', courseId);
    const enrollmentsSnapshot = await enrollmentsQuery.get();
    
    if (enrollmentsSnapshot.empty) {
      // No students enrolled, but the announcement is still saved.
      await batch.commit();
      return { success: true };
    }

    const studentIds = enrollmentsSnapshot.docs.map(doc => doc.data().studentId);
    
    // 3. Create a notification for each student
    const notificationPromises: Promise<any>[] = [];

    studentIds.forEach(studentId => {
        notificationPromises.push(sendUserNotification(studentId, {
            text: `Annonce pour le cours "${courseDoc.data()?.title}": ${title}`,
            link: `/courses/${courseId}`
        }));
    });
    
    await Promise.all([batch.commit(), ...notificationPromises]);
    
    return { success: true };

  } catch (error: any) {
    console.error("Error sending course announcement:", error);
    return { success: false, error: 'Une erreur est survenue lors de l\'envoi de l\'annonce.' };
  }
}
