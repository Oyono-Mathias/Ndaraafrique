'use server';

/**
 * @fileOverview Actions administratives de souveraineté pour Ndara Afrique.
 * ✅ SÉCURITÉ : Validation systématique du rôle Admin.
 * ✅ INTÉGRITÉ : Synchronisation Firebase Auth + Firestore.
 * ✅ VERSIONING : Logs d'audit avec previousState.
 */

import { getAdminDb, getAdminAuth } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserRole, Enrollment } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const MASTER_ADMIN_EMAIL = 'salguienow@gmail.com';

/**
 * 🛡️ Helper de sécurité : Vérifie si l'appelant est un admin actif.
 */
async function verifyAdminOrThrow(adminId: string, checkMaster: boolean = false) {
    if (!adminId) throw new Error("UNAUTHORIZED: Identifiant admin manquant.");
    
    const db = getAdminDb();
    const adminDoc = await db.collection('users').doc(adminId).get();
    const adminData = adminDoc.data();
    
    if (!adminDoc.exists || adminData?.role !== 'admin' || adminData?.status !== 'active') {
        throw new Error("UNAUTHORIZED: Droits d'administrateur requis.");
    }

    if (checkMaster && adminData?.email?.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase()) {
        throw new Error("UNAUTHORIZED: Droits Super-Administrateur requis.");
    }
}

