'use server';

import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
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
 * SCRIPT DE MIGRATION MASSIF : Synchronise les utilisateurs de Firebase Auth vers Firestore.
 * - Liste tous les utilisateurs de l'Auth (Admin SDK).
 * - Vérifie l'existence du document /users/{uid}.
 * - Crée le profil avec email, fullName, role 'student' et status 'active' si manquant.
 * - Utilise writeBatch pour l'optimisation.
 */
export async function syncUsersWithAuthAction(adminId: string) {
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "Action réservée aux administrateurs." };

    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        
        // 1. Lister tous les utilisateurs de l'authentification Firebase
        const listUsers = await auth.listUsers();
        let batch = db.batch();
        let operationCount = 0;
        let createdCount = 0;

        for (const userRecord of listUsers.users) {
            const userRef = db.collection('users').doc(userRecord.uid);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
                // 2. Préparation des données de base à partir de l'Auth
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

            // Commiter par paquets de 450 (limite Firestore = 500)
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