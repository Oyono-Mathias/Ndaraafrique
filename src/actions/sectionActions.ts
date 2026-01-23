
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function createSection({ courseId, title }: { courseId: string; title: string }) {
    if (!adminDb) {
        return { success: false, error: 'Service indisponible' };
    }
    try {
        const courseRef = adminDb.collection('courses').doc(courseId);
        const sectionsQuery = await courseRef.collection('sections').orderBy('order', 'desc').limit(1).get();
        const lastOrder = sectionsQuery.empty ? -1 : sectionsQuery.docs[0].data().order;

        const newSectionRef = courseRef.collection('sections').doc();
        await newSectionRef.set({
            title: title,
            order: lastOrder + 1,
            createdAt: FieldValue.serverTimestamp(),
        });

        return { success: true, sectionId: newSectionRef.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateSectionTitle({ courseId, sectionId, title }: { courseId: string; sectionId: string; title: string }) {
    if (!adminDb) {
        return { success: false, error: 'Service indisponible' };
    }
    try {
        const sectionRef = adminDb.collection('courses').doc(courseId).collection('sections').doc(sectionId);
        await sectionRef.update({ title: title });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSection({ courseId, sectionId }: { courseId: string; sectionId: string }) {
    if (!adminDb) {
        return { success: false, error: 'Service indisponible' };
    }
    try {
        // IMPORTANT: In a production app, deleting subcollections should be handled by a Cloud Function.
        // This is a "best effort" deletion from the server action.
        const sectionRef = adminDb.collection('courses').doc(courseId).collection('sections').doc(sectionId);
        const lecturesSnapshot = await sectionRef.collection('lectures').get();
        
        const batch = adminDb.batch();
        lecturesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        batch.delete(sectionRef);

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function reorderSections({ courseId, orderedSections }: { courseId: string, orderedSections: { id: string, order: number }[] }) {
    if (!adminDb) {
        return { success: false, error: 'Service indisponible' };
    }
    try {
        const batch = adminDb.batch();
        const sectionsRef = adminDb.collection('courses').doc(courseId).collection('sections');
        
        orderedSections.forEach(section => {
            const docRef = sectionsRef.doc(section.id);
            batch.update(docRef, { order: section.order });
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}