'use server';

import { getAdminDb } from '@/firebase/admin';
import { grantCourseAccess } from '@/actions/userActions';
import type { NdaraUser } from '@/lib/types';

/**
 * @fileOverview Actions pour l'assistant IA Mathias.
 */

/**
 * 🔍 Trouver un utilisateur par email
 */
async function findUserByEmail(email: string): Promise<(NdaraUser & { uid: string }) | null> {
    try {
        const db = getAdminDb();
        const usersRef = db.collection('users');
        const q = usersRef.where('email', '==', email).limit(1);
        const snapshot = await q.get();

        if (snapshot.empty) return null;

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data() as NdaraUser;

        // On extrait 'uid' s'il existe déjà dans data pour éviter le doublon au build
        const { uid: _, ...rest } = userData as any;

        return {
            uid: userDoc.id,
            ...rest,
        } as NdaraUser & { uid: string };
    } catch (e) {
        console.error("Error finding user:", e);
        return null;
    }
}

/**
 * 🔍 Trouver un cours par titre
 */
async function findCourseByTitle(title: string): Promise<(any & { id: string }) | null> {
    try {
        const db = getAdminDb();
        const coursesRef = db.collection('courses');

        // Recherche par préfixe pour plus de souplesse
        const q = coursesRef
            .where('title', '>=', title)
            .where('title', '<=', title + '\uf8ff')
            .limit(1);

        const snapshot = await q.get();

        if (snapshot.empty) return null;

        const courseDoc = snapshot.docs[0];
        const courseData = courseDoc.data();
        
        // On extrait 'id' s'il existe déjà dans data pour éviter le doublon
        const { id: _, ...rest } = courseData as any;

        return {
            id: courseDoc.id,
            ...rest,
        };
    } catch (e) {
        console.error("Error finding course:", e);
        return null;
    }
}

interface GrantAccessParams {
    studentEmail: string;
    courseTitle: string;
    adminId: string;
    reason: string;
    expirationInDays?: number;
}

/**
 * 🎯 Action principale
 */
export async function grantCourseAccessFromIdentifiers(params: GrantAccessParams) {
    const student = await findUserByEmail(params.studentEmail);

    if (!student) {
        return {
            success: false,
            error: `L'étudiant avec l'email ${params.studentEmail} n'a pas été trouvé.`,
        };
    }

    const course = await findCourseByTitle(params.courseTitle);

    if (!course) {
        return {
            success: false,
            error: `Le cours intitulé "${params.courseTitle}" n'a pas été trouvé.`,
        };
    }

    return grantCourseAccess({
        studentId: student.uid,
        courseId: course.id,
        adminId: params.adminId,
        reason: params.reason,
        expirationInDays: params.expirationInDays,
    });
}