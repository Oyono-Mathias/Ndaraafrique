'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getStorage } from 'firebase-admin/storage';

const resourceSchema = z.object({
  title: z.string().min(3, "Le titre est requis."),
  courseId: z.string().min(1, "Veuillez sélectionner un cours."),
  url: z.string().url("L'URL de la ressource est invalide."),
  type: z.enum(['pdf', 'video', 'image', 'link', 'file']),
});

export async function createResourceAction({ formData, instructorId }: { formData: unknown, instructorId: string }) {
  const validatedFields = resourceSchema.safeParse(formData);

  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.flatten().fieldErrors };
  }
  
  try {
    const db = getAdminDb();
    const newResourceRef = db.collection('resources').doc();
    await newResourceRef.set({
      ...validatedFields.data,
      instructorId,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    return { success: true, resourceId: newResourceRef.id };
  } catch (error: any) {
    return { success: false, error: 'Une erreur est survenue lors de l\'ajout de la ressource.' };
  }
}

export async function deleteResourceAction({ resourceId, instructorId }: { resourceId: string, instructorId: string }) {
  try {
    const db = getAdminDb();
    const resourceRef = db.collection('resources').doc(resourceId);
    const resourceDoc = await resourceRef.get();

    if (!resourceDoc.exists || resourceDoc.data()?.instructorId !== instructorId) {
      return { success: false, error: 'Permission refusée ou ressource introuvable.' };
    }
    
    const resourceData = resourceDoc.data();
    if (resourceData?.url && resourceData?.type !== 'link') {
        try {
            const fileUrl = new URL(resourceData.url);
            const path = decodeURIComponent(fileUrl.pathname.split('/o/')[1].split('?')[0]);
            await getStorage().bucket().file(path).delete();
        } catch(e) {
            console.warn(`Could not delete file from storage: ${resourceData.url}`, e);
        }
    }

    await resourceRef.delete();
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Une erreur est survenue lors de la suppression.' };
  }
}
