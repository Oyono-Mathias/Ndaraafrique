'use server';

import { getAdminDb } from '@/firebase/admin';
import { grantCourseAccess } from '@/actions/userActions';
import type { NdaraUser, Course } from '@/lib/types';

/**
 * @fileOverview Actions pour l'assistant IA Mathias.
 */

async function findUserByEmail(email: string): Promise<(NdaraUser & { uid: string }) | null> {
    try {
        const db = getAdminDb();
        const usersRef = db.collection('users');
        const q = usersRef.where('email', '==', email).limit(1);
        const snapshot = await q.get();
        if (snapshot.empty) return null;
        const userDoc = snapshot.docs[0];
        return { uid: userDoc.id, ...userDoc.data() } as (NdaraUser & { uid: string });
    } catch (e) {
        console.error("Error finding user:", e);
        return null;
    }
}

async function findCourseByTitle(title: string): Promise<(Course & { id: string }) | null> {
    try {
        const db = getAdminDb();
        const coursesRef = db.collection('courses');
        const q = coursesRef.where('title', '>=', title).where('title', '<=', title + '\uf8ff').limit(1);
        const snapshot = await q.get();
        if (snapshot.empty) return null;
        const courseDoc = snapshot.docs[0];
        return { id: courseDoc.id, ...courseDoc.data() } as (Course & { id: string });
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

export async function grantCourseAccessFromIdentifiers(params: GrantAccessParams) {
    const student = await findUserByEmail(params.studentEmail);
    if (!student) {
        return { success: false, error: `L'étudiant avec l'email ${params.studentEmail} n'a pas été trouvé.` };
    }

    const course = await findCourseByTitle(params.courseTitle);
    if (!course) {
        return { success: false, error: `Le cours intitulé "${params.courseTitle}" n'a pas été trouvé.` };
    }

    return grantCourseAccess({
        studentId: student.uid,
        courseId: course.id,
        adminId: params.adminId,
        reason: params.reason,
        expirationInDays: params.expirationInDays,
    });
}
