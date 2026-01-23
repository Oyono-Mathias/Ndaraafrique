
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface GradeSubmissionParams {
  submissionId: string;
  grade: number;
  feedback: string;
  studentId: string;
  courseName: string;
}

export async function gradeSubmissionAction({
  submissionId,
  grade,
  feedback,
  studentId,
  courseName,
}: GradeSubmissionParams): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'Service indisponible.' };
  }

  try {
    const batch = adminDb.batch();

    // The collection is named 'devoirs' as per the user's mental model in the prompt
    const submissionRef = adminDb.collection('devoirs').doc(submissionId);
    batch.update(submissionRef, {
      grade,
      feedback,
      status: 'graded',
      gradedAt: FieldValue.serverTimestamp(),
    });

    // Add to student's activity feed
    const activityRef = adminDb.collection('users').doc(studentId).collection('activity').doc();
    batch.set(activityRef, {
        userId: studentId,
        type: 'assignment',
        title: `Votre devoir pour "${courseName}" a été noté !`,
        description: `Vous avez obtenu la note de ${grade}/20.`,
        link: `/student/mes-devoirs`,
        read: false,
        createdAt: FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error('Error grading submission:', error);
    return { success: false, error: 'Une erreur est survenue lors de la notation.' };
  }
}
