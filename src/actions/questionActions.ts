'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const questionSchema = z.object({
  text: z.string().min(3, "Le texte de la question est requis."),
  options: z.array(z.object({ text: z.string().min(1), isCorrect: z.boolean() }))
    .min(2, "Au moins deux options sont requises.")
    .refine(options => options.some(opt => opt.isCorrect), {
      message: "Au moins une option doit être marquée comme correcte.",
    }),
});

export async function createQuestion({ courseId, sectionId, quizId, formData }: { courseId: string; sectionId: string; quizId: string; formData: unknown }) {
    const validatedFields = questionSchema.safeParse(formData);
    if (!validatedFields.success) {
      return { success: false, error: validatedFields.error.flatten().fieldErrors };
    }
    
    try {
      const db = getAdminDb();
      const questionsRef = db.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('quizzes').doc(quizId).collection('questions');
      const q = await questionsRef.orderBy('order', 'desc').limit(1).get();
      const lastOrder = q.empty ? -1 : q.docs[0].data().order;

      const newQuestionRef = questionsRef.doc();
      await newQuestionRef.set({
        ...validatedFields.data,
        order: lastOrder + 1,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { success: true, questionId: newQuestionRef.id };
    } catch (error: any) {
      console.error("Error creating question:", error);
      return { success: false, error: error.message };
    }
}

export async function updateQuestion({ courseId, sectionId, quizId, questionId, formData }: { courseId: string; sectionId: string; quizId: string; questionId: string; formData: unknown }) {
    const validatedFields = questionSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { success: false, error: validatedFields.error.flatten().fieldErrors };
    }
    
    try {
        const db = getAdminDb();
        const questionRef = db.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('quizzes').doc(quizId).collection('questions').doc(questionId);
        await questionRef.update({
            ...validatedFields.data,
            updatedAt: FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating question:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteQuestion({ courseId, sectionId, quizId, questionId }: { courseId: string; sectionId: string; quizId: string; questionId: string }) {
    try {
        const db = getAdminDb();
        const questionRef = db.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('quizzes').doc(quizId).collection('questions').doc(questionId);
        await questionRef.delete();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting question:", error);
        return { success: false, error: error.message };
    }
}

export async function reorderQuestions({ courseId, sectionId, quizId, orderedQuestions }: { courseId: string; sectionId: string; quizId: string; orderedQuestions: { id: string, order: number }[] }) {
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const questionsRef = db.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('quizzes').doc(quizId).collection('questions');
        orderedQuestions.forEach(q => {
            batch.update(questionsRef.doc(q.id), { order: q.order });
        });
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error reordering questions:", error);
        return { success: false, error: error.message };
    }
}
