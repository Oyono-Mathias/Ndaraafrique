
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Course } from '@/lib/types';
import { z } from 'zod';

const CourseFormSchema = z.object({
  title: z.string().min(5, "Le titre doit faire au moins 5 caractères."),
  description: z.string().min(20, "La description doit faire au moins 20 caractères."),
  price: z.coerce.number().min(0, "Le prix ne peut être négatif."),
  category: z.string().min(3, "La catégorie est requise."),
  thumbnailUrl: z.string().url("L'URL de l'image est invalide.").optional(),
});

export async function createCourseAction({ formData, instructorId }: { formData: unknown, instructorId: string }) {
  const validatedFields = CourseFormSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Champs manquants ou invalides.',
    };
  }
  
  if (!adminDb) {
      return { success: false, message: 'Service indisponible' };
  }

  try {
    const newCourseRef = adminDb.collection('courses').doc();
    const newCourse: Partial<Course> = {
      ...validatedFields.data,
      instructorId,
      status: 'Draft',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      currency: 'XOF'
    };
    
    await newCourseRef.set(newCourse);
    
    return { success: true, courseId: newCourseRef.id };
  } catch (error) {
    return { success: false, message: 'Une erreur est survenue lors de la création du cours.' };
  }
}


export async function updateCourseAction({ courseId, formData }: { courseId: string, formData: unknown }) {
    const validatedFields = CourseFormSchema.safeParse(formData);

    if (!validatedFields.success) {
        return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Champs manquants ou invalides.',
        };
    }

    if (!adminDb) {
        return { success: false, message: 'Service indisponible' };
    }

    try {
        const courseRef = adminDb.collection('courses').doc(courseId);
        const dataToUpdate: Partial<Course> = {
            ...validatedFields.data,
            updatedAt: FieldValue.serverTimestamp(),
        };

        await courseRef.update(dataToUpdate);
        
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Une erreur est survenue lors de la mise à jour.' };
    }
}
