
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Course } from '@/lib/types';
import { z } from 'zod';

/**
 * @fileOverview Actions serveur pour les instructeurs.
 * Gère la création et la mise à jour des cours.
 */

const CourseFormSchema = z.object({
  title: z.string().min(5, "Le titre doit faire au moins 5 caractères."),
  description: z.string().min(20, "La description doit faire au moins 20 caractères."),
  price: z.coerce.number().min(0, "Le prix ne peut être négatif."),
  category: z.string().min(3, "La catégorie est requise."),
  imageUrl: z.string().url("L'URL de l'image est invalide.").optional().or(z.literal('')),
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
      console.error("ADMIN_DB_NULL: La connexion à Firestore Admin a échoué.");
      return { success: false, message: 'Le service de base de données est indisponible.' };
  }

  try {
    const newCourseRef = adminDb.collection('courses').doc();
    
    // Nettoyage de l'URL si vide
    const imageUrl = validatedFields.data.imageUrl || null;

    const newCourse = {
      ...validatedFields.data,
      imageUrl,
      id: newCourseRef.id,
      courseId: newCourseRef.id, // Pour la compatibilité avec le schéma required
      instructorId,
      status: 'Draft',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      currency: 'XOF'
    };
    
    await newCourseRef.set(newCourse);
    
    return { success: true, courseId: newCourseRef.id };
  } catch (error: any) {
    console.error("CREATE_COURSE_ERROR:", error.message);
    return { success: false, message: 'Erreur technique lors de la création. Vérifiez les champs.' };
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
        return { success: false, message: 'Le service de base de données est indisponible.' };
    }

    try {
        const courseRef = adminDb.collection('courses').doc(courseId);
        const dataToUpdate = {
            ...validatedFields.data,
            imageUrl: validatedFields.data.imageUrl || null,
            updatedAt: FieldValue.serverTimestamp(),
        };

        await courseRef.update(dataToUpdate);
        
        return { success: true };
    } catch (error: any) {
        console.error("UPDATE_COURSE_ERROR:", error.message);
        return { success: false, message: 'Une erreur est survenue lors de la mise à jour.' };
    }
}
