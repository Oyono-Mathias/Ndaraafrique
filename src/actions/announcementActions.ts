'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendUserNotification } from './notificationActions';

/**
 * @fileOverview Actions pour la diffusion d'annonces aux étudiants.
 */

interface SendAnnouncementParams {
  courseId: string;
  courseTitle: string;
  instructorId: string;
  title: string;
  message: string;
}

export async function sendCourseAnnouncement({ courseId, courseTitle, instructorId, title, message }: SendAnnouncementParams): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    
    // 1. Enregistrer l'annonce dans la collection racine 'course_announcements'
    const announcementRef = db.collection('course_announcements').doc();
    await announcementRef.set({
      id: announcementRef.id,
      courseId,
      courseTitle,
      instructorId,
      title,
      message,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 2. Trouver tous les étudiants inscrits à ce cours
    const enrollmentsSnapshot = await db.collection('enrollments')
        .where('courseId', '==', courseId)
        .get();
    
    if (!enrollmentsSnapshot.empty) {
        const studentIds = enrollmentsSnapshot.docs.map(doc => doc.data().studentId);
        
        // 3. Envoyer une notification à chaque étudiant
        const notificationPromises = studentIds.map(studentId => 
            sendUserNotification(studentId, {
                text: `Annonce : "${title}" (Cours: ${courseTitle})`,
                link: `/student/courses/${courseId}`,
                type: 'info'
            })
        );
        
        await Promise.all(notificationPromises);
    }
    
    return { success: true };

  } catch (error: any) {
    console.error("Error sending course announcement:", error);
    return { success: false, error: 'error.generic' };
  }
}