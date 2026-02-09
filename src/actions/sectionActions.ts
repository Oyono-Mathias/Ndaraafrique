'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Actions pour la gestion des sections de cours.
 */

export async function createSection({ courseId, title }: { courseId: string; title: string }) {
    try {
        const db = getAdminDb();
        const courseRef = db.collection('courses').doc(courseId);
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
        console.error("Error creating section:", error);
        return { success: false, error: error.message || "Impossible de créer la section." };
    }
}

export async function updateSectionTitle({ courseId, sectionId, title }: { courseId: string; sectionId: string; title: string }) {
    try {
        const db = getAdminDb();
        const sectionRef = db.collection('courses').doc(courseId).collection('sections').doc(sectionId);
        await sectionRef.update({ title: title });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating section title:", error);
        
        let msg = error.message;
        if (msg.includes("CONFIGURATION_MANQUANTE")) {
            msg = "Le serveur n'est pas configuré. Ajoutez la clé FIREBASE_SERVICE_ACCOUNT_KEY dans les variables d'environnement de votre hébergeur.";
        } else if (msg.includes("permission-denied")) {
            msg = "Accès refusé. Vérifiez les permissions de votre compte de service.";
        } else {
            msg = "Erreur de base de données : " + msg;
        }
        
        return { success: false, error: msg };
    }
}

export async function deleteSection({ courseId, sectionId }: { courseId: string; sectionId: string }) {
    try {
        const db = getAdminDb();
        const sectionRef = db.collection('courses').doc(courseId).collection('sections').doc(sectionId);
        const lecturesSnapshot = await sectionRef.collection('lectures').get();
        
        const batch = db.batch();
        lecturesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        batch.delete(sectionRef);

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting section:", error);
        return { success: false, error: error.message };
    }
}

export async function reorderSections({ courseId, orderedSections }: { courseId: string, orderedSections: { id: string, order: number }[] }) {
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const sectionsRef = db.collection('courses').doc(courseId).collection('sections');
        
        orderedSections.forEach(section => {
            const docRef = sectionsRef.doc(section.id);
            batch.update(docRef, { order: section.order });
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error reordering sections:", error);
        return { success: false, error: error.message };
    }
}
