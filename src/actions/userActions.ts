
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
 * SCRIPT DE MIGRATION : Synchronise les utilisateurs de Firebase Auth vers Firestore.
 * Utile pour connecter les 10 membres réels de l'Authentification.
 */
export async function syncUsersWithAuthAction(adminId: string) {
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "Action réservée aux administrateurs." };

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
                const email = userRecord.email || '';
                const fullName = userRecord.displayName || email.split('@')[0] || 'Utilisateur Ndara';
                const username = fullName.replace(/\s/g, '_').toLowerCase() + Math.floor(1000 + Math.random() * 9000);

                batch.set(userRef, {
                    uid: userRecord.uid,
                    email: email,
                    fullName: fullName,
                    username: username,
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
        console.error("Migration/Sync Error:", error);
        return { success: false, error: "Erreur lors de la synchronisation : " + error.message };
    }
}

/**
 * Répare les profils existants en ajoutant les champs par défaut manquants.
 */
export async function migrateUserProfilesAction(adminId: string) {
    if (!(await isRequesterAdmin(adminId))) return { success: false, error: "Action réservée aux admins." };
    
    try {
        const db = getAdminDb();
        const usersSnap = await db.collection('users').get();
        let batch = db.batch();
        let count = 0;
        let totalRepaired = 0;

        for (const doc of usersSnap.docs) {
            const data = doc.data();
            const updates: any = {};
            let needsUpdate = false;

            if (data.status === undefined) { updates.status = 'active'; needsUpdate = true; }
            if (data.role === undefined) { updates.role = 'student'; needsUpdate = true; }
            if (data.isInstructorApproved === undefined) { updates.isInstructorApproved = false; needsUpdate = true; }
            if (data.isProfileComplete === undefined) { 
                updates.isProfileComplete = !!(data.username && data.careerGoals?.interestDomain);
                needsUpdate = true;
            }

            if (needsUpdate) {
                batch.update(doc.ref, updates);
                count++;
                totalRepaired++;
            }

            if (count >= 450) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }

        if (count > 0) await batch.commit();
        return { success: true, count: totalRepaired };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Accorde un accès manuel à un cours (Offrir un cours).
 */
export async function grantCourseAccess({
    studentId,
    courseId,
    adminId,
    reason,
    expirationMinutes,
    expirationInDays,
}: {
    studentId: string;
    courseId: string;
    adminId: string;
    reason: string;
    expirationMinutes?: number;
    expirationInDays?: number;
}) {
    try {
        const db = getAdminDb();
        const batch = db.batch();
        
        const enrollmentId = `${studentId}_${courseId}`;
        const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
        
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) return { success: false, error: "Cours introuvable." };
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
            status: 'active',
            enrollmentDate: FieldValue.serverTimestamp(),
            lastAccessedAt: FieldValue.serverTimestamp(),
            progress: 0,
            enrollmentType: 'admin_grant',
            expiresAt: expiresAt || null
        }, { merge: true });

        const grantRef = db.collection('admin_grants').doc();
        batch.set(grantRef, {
            studentId,
            courseId,
            grantedBy: adminId,
            reason,
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: expiresAt || null
        });

        await batch.commit();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Approuve ou rejette une candidature d'instructeur.
 */
export async function approveInstructorApplication({
    userId,
    decision,
    message,
    adminId
}: {
    userId: string;
    decision: 'accepted' | 'rejected';
    message: string;
    adminId: string;
}) {
    try {
        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);
        const batch = db.batch();
        
        if (decision === 'accepted') {
            batch.update(userRef, {
                isInstructorApproved: true,
                role: 'instructor'
            });
        } else {
            batch.update(userRef, {
                isInstructorApproved: false,
                role: 'student',
                'instructorApplication.status': 'rejected'
            });
        }

        const auditLogRef = db.collection('admin_audit_logs').doc();
        batch.set(auditLogRef, {
            adminId,
            eventType: 'instructor.application',
            target: { id: userId, type: 'user' },
            details: `Candidature instructeur ${decision} pour ${userId}.`,
            timestamp: FieldValue.serverTimestamp(),
        });

        await batch.commit();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
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

export async function deleteUserAccount({ userId, idToken }: { userId: string, idToken: string }): Promise<{ success: boolean, error?: string }> {
    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        const decodedToken = await auth.verifyIdToken(idToken);
        const requesterUid = decodedToken.uid;
        const isAdmin = await isRequesterAdmin(requesterUid);

        if (requesterUid !== userId && !isAdmin) return { success: false, error: "Permission refusée." };
    
        const batch = db.batch();
        await auth.deleteUser(userId);
        batch.delete(db.collection('users').doc(userId));
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
