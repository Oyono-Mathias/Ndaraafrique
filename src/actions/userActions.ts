'use client';

import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { UserRole, NdaraUser } from '@/lib/types';

/**
 * @fileOverview Actions serveur pour la gestion et la synchronisation des membres.
 */

async function isRequesterAdmin(uid: string): Promise<boolean> {
    try {
        const db = getAdminDb();
        const userDoc = await db.collection('users').doc(uid).get();
        return userDoc.exists && userDoc.data()?.role === 'admin';
    } catch {
        return false;
    }
}

/**
 * SYNCHRONISATION AUTH -> FIRESTORE
 * Importe les comptes de l'Authentification qui n'ont pas encore de profil Firestore.
 */
export async function syncUsersWithAuthAction(adminId: string) {
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "Action réservée aux administrateurs." };

    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        
        const listUsers = await auth.listUsers();
        let batch = db.batch();
        let count = 0;
        let created = 0;

        for (const userRecord of listUsers.users) {
            const userRef = db.collection('users').doc(userRecord.uid);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
                const email = userRecord.email || '';
                const fullName = userRecord.displayName || email.split('@')[0] || 'Membre Ndara';
                
                batch.set(userRef, {
                    uid: userRecord.uid,
                    email: email,
                    fullName: fullName,
                    username: fullName.replace(/\s/g, '_').toLowerCase() + Math.floor(1000 + Math.random() * 9000),
                    role: 'student',
                    status: 'active',
                    isInstructorApproved: false,
                    isProfileComplete: !!userRecord.displayName,
                    profilePictureURL: userRecord.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
                    createdAt: FieldValue.serverTimestamp(),
                    isOnline: false,
                    lastSeen: FieldValue.serverTimestamp(),
                    careerGoals: { currentRole: '', interestDomain: '', mainGoal: '' }
                });
                
                created++;
                count++;
            }

            if (count >= 450) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }

        if (count > 0) await batch.commit();
        return { success: true, count: created };
    } catch (error: any) {
        console.error("Sync Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * ACCORDE L'ACCÈS À UN COURS
 */
export async function grantCourseAccess({
    studentId,
    courseId,
    adminId,
    reason,
    expirationInDays,
    expirationMinutes,
}: {
    studentId: string;
    courseId: string;
    adminId: string;
    reason: string;
    expirationInDays?: number;
    expirationMinutes?: number;
}) {
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) return { success: false, error: "Cours introuvable." };

        const enrollmentRef = db.collection('enrollments').doc(`${studentId}_${courseId}`);
        
        let expiresAt = null;
        if (expirationInDays) {
            expiresAt = Timestamp.fromMillis(Date.now() + expirationInDays * 86400000);
        } else if (expirationMinutes) {
            expiresAt = Timestamp.fromMillis(Date.now() + expirationMinutes * 60000);
        }

        batch.set(enrollmentRef, {
            studentId,
            courseId,
            instructorId: courseDoc.data()?.instructorId || '',
            status: 'active',
            progress: 0,
            enrollmentDate: FieldValue.serverTimestamp(),
            lastAccessedAt: FieldValue.serverTimestamp(),
            expiresAt
        }, { merge: true });

        const logRef = db.collection('admin_audit_logs').doc();
        batch.set(logRef, {
            adminId,
            eventType: 'course.grant',
            target: { id: studentId, type: 'user' },
            details: `Accès au cours "${courseDoc.data()?.title}" accordé. Motif: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        await batch.commit();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * APPROUVE UNE CANDIDATURE D'INSTRUCTEUR
 */
export async function approveInstructorApplication({ userId, decision, adminId, message }: { userId: string, decision: 'accepted' | 'rejected', adminId: string, message?: string }) {
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const userRef = db.collection('users').doc(userId);
        
        batch.update(userRef, {
            role: decision === 'accepted' ? 'instructor' : 'student',
            isInstructorApproved: decision === 'accepted',
            'instructorApplication.decisionAt': FieldValue.serverTimestamp()
        });

        const auditRef = db.collection('admin_audit_logs').doc();
        batch.set(auditRef, {
            adminId,
            eventType: 'instructor.application',
            target: { id: userId, type: 'user' },
            details: `Candidature ${decision === 'accepted' ? 'approuvée' : 'rejetée'}.`,
            timestamp: FieldValue.serverTimestamp()
        });

        await batch.commit();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * RÉGULARISATION DES PROFILS
 */
export async function migrateUserProfilesAction(adminId: string) {
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "Action réservée aux administrateurs." };

    try {
        const db = getAdminDb();
        const usersSnap = await db.collection('users').get();
        let count = 0;
        let batch = db.batch();

        for (const doc of usersSnap.docs) {
            const data = doc.data();
            const updates: any = {};
            let needsUpdate = false;

            if (data.status === undefined) { updates.status = 'active'; needsUpdate = true; }
            if (data.role === undefined) { updates.role = 'student'; needsUpdate = true; }
            if (data.isInstructorApproved === undefined) { updates.isInstructorApproved = false; needsUpdate = true; }

            if (needsUpdate) {
                batch.update(doc.ref, updates);
                count++;
            }

            if (count >= 450) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }

        if (count > 0) await batch.commit();
        return { success: true, count };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateUserProfileAction({ userId, data, requesterId }: { userId: string, data: any, requesterId: string }) {
    try {
        const db = getAdminDb();
        await db.collection('users').doc(userId).update(data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateUserStatus({ userId, status, adminId }: { userId: string, status: string, adminId: string }) {
    try {
        const db = getAdminDb();
        await db.collection('users').doc(userId).update({ status });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateUserRole({ userId, role, adminId }: { userId: string, role: string, adminId: string }) {
    try {
        const db = getAdminDb();
        await db.collection('users').doc(userId).update({ role });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteUserAccount({ userId, idToken }: { userId: string, idToken: string }) {
    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        await auth.deleteUser(userId);
        await db.collection('users').doc(userId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
