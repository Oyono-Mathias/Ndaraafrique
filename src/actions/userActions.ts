'use server';

import { adminAuth, adminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { UserRole, NdaraUser } from '@/lib/types';

/**
 * @fileOverview Actions serveur sécurisées pour la gestion des utilisateurs.
 * Inclut la mise à jour de profil avec filtrage des champs et protection contre l'élévation de privilèges.
 */

// Helper pour vérifier si le requérant est admin
async function isRequesterAdmin(uid: string): Promise<boolean> {
    if (!adminDb) return false;
    const userDoc = await adminDb.collection('users').doc(uid).get();
    return userDoc.exists && userDoc.data()?.role === 'admin';
}

/**
 * Met à jour le profil d'un utilisateur de manière sécurisée.
 * Filtre strictement les champs autorisés.
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
    if (!adminDb) return { success: false, error: "Service indisponible" };

    // 1. Autorisation : Seul le propriétaire ou un admin peut modifier
    const isAdmin = await isRequesterAdmin(requesterId);
    if (userId !== requesterId && !isAdmin) {
        return { success: false, error: "Permission refusée." };
    }

    // 2. Filtrage des champs sensibles (Whitelisting)
    // On empêche toute modification accidentelle ou malveillante du rôle via cette action
    const allowedFields = ['fullName', 'username', 'bio', 'phoneNumber', 'profilePictureURL', 'preferredLanguage', 'socialLinks', 'careerGoals', 'instructorNotificationPreferences', 'pedagogicalPreferences'];
    
    const filteredData: any = {};
    for (const key of allowedFields) {
        if ((data as any)[key] !== undefined) {
            filteredData[key] = (data as any)[key];
        }
    }

    // 3. Nettoyage simple des chaînes (Prévention XSS basique)
    if (filteredData.fullName) filteredData.fullName = filteredData.fullName.trim().substring(0, 100);
    if (filteredData.bio) filteredData.bio = filteredData.bio.trim().substring(0, 1000);

    try {
        const userRef = adminDb.collection('users').doc(userId);
        
        // Calcul automatique de la complétion du profil
        const isComplete = !!(filteredData.username && filteredData.careerGoals?.interestDomain && filteredData.fullName);
        filteredData.isProfileComplete = isComplete;
        filteredData.updatedAt = FieldValue.serverTimestamp();

        await userRef.update(filteredData);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating profile:", error);
        return { success: false, error: "Erreur lors de la mise à jour." };
    }
}

export async function deleteUserAccount({ userId, idToken }: { userId: string, idToken: string }): Promise<{ success: boolean, error?: string }> {
    if (!adminAuth || !adminDb) return { success: false, error: "Service indisponible." };
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const requesterUid = decodedToken.uid;
        const isAdmin = await isRequesterAdmin(requesterUid);

        if (requesterUid !== userId && !isAdmin) {
           return { success: false, error: "Permission refusée." };
        }
    
        const batch = adminDb.batch();
        await adminAuth.deleteUser(userId);
        batch.delete(adminDb.collection('users').doc(userId));

        if (requesterUid !== userId) {
            batch.set(adminDb.collection('admin_audit_logs').doc(), {
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
    if (!adminDb) return { success: false, error: "Service indisponible" };
    if (!(await isRequesterAdmin(adminId))) return { success: false, error: "Action réservée aux admins." };

    try {
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({ status });
        
        await adminDb.collection('admin_audit_logs').add({
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
    if (!adminDb) return { success: false, error: "Service indisponible" };
    if (!(await isRequesterAdmin(adminId))) return { success: false, error: "Action réservée aux admins." };

    try {
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({ role });

        await adminDb.collection('admin_audit_logs').add({
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
    if (!adminDb) return { success: false, error: "Service indisponible" };
    if (!(await isRequesterAdmin(adminId))) return { success: false, error: "Action réservée aux admins." };

    try {
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({ 
            isInstructorApproved: decision === 'accepted',
            role: decision === 'accepted' ? 'instructor' : 'student'
        });

        await adminDb.collection('admin_audit_logs').add({
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