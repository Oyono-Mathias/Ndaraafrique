'use server';

import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { UserRole, NdaraUser } from '@/lib/types';

/**
 * @fileOverview Actions serveur sécurisées pour la gestion des utilisateurs.
 * Utilise getAdminDb() pour une résilience maximale contre les erreurs de config.
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

        // 1. Autorisation : Seul le propriétaire ou un admin peut modifier
        const isAdmin = await isRequesterAdmin(requesterId);
        if (userId !== requesterId && !isAdmin) {
            return { success: false, error: "Permission refusée." };
        }

        // 2. Filtrage des champs autorisés
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

        // 3. Nettoyage
        if (filteredData.fullName) filteredData.fullName = filteredData.fullName.trim().substring(0, 100);
        if (filteredData.bio) filteredData.bio = filteredData.bio.trim().substring(0, 1000);

        const userRef = db.collection('users').doc(userId);
        
        // Calcul automatique de la complétion du profil
        const isComplete = !!(filteredData.username && filteredData.careerGoals?.interestDomain && filteredData.fullName);
        filteredData.isProfileComplete = isComplete;
        filteredData.updatedAt = FieldValue.serverTimestamp();

        await userRef.update(filteredData);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating profile Action:", error.message);
        return { 
            success: false, 
            error: error.message.includes('ADMIN_SDK_CONFIG_ERROR') 
                ? "Le serveur n'est pas encore configuré (Clé manquante)." 
                : "Erreur lors de la mise à jour du profil." 
        };
    }
}

/**
 * Offre l'accès à un cours (Admin Grant)
 */
export async function grantCourseAccess({
    studentId,
    courseId,
    adminId,
    reason,
    expirationInDays
}: {
    studentId: string;
    courseId: string;
    adminId: string;
    reason: string;
    expirationInDays?: number;
}) {
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const enrollmentId = `${studentId}_${courseId}`;
        const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
        
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) return { success: false, error: "Cours introuvable" };
        const courseData = courseDoc.data();

        batch.set(enrollmentRef, {
            studentId,
            courseId,
            instructorId: courseData?.instructorId || '',
            enrollmentDate: FieldValue.serverTimestamp(),
            lastAccessedAt: FieldValue.serverTimestamp(),
            progress: 0,
            status: 'active',
            enrollmentType: 'admin_grant',
            grantedBy: adminId,
            grantReason: reason,
            expiresAt: expirationInDays ? Timestamp.fromMillis(Date.now() + expirationInDays * 24 * 60 * 60 * 1000) : null
        }, { merge: true });

        const auditRef = db.collection('admin_audit_logs').doc();
        batch.set(auditRef, {
            adminId,
            eventType: 'course.grant',
            target: { id: enrollmentId, type: 'enrollment' },
            details: `Accès offert à ${studentId} pour le cours ${courseId}. Raison: ${reason}`,
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

        if (requesterUid !== userId) {
            batch.set(db.collection('admin_audit_logs').doc(), {
                adminId: requesterUid,
                eventType: 'user.delete',
                target: { id: userId, type: 'user' },
                details: `Compte ${userId} supprimé par l'admin.`,
                timestamp: FieldValue.serverTimestamp(),
            });
        }
        
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

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'instructor.application',
            target: { id: userId, type: 'user' },
            details: `Candidature instructeur de ${userId} : ${decision}.`,
            timestamp: FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch(error: any) {
        return { success: false, error: error.message };
    }
}