/** 🛡️ 1. Modifier l'identité utilisateur (Sync Auth + Firestore) */
export async function updateUserIdentityAction({
    adminId,
    targetUserId,
    data
}: {
    adminId: string;
    targetUserId: string;
    data: { email?: string; fullName?: string; username?: string; password?: string };
}) {
    try {
        await verifyAdminOrThrow(adminId, true); // Super Admin requis pour les ID critiques
        
        const db = getAdminDb();
        const auth = getAdminAuth();
        
        const userRef = db.collection('users').doc(targetUserId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) throw new Error("Utilisateur introuvable.");
        
        const oldData = userSnap.data();

        // A. Mise à jour Firebase Auth
        if (data.email || data.password) {
            await auth.updateUser(targetUserId, {
                email: data.email || undefined,
                password: data.password || undefined,
                displayName: data.fullName
            });
        }

        // B. Mise à jour Firestore
        const { password, ...firestoreData } = data;
        await userRef.update({
            ...firestoreData,
            updatedAt: FieldValue.serverTimestamp()
        });

        // C. Log d'audit avec versioning (previousState)
        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.identity.update',
            target: { id: targetUserId, type: 'user' },
            details: `Modification d'identité par l'admin ${adminId}.`,
            previousState: { 
                email: oldData?.email, 
                fullName: oldData?.fullName, 
                username: oldData?.username 
            },
            newState: { 
                email: data.email || oldData?.email, 
                fullName: data.fullName || oldData?.fullName, 
                username: data.username || oldData?.username 
            },
            timestamp: FieldValue.serverTimestamp()
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (e: any) {
        console.error("[updateUserIdentityAction ERROR]:", e.message);
        return { success: false, error: e.message };
    }
}

/** 🔒 2. Gérer la révocation d'accès et les remboursements (Source de Vérité: Enrollment) */
export async function manageAccessRevocationAction({
    adminId,
    targetUserId,
    courseId,
    reason,
    refund = false
}: {
    adminId: string;
    targetUserId: string;
    courseId: string;
    reason: 'refund' | 'abuse' | 'admin_error';
    refund?: boolean;
}) {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();
        
        const enrollmentId = `${targetUserId}_${courseId}`;
        const enrollRef = db.collection('enrollments').doc(enrollmentId);
        
        await db.runTransaction(async (transaction) => {
            const enrollSnap = await transaction.get(enrollRef);
            if (!enrollSnap.exists) throw new Error("Inscription introuvable.");
            
            const enrollData = enrollSnap.data() as Enrollment;
            const price = enrollData.priceAtEnrollment || 0;

            // A. Révocation de l'accès (Changement de statut)
            transaction.update(enrollRef, {
                accessStatus: 'revoked',
                revocationReason: reason,
                status: 'suspended',
                updatedAt: FieldValue.serverTimestamp()
            });

            // B. Gestion financière (Si remboursement demandé)
            if (refund && price > 0) {
                const userRef = db.collection('users').doc(targetUserId);
                transaction.update(userRef, {
                    balance: FieldValue.increment(price),
                    updatedAt: FieldValue.serverTimestamp()
                });

                if (enrollData.paymentId) {
                    transaction.update(db.collection('payments').doc(enrollData.paymentId), {
                        status: 'refunded',
                        updatedAt: FieldValue.serverTimestamp()
                    });
                }
            }

            // C. Log d'audit avec previousState
            transaction.set(db.collection('admin_audit_logs').doc(), {
                adminId,
                eventType: 'user.access.revoked',
                target: { id: enrollmentId, type: 'enrollment' },
                details: `Révocation de "${enrollData.courseTitle || courseId}". Raison: ${reason}. Remboursé: ${refund}`,
                previousState: { accessStatus: 'active', status: enrollData.status },
                timestamp: FieldValue.serverTimestamp()
            });
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (e: any) {
        console.error("[manageAccessRevocationAction ERROR]:", e.message);
        return { success: false, error: e.message };
    }
}

/** 🛠️ 3. Action de Migration : Normaliser les casses des statuts de paiement */
export async function migratePaymentStatusesAction(adminId: string) {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();
        
        const paymentsSnap = await db.collection('payments').get();
        let migratedCount = 0;

        const batch = db.batch();

        paymentsSnap.forEach(doc => {
            const data = doc.data();
            const oldStatus = data.status;
            // On normalise en minuscule pour la cohérence
            const newStatus = oldStatus?.toLowerCase();

            if (oldStatus !== newStatus) {
                batch.update(doc.ref, { 
                    status: newStatus,
                    updatedAt: FieldValue.serverTimestamp()
                });
                migratedCount++;
            }
        });

        if (migratedCount > 0) {
            await batch.commit();
        }

        return { success: true, migratedCount };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 💰 4. Recharger le portefeuille (Transactionnel) */
export async function rechargeUserWalletAction({
    adminId,
    targetUserId,
    amount,
    reason
}: {
    adminId: string;
    targetUserId: string;
    amount: number;
    reason: string;
}) {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();
        
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection('users').doc(targetUserId);
            const userSnap = await transaction.get(userRef);

            if (!userSnap.exists) throw new Error("Utilisateur introuvable.");
            const oldData = userSnap.data();

            transaction.update(userRef, {
                balance: FieldValue.increment(amount),
                updatedAt: FieldValue.serverTimestamp()
            });

            transaction.set(db.collection('admin_audit_logs').doc(), {
                adminId,
                eventType: 'user.wallet.recharge',
                target: { id: targetUserId, type: 'user' },
                details: `Injection de ${amount} XOF. Raison: ${reason}`,
                previousState: { balance: oldData?.balance },
                timestamp: FieldValue.serverTimestamp()
            });
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🔒 5. Modifier Statut (Suspension/Réactivation) */
export async function toggleUserStatusAction({
    adminId,
    targetUserId,
    status,
    reason
}: {
    adminId: string;
    targetUserId: string;
    status: 'active' | 'suspended';
    reason: string;
}) {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();
        const userRef = db.collection('users').doc(targetUserId);
        const oldSnap = await userRef.get();

        await userRef.update({ 
            status,
            statusReason: reason,
            updatedAt: FieldValue.serverTimestamp()
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: `user.status.${status}`,
            target: { id: targetUserId, type: 'user' },
            details: `Statut modifié en '${status}'. Raison: ${reason}`,
            previousState: { status: oldSnap.data()?.status },
            timestamp: FieldValue.serverTimestamp()
        });

        if (status === 'suspended') {
            await getAdminAuth().revokeRefreshTokens(targetUserId);
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🎓 6. Changer Rôle */
export async function changeUserRoleAction({
    adminId,
    targetUserId,
    newRole
}: {
    adminId: string;
    targetUserId: string;
    newRole: UserRole;
}) {
    try {
        await verifyAdminOrThrow(adminId, true);
        const db = getAdminDb();
        const userRef = db.collection('users').doc(targetUserId);
        const oldSnap = await userRef.get();
        
        await userRef.update({ 
            role: newRole,
            updatedAt: FieldValue.serverTimestamp()
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.role.change',
            target: { id: targetUserId, type: 'user' },
            details: `Rôle modifié vers '${newRole}'.`,
            previousState: { role: oldSnap.data()?.role },
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🛡️ 8. Mettre à jour les permissions spéciales */
export async function updateSpecialPermissionsAction({
    adminId,
    targetUserId,
    permissions
}: {
    adminId: string;
    targetUserId: string;
    permissions: { canDownloadOffline?: boolean; hasPremiumCommunityAccess?: boolean };
}) {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();
        
        const updateData: any = {};
        if (permissions.canDownloadOffline !== undefined) updateData['restrictions.canDownloadOffline'] = permissions.canDownloadOffline;
        if (permissions.hasPremiumCommunityAccess !== undefined) updateData['restrictions.hasPremiumCommunityAccess'] = permissions.hasPremiumCommunityAccess;

        await db.collection('users').doc(targetUserId).update({
            ...updateData,
            updatedAt: FieldValue.serverTimestamp()
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.permissions.special',
            target: { id: targetUserId, type: 'user' },
            details: `Permissions spéciales mises à jour pour ${targetUserId}.`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🛠️ 7. Synchroniser les utilisateurs Auth -> Firestore (Régularisation Google) */
export async function syncAuthUsersToFirestoreAction(adminId: string) {
    try {
        await verifyAdminOrThrow(adminId, true); // Super Admin requis
        const db = getAdminDb();
        const auth = getAdminAuth();
        
        let usersProcessed = 0;
        let usersCreated = 0;
        
        // On récupère les utilisateurs Auth (limité à 1000 pour éviter les timeouts)
        const listUsersResult = await auth.listUsers(1000);
        
        for (const userRecord of listUsersResult.users) {
            usersProcessed++;
            const userRef = db.collection('users').doc(userRecord.uid);
            const userSnap = await userRef.get();
            
            // Si le document Firestore n'existe pas, on le crée
            if (!userSnap.exists) {
                const [prenom, ...nomParts] = (userRecord.displayName || "").split(" ");
                const nom = nomParts.join(" ");

                await userRef.set({
                    uid: userRecord.uid,
                    email: userRecord.email || '',
                    fullName: userRecord.displayName || 'Utilisateur Ndara',
                    nom: nom || userRecord.displayName || "",
                    prenom: prenom || "",
                    username: (userRecord.displayName || 'user').replace(/\s/g, '_').toLowerCase() + Math.floor(1000 + Math.random() * 9000),
                    role: 'student', // Par défaut
                    status: 'active',
                    isInstructorApproved: false,
                    createdAt: FieldValue.serverTimestamp(),
                    isProfileComplete: false,
                    isOnline: false,
                    lastSeen: FieldValue.serverTimestamp(),
                    profilePictureURL: userRecord.photoURL || '',
                    balance: 0,
                    solde: 0, // Compatibilité ancienne admin
                    hasAccess: [], // Compatibilité ancienne admin
                    affiliateBalance: 0,
                    pendingAffiliateBalance: 0,
                    aiCredits: 5,
                    hasAIAccess: false,
                    affiliateStats: { clicks: 0, registrations: 0, sales: 0, earnings: 0 },
                    restrictions: {
                        canWithdraw: true,
                        canSendMessage: true,
                        canBuyCourse: true,
                        canSellCourse: true,
                        canAccessPlatform: true,
                        canDownloadOffline: true,
                        hasPremiumCommunityAccess: false
                    }
                });
                
                // Log d'audit pour chaque création
                await db.collection('admin_audit_logs').add({
                    adminId,
                    eventType: 'user.auto_regularization',
                    target: { id: userRecord.uid, type: 'user' },
                    details: `Compte Google régularisé automatiquement : ${userRecord.email}`,
                    timestamp: FieldValue.serverTimestamp()
                });

                usersCreated++;
            }
        }
        
        revalidatePath('/admin/users');
        return { success: true, usersProcessed, usersCreated };
    } catch (e: any) {
        console.error("[syncAuthUsersToFirestoreAction ERROR]:", e.message);
        return { success: false, error: e.message };
    }
}

export async function resetUserPasswordAction(adminId: string, targetUserId: string) {
    try {
        await verifyAdminOrThrow(adminId);
        const auth = getAdminAuth();
        const user = await auth.getUser(targetUserId);
        if (!user.email) throw new Error("Email manquant.");
        const link = await auth.generatePasswordResetLink(user.email);
        return { success: true, link };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
