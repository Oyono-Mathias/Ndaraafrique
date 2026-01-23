
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { Lecture } from '@/lib/types';
import { getStorage } from 'firebase-admin/storage';

const lectureSchema = z.object({
  title: z.string().min(3, "Le titre est requis."),
  type: z.enum(['video', 'text', 'pdf']),
  contentUrl: z.string().url().optional(),
  textContent: z.string().optional(),
  duration: z.coerce.number().min(0).optional(),
});

export async function createLecture({ courseId, sectionId, formData }: { courseId: string; sectionId: string; formData: any }) {
  const validatedFields = lectureSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.flatten().fieldErrors };
  }
  if (!adminDb) return { success: false, error: "Service indisponible" };
  try {
    const sectionRef = adminDb.collection('courses').doc(courseId).collection('sections').doc(sectionId);
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
    return { success: false, error: error.message };
  }
}

export async function updateLecture({ courseId, sectionId, lectureId, formData }: { courseId: string; sectionId: string; lectureId: string; formData: any }) {
    const validatedFields = lectureSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { success: false, error: validatedFields.error.flatten().fieldErrors };
    }
    if (!adminDb) return { success: false, error: "Service indisponible" };
    try {
        const lectureRef = adminDb.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('lectures').doc(lectureId);
        await lectureRef.update({
            ...validatedFields.data,
            updatedAt: FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function deleteLecture({ courseId, sectionId, lectureId }: { courseId: string, sectionId: string, lectureId: string }) {
    if (!adminDb) return { success: false, error: "Service indisponible" };
    try {
        const lectureRef = adminDb.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('lectures').doc(lectureId);
        const lectureDoc = await lectureRef.get();
        if(!lectureDoc.exists) return { success: false, error: "Leçon introuvable" };
        
        const data = lectureDoc.data() as Lecture;
        if(data.contentUrl && data.type !== 'text'){
            try {
                const fileUrl = new URL(data.contentUrl);
                const path = decodeURIComponent(fileUrl.pathname.split('/o/')[1].split('?')[0]);
                await getStorage().bucket().file(path).delete();
            } catch(e) {
                console.warn(`Could not delete file from storage: ${data.contentUrl}`, e);
            }
        }
        await lectureRef.delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function reorderLectures({ courseId, sectionId, orderedLectures }: { courseId: string, sectionId: string, orderedLectures: { id: string, order: number }[] }) {
    if (!adminDb) return { success: false, error: "Service indisponible" };
    try {
        const batch = adminDb.batch();
        const lecturesRef = adminDb.collection('courses').doc(courseId).collection('sections').doc(sectionId).collection('lectures');
        orderedLectures.forEach(lecture => {
            const docRef = lecturesRef.doc(lecture.id);
            batch.update(docRef, { order: lecture.order });
        });
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}