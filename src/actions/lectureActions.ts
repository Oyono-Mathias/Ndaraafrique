'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
// ❌ Supprimé car absent de @/lib/types : import type { Lecture } from '@/lib/types';
import { deleteBunnyVideo } from './bunnyActions';

/**
 * ✅ RÉSOLU : Interface locale pour bypasser l'erreur d'exportation de @/lib/types
 */
interface LocalLecture {
  id: string;
  title: string;
  type: 'video' | 'youtube' | 'text' | 'pdf';
  contentUrl: string;
  textContent?: string;
  duration?: number;
  order: number;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * @fileOverview Actions pour la gestion des leçons avec suppression synchronisée Bunny Stream.
 */

const lectureSchema = z.object({
  title: z.string().min(3, "Le titre est requis."),
  type: z.enum(['video', 'youtube', 'text', 'pdf']),
  contentUrl: z.string().min(1, "L'identifiant ou l'URL est requis."),
  textContent: z.string().optional(),
  duration: z.coerce.number().min(0).optional(),
});

export async function createLecture({ courseId, sectionId, formData }: { courseId: string; sectionId: string; formData: any }) {
  const validatedFields = lectureSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { success: false, error: "error.invalid_fields" };
  }
  
  try {
    const db = getAdminDb();
    const sectionRef = db.collection('courses').doc(courseId).collection('sections').doc(sectionId);
    const lecturesQuery = await sectionRef.collection('lectures').orderBy('order', 'desc').limit(1).get();
    const lastOrder = lecturesQuery.empty ? -1 : lecturesQuery.docs[0].data().order;

    const newLectureRef = sectionRef.collection('lectures').doc();
    await newLectureRef.set({
      ...validatedFields.data,
      order: lastOrder + 1,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true, lectureId: newLectureRef.id };
  } catch (error: any) {
    return { success: false, error: 'error.save_failed' };
  }
}

export async function updateLecture({ courseId, sectionId, lectureId, formData }: { courseId: string; sectionId: string; lectureId: string; formData: any }) {
    const validatedFields = lectureSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { success: false, error: 'error.invalid_fields' };
    }
    
    try {
        const db = getAdminDb();
        const lectureRef = db.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('lectures').doc(lectureId);
        await lectureRef.update({
            ...validatedFields.data,
            updatedAt: FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'error.save_failed' };
    }
}

export async function deleteLecture({ courseId, sectionId, lectureId }: { courseId: string, sectionId: string, lectureId: string }) {
    try {
        const db = getAdminDb();
        const lectureRef = db.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('lectures').doc(lectureId);
        const lectureDoc = await lectureRef.get();
        
        if (!lectureDoc.exists) return { success: false, error: "error.not_found" };
        
        // ✅ Utilisation du type local
        const lectureData = lectureDoc.data() as LocalLecture;

        // 1. Si c'est une vidéo Bunny, on lance la suppression chez Bunny.net
        if (lectureData.type === 'video' && lectureData.contentUrl) {
            deleteBunnyVideo(lectureData.contentUrl).catch(err => 
                console.warn(`Bunny deletion failed for ${lectureData.contentUrl}, skipping.`, err)
            );
        }

        // 2. Suppression de la leçon dans Firestore
        await lectureRef.delete();
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'error.delete_failed' };
    }
}

export async function reorderLectures({ courseId, sectionId, orderedLectures }: { courseId: string, sectionId: string, orderedLectures: { id: string, order: number }[] }) {
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const lecturesRef = db.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('lectures');
        orderedLectures.forEach(lecture => {
            const docRef = lecturesRef.doc(lecture.id);
            batch.update(docRef, { order: lecture.order });
        });
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'error.generic' };
    }
}
