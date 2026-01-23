
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getStorage } from 'firebase-admin/storage';

const assignmentSchema = z.object({
  title: z.string().min(3, "Le titre est requis."),
  description: z.string().optional(),
  correctionGuide: z.string().optional(),
  dueDate: z.date().optional(),
  attachments: z.array(z.object({ name: z.string(), url: z.string().url() })).optional(),
});


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

export async function createAssignment({ courseId, sectionId, formData }: { courseId: string; sectionId: string; formData: any }) {
    const validatedFields = assignmentSchema.safeParse(formData);
    if (!validatedFields.success) {
      return { success: false, error: validatedFields.error.flatten().fieldErrors };
    }
    if (!adminDb) return { success: false, error: "Service indisponible" };
    try {
      const newAssignmentRef = adminDb.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('assignments').doc();
      await newAssignmentRef.set({
        ...validatedFields.data,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { success: true, assignmentId: newAssignmentRef.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
}

export async function updateAssignment({ courseId, sectionId, assignmentId, formData }: { courseId: string; sectionId: string; assignmentId: string; formData: any }) {
    const validatedFields = assignmentSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { success: false, error: validatedFields.error.flatten().fieldErrors };
    }
    if (!adminDb) return { success: false, error: "Service indisponible" };
    try {
        const assignmentRef = adminDb.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('assignments').doc(assignmentId);
        await assignmentRef.update({
            ...validatedFields.data,
            updatedAt: FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteAssignment({ courseId, sectionId, assignmentId }: { courseId: string, sectionId: string, assignmentId: string }) {
    if (!adminDb) return { success: false, error: "Service indisponible" };
    try {
        const assignmentRef = adminDb.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('assignments').doc(assignmentId);
        await assignmentRef.delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
