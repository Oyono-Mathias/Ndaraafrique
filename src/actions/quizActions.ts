
'use server';
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const quizSchema = z.object({
  title: z.string().min(3, "Le titre est requis."),
  description: z.string().optional(),
});

export async function createQuiz({ courseId, sectionId, formData }: { courseId: string; sectionId: string; formData: unknown }) {
  const validatedFields = quizSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.flatten().fieldErrors };
  }
  if (!adminDb) return { success: false, error: "Service indisponible" };
  try {
    const newQuizRef = adminDb.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('quizzes').doc();
    await newQuizRef.set({
      ...validatedFields.data,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true, quizId: newQuizRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateQuiz({ courseId, sectionId, quizId, formData }: { courseId: string; sectionId: string; quizId: string; formData: unknown }) {
  const validatedFields = quizSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.flatten().fieldErrors };
  }
  if (!adminDb) return { success: false, error: "Service indisponible" };
  try {
    const quizRef = adminDb.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('quizzes').doc(quizId);
    await quizRef.update({
      ...validatedFields.data,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteQuiz({ courseId, sectionId, quizId }: { courseId: string; sectionId: string; quizId: string }) {
  if (!adminDb) return { success: false, error: "Service indisponible" };
  const batch = adminDb.batch();
  try {
    const quizRef = adminDb.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('quizzes').doc(quizId);
    const questionsSnapshot = await quizRef.collection('questions').get();
    questionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(quizRef);
    await batch.commit();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
