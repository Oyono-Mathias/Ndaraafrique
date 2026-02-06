
'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
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
  imageUrl: z.string().min(1, "L'image est obligatoire."),
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
    
    let userMessage = `Erreur lors de l'enregistrement : ${error.message}`;
    if (error.message.includes('ADMIN_SDK_NOT_INITIALIZED')) {
        userMessage = "Le serveur n'est pas encore prêt. Assurez-vous d'avoir configuré la variable FIREBASE_SERVICE_ACCOUNT_KEY.";
    } else if (error.message.includes('permission-denied')) {
        userMessage = "Accès refusé à la base de données. Vérifiez les permissions de votre compte de service.";
    }

    return { 
      success: false, 
      message: userMessage 
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
        console.error("UPDATE_COURSE_ERROR:", error);
        return { success: false, message: `Erreur lors de la mise à jour : ${error.message}` };
    }
}
