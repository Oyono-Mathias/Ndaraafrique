'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendUserNotification } from '@/actions/notificationActions';

/**
 * @fileOverview Actions pour la réponse aux questions (version sécurisée pour le build).
 */

interface AnswerQuestionParams {
  questionId: string;
  answerText: string;
  instructorId: string;
  studentId: string;
}

export async function answerQuestionAction({
  questionId,
  answerText,
  instructorId,
  studentId,
}: AnswerQuestionParams): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const questionRef = db.collection('questions').doc(questionId);
    const questionDoc = await questionRef.get();

    if (!questionDoc.exists) {
      return { success: false, error: 'Question introuvable.' };
    }
    
    if (questionDoc.data()?.instructorId !== instructorId) {
      return { success: false, error: 'Permission refusée. Vous n\'êtes pas l\'instructeur de ce cours.' };
    }

    const batch = db.batch();

    batch.update(questionRef, {
      answerText,
      status: 'answered',
      answeredAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    
    await sendUserNotification(studentId, {
      text: `Un instructeur a répondu à votre question sur le cours "${questionDoc.data()?.courseTitle}".`,
      link: `/student/mes-questions`,
      type: 'success'
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error answering question:', error);
    return { success: false, error: 'Une erreur est survenue lors de la publication de la réponse.' };
  }
}
