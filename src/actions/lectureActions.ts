'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { Lecture } from '@/lib/types';

/**
 * @fileOverview Actions pour la gestion des leçons.
 * Corrigé pour accepter les IDs Bunny (GUID) et les liens YouTube.
 */

function handleServerError(error: any) {
    console.error("Server Action Error (Lecture):", error);
    const msg = error.message || "";
    if (msg.includes("CONFIGURATION_SERVEUR_INCOMPLETE")) {
        return "Configuration serveur incomplète (Clé API manquante).";
    }
    return "Erreur lors de la gestion de la leçon : " + msg;
}

// Schéma assoupli pour accepter GUID Bunny et URL YouTube
const lectureSchema = z.object({
  title: z.string().min(3, "Le titre est requis (min 3 caract.)."),
  type: z.enum(['video', 'youtube', 'text', 'pdf']),
  contentUrl: z.string().min(1, "L'identifiant ou l'URL est requis."),
  textContent: z.string().optional(),
  duration: z.coerce.number().min(0).optional(),
});

export async function createLecture({ courseId, sectionId, formData }: { courseId: string; sectionId: string; formData: any }) {
  const validatedFields = lectureSchema.safeParse(formData);
  if (!validatedFields.success) {
    // Retourne la première erreur de validation sous forme de chaîne
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || "Données invalides" };
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
    return { success: false, error: handleServerError(error) };
  }
}

export async function updateLecture({ courseId, sectionId, lectureId, formData }: { courseId: string; sectionId: string; lectureId: string; formData: any }) {
    const validatedFields = lectureSchema.safeParse(formData);
    if (!validatedFields.success) {
        const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, error: firstError || "Données invalides" };
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
        return { success: false, error: handleServerError(error) };
    }
}

export async function deleteLecture({ courseId, sectionId, lectureId }: { courseId: string, sectionId: string, lectureId: string }) {
    try {
        const db = getAdminDb();
        const lectureRef = db.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('lectures').doc(lectureId);
        const lectureDoc = await lectureRef.get();
        if(!lectureDoc.exists) return { success: false, error: "Leçon introuvable" };
        
        await lectureRef.delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: handleServerError(error) };
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
        return { success: false, error: handleServerError(error) };
    }
}
