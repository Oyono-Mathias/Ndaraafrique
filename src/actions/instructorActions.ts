'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { Settings, NdaraUser } from '@/lib/types';

/**
 * @fileOverview Actions serveur pour les instructeurs.
 * ✅ RÉSOLU : Alignement strict sur la nouvelle structure Settings v3.0 (12 Modules).
 * ✅ EXPORT : updateCourseAction inclus pour corriger l'erreur de build.
 */

const CourseFormSchema = z.object({
  title: z.string().min(5, "Le titre doit faire au moins 5 caractères."),
  description: z.string().min(20, "La description doit faire au moins 20 caractères."),
  price: z.coerce.number().min(0, "Le prix ne peut être négatif."),
  category: z.string().min(3, "La catégorie est requise."),
  imageUrl: z.string().min(1, "L'image est obligatoire."),
});

export async function createCourseAction({ formData, instructorId }: { formData: unknown, instructorId: string }) {
  const validatedFields = CourseFormSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'error.invalid_fields',
    };
  }
  
  try {
    const db = getAdminDb();
    
    // 🛡️ VÉRIFICATION DES RESTRICTIONS UTILISATEUR
    const userDoc = await db.collection('users').doc(instructorId).get();
    const userData = userDoc.data() as NdaraUser;
    if (userData.restrictions?.canSellCourse === false) {
        return { success: false, message: "RESTRICTED: Votre droit de création et de vente de formations est suspendu." };
    }

    // 1. Charger les réglages de la plateforme
    const settingsSnap = await db.collection('settings').doc('global').get();
    const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;

    const { price } = validatedFields.data;

    // 🛡️ VÉRIFICATION DES PRIX (Alignement sur module 'courses')
    const minPrice = settings.courses?.minimumCoursePrice ?? 0;
    const maxPrice = 2000000; // Limite haute de sécurité
    const allowFree = settings.courses?.allowCourseCreation ?? true;

    if (price === 0 && !allowFree) {
        return { success: false, message: "Les cours gratuits sont actuellement désactivés." };
    }

    if (price > 0 && price < minPrice) {
        return { success: false, message: `Le prix minimum autorisé est de ${minPrice.toLocaleString()} XOF.` };
    }

    if (price > maxPrice) {
        return { success: false, message: `Le prix maximum autorisé est de ${maxPrice.toLocaleString()} XOF.` };
    }

    // 🛡️ VÉRIFICATION DES LIMITES (Alignement sur module 'users')
    const maxCourses = settings.users?.maxAccountsPerUser ?? 50; 
    const existingCoursesSnap = await db.collection('courses').where('instructorId', '==', instructorId).count().get();
    
    if (existingCoursesSnap.data().count >= maxCourses) {
        return { success: false, message: `Limite maximale de ${maxCourses} formations atteinte.` };
    }

    const newCourseRef = db.collection('courses').doc();
    const data = validatedFields.data;

    const newCoursePayload = {
      title: data.title,
      description: data.description,
      price: data.price,
      category: data.category,
      imageUrl: data.imageUrl,
      id: newCourseRef.id,
      courseId: newCourseRef.id,
      creatorId: instructorId,
      ownerId: instructorId,
      instructorId: instructorId,
      status: settings.courses?.requireAdminApproval ? 'Pending Review' : 'Published',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      currency: settings.payments?.currency || 'XOF',
      learningObjectives: [],
      participantsCount: 0
    };
    
    await newCourseRef.set(newCoursePayload);
    
    return { success: true, courseId: newCourseRef.id };
  } catch (error: any) {
    console.error("Create Course Error:", error);
    return { success: false, message: 'error.save_failed' };
  }
}

/**
 * Met à jour un cours existant
 */
export async function updateCourseAction({ courseId, formData }: { courseId: string, formData: unknown }) {
    const validatedFields = CourseFormSchema.safeParse(formData);

    if (!validatedFields.success) {
        return {
            success: false,
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'error.invalid_fields',
        };
    }

    try {
        const db = getAdminDb();
        const courseRef = db.collection('courses').doc(courseId);
        
        const data = validatedFields.data;

        await courseRef.update({
            title: data.title,
            description: data.description,
            price: data.price,
            category: data.category,
            imageUrl: data.imageUrl,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true };
    } catch (error: any) {
        console.error("Update Course Error:", error);
        return { success: false, message: 'error.save_failed' };
    }
}
