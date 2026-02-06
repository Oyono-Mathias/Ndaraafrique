
'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Course } from '@/lib/types';
import { z } from 'zod';

/**
 * @fileOverview Actions serveur pour les instructeurs.
 * Gère la création et la mise à jour des cours avec une gestion d'erreurs précise.
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
      message: 'Certains champs sont invalides ou manquants.',
    };
  }
  
  try {
    const db = getAdminDb();
    if (!db) {
        return { success: false, message: "La base de données n'est pas connectée. Vérifiez vos clés Firebase Admin." };
    }

    const newCourseRef = db.collection('courses').doc();
    
    // Nettoyage rigoureux des données pour Firestore
    const data = validatedFields.data;
    const finalImageUrl = (data.imageUrl && data.imageUrl.startsWith('http')) ? data.imageUrl : null;

    const newCoursePayload = {
      title: data.title,
      description: data.description,
      price: data.price,
      category: data.category,
      imageUrl: finalImageUrl,
      id: newCourseRef.id,
      courseId: newCourseRef.id,
      instructorId: instructorId,
      status: 'Draft',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      currency: 'XOF',
      learningObjectives: [],
      participantsCount: 0
    };
    
    await newCourseRef.set(newCoursePayload);
    
    console.log(`Course Created Successfully: ${newCourseRef.id} by ${instructorId}`);
    
    return { success: true, courseId: newCourseRef.id };
  } catch (error: any) {
    console.error("CREATE_COURSE_CRITICAL_ERROR:", error);
    return { 
      success: false, 
      message: `Erreur serveur lors de l'enregistrement : ${error.message}. Vérifiez que les services Firebase (Firestore & Storage) sont activés.` 
    };
  }
}


export async function updateCourseAction({ courseId, formData }: { courseId: string, formData: unknown }) {
    const validatedFields = CourseFormSchema.safeParse(formData);

    if (!validatedFields.success) {
        return {
            success: false,
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Données invalides.',
        };
    }

    try {
        const db = getAdminDb();
        const courseRef = db.collection('courses').doc(courseId);
        
        const data = validatedFields.data;
        const finalImageUrl = (data.imageUrl && data.imageUrl.startsWith('http')) ? data.imageUrl : null;

        await courseRef.update({
            title: data.title,
            description: data.description,
            price: data.price,
            category: data.category,
            imageUrl: finalImageUrl,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true };
    } catch (error: any) {
        console.error("UPDATE_COURSE_ERROR:", error);
        return { success: false, message: 'Impossible de mettre à jour le cours.' };
    }
}
