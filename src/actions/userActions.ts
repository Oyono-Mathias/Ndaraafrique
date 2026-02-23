'use server';

import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { UserRole, NdaraUser } from '@/lib/types';

/**
 * @fileOverview Actions serveur sécurisées pour la gestion des utilisateurs.
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
 * Synchronise les utilisateurs de Firebase Auth vers Firestore.
 * Récupère les 12 membres réels et crée les profils manquants.
 */
export async function syncUsersWithAuthAction(adminId: string) {
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "Non autorisé." };

    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        const listUsers = await auth.listUsers();
        let batch = db.batch();
        let operationCount = 0;
        let createdCount = 0;

        for (const userRecord of listUsers.users) {
            const userRef = db.collection('users').doc(userRecord.uid);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
                // Création du profil à partir des données de l'Auth
                batch.set(userRef, {
                    uid: userRecord.uid,
                    email: userRecord.email || '',
                    fullName: userRecord.displayName || 'Utilisateur Ndara',
                    username: userRecord.displayName?.replace(/\s/g, '_').toLowerCase() || 'user_' + userRecord.uid.substring(0, 5),
                    role: 'student',
                    status: 'active',
                    isInstructorApproved: false,
                    isProfileComplete: !!userRecord.displayName,
                    profilePictureURL: userRecord.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userRecord.displayName || 'A')}`,
                    createdAt: FieldValue.serverTimestamp(),
                    isOnline: false,
                    lastSeen: FieldValue.serverTimestamp(),
                    careerGoals: { currentRole: '', interestDomain: '', mainGoal: '' }
                });
                operationCount++;
                createdCount++;
            }

            if (operationCount >= 450) {
                await batch.commit();
                batch = db.batch();
                operationCount = 0;
            }
        }

        if (operationCount > 0) await batch.commit();
        return { success: true, count: createdCount };
    } catch (error: any) {
        console.error("Sync Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Migration massive de tous les profils utilisateurs.
 */
export async function migrateUserProfilesAction(adminId: string) {
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "Non autorisé." };

    try {
        const db = getAdminDb();
        const usersSnap = await db.collection('users').get();
        let batch = db.batch();
        let operationCount = 0;
        let migratedCount = 0;

        for (const userDoc of usersSnap.docs) {
            const data = userDoc.data();
            const updates: any = {};
            let needsUpdate = false;

            if (!data.role) { updates.role = 'student'; needsUpdate = true; }
            if (data.isInstructorApproved === undefined) { updates.isInstructorApproved = false; needsUpdate = true; }
            if (!data.status) { updates.status = 'active'; needsUpdate = true; }
            if (data.isProfileComplete === undefined) { 
                updates.isProfileComplete = !!(data.username && data.fullName); 
                needsUpdate = true; 
            }
            if (!data.careerGoals) {
                updates.careerGoals = { currentRole: '', interestDomain: '', mainGoal: '' };
                needsUpdate = true;
            }

            if (needsUpdate) {
                batch.set(userDoc.ref, updates, { merge: true });
                operationCount++;
                migratedCount++;
            }

            if (operationCount >= 450) {
                await batch.commit();
                batch = db.batch();
                operationCount = 0;
            }
        }

        if (operationCount > 0) await batch.commit();
        return { success: true, count: migratedCount };
    } catch (error: any) {
        console.error("Migration Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Met à jour le profil d'un utilisateur de manière sécurisée.
 */
export async function updateUserProfileAction({
    userId,
    data,
    requesterId
}: {
    userId: string;
    data: Partial<NdaraUser>;
    requesterId: string;
}) {
    try {
        const db = getAdminDb();
        const isAdmin = await isRequesterAdmin(requesterId);
        
        if (userId !== requesterId && !isAdmin) {
            return { success: false, error: "Permission refusée." };
        }

        const allowedFields = [
            'fullName', 'username', 'bio', 'phoneNumber', 
            'profilePictureURL', 'preferredLanguage', 'socialLinks', 
            'careerGoals', 'instructorNotificationPreferences', 'pedagogicalPreferences'
        ];
        
        const filteredData: any = {};
        for (const key of allowedFields) {
            if ((data as any)[key] !== undefined) {
                filteredData[key] = (data as any)[key];
            }
        }

        const userRef = db.collection('users').doc(userId);
        filteredData.updatedAt = FieldValue.serverTimestamp();

        await userRef.update(filteredData);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating profile Action:", error);
        return { success: false, error: error.message };
    }
}

export async function grantCourseAccess({
    studentId,
    courseId,
    adminId,
    reason,
    expirationInDays,
    expirationMinutes
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
        const enrollmentId = `${studentId}_${courseId}`;
        const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
        
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) return { success: false, error: "Cours introuvable" };
        const courseData = courseDoc.data();

        let expiresAt = null;
        if (expirationMinutes) {
            expiresAt = Timestamp.fromMillis(Date.now() + expirationMinutes * 60 * 1000);
        } else if (expirationInDays) {
            expiresAt = Timestamp.fromMillis(Date.now() + expirationInDays * 24 * 60 * 60 * 1000);
        }

        batch.set(enrollmentRef, {
            studentId,
            courseId,
            instructorId: courseData?.instructorId || '',
            enrollmentDate: FieldValue.serverTimestamp(),
            lastAccessedAt: FieldValue.serverTimestamp(),
            progress: 0,
            status: 'active',
            enrollmentType: expirationMinutes ? 'test_access' : 'admin_grant',
            grantedBy: adminId,
            grantReason: reason,
            expiresAt: expiresAt
        }, { merge: true });

        const auditRef = db.collection('admin_audit_logs').doc();
        batch.set(auditRef, {
            adminId,
            eventType: 'course.grant',
            target: { id: enrollmentId, type: 'enrollment' },
            details: `Accès accordé à ${studentId}. Raison: ${reason}`,
            timestamp: FieldValue.serverTimestamp(),
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error granting course access Action:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteUserAccount({ userId, idToken }: { userId: string, idToken: string }): Promise<{ success: boolean, error?: string }> {
    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        
        const decodedToken = await auth.verifyIdToken(idToken);
        const requesterUid = decodedToken.uid;
        const isAdmin = await isRequesterAdmin(requesterUid);

        if (requesterUid !== userId && !isAdmin) {
           return { success: false, error: "Permission refusée." };
        }
    
        const batch = db.batch();
        await auth.deleteUser(userId);
        batch.delete(db.collection('users').doc(userId));
        
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateUserStatus({ userId, status, adminId }: { userId: string, status: 'active' | 'suspended', adminId: string }): Promise<{ success: boolean, error?: string }> {
    try {
        const db = getAdminDb();
        if (!(await isRequesterAdmin(adminId))) return { success: false, error: "Action réservée aux admins." };

        const userRef = db.collection('users').doc(userId);
        await userRef.update({ status });
        
        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.status.update',
            target: { id: userId, type: 'user' },
            details: `Statut de ${userId} changé en ${status}.`,
            timestamp: FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch(error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateUserRole({ userId, role, adminId }: { userId: string, role: UserRole, adminId: string }): Promise<{ success: boolean, error?: string }> {
    try {
        const db = getAdminDb();
        if (!(await isRequesterAdmin(adminId))) return { success: false, error: "Action réservée aux admins." };

        const userRef = db.collection('users').doc(userId);
        await userRef.update({ role });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.role.update',
            target: { id: userId, type: 'user' },
            details: `Rôle de ${userId} changé en ${role}.`,
            timestamp: FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch(error: any) {
        return { success: false, error: error.message };
    }
}

export async function approveInstructorApplication({ userId, decision, message, adminId }: { userId: string, decision: 'accepted' | 'rejected', message: string, adminId: string }): Promise<{ success: boolean, error?: string }> {
    try {
        const db = getAdminDb();
        if (!(await isRequesterAdmin(adminId))) return { success: false, error: "Action réservée aux admins." };

        const userRef = db.collection('users').doc(userId);
        await userRef.update({ 
            isInstructorApproved: decision === 'accepted',
            role: decision === 'accepted' ? 'instructor' : 'student'
        });

        return { success: true };
    } catch(error: any) {
        return { success: false, error: error.message };
    }
}