'use server';

/**
 * @fileOverview Actions administratives hautement sécurisées pour Ndara Afrique.
 * ✅ SÉCURITÉ : Vérification systématique du rôle Admin côté serveur.
 * ✅ TRANSACTIONNEL : Utilisation de db.runTransaction pour les flux financiers.
 * ✅ VERSIONNING : previousState dans les logs pour support rollback.
 * ✅ SUPER ADMIN : Restriction des actions critiques à MasterAdmin.
 */

import { getAdminDb, getAdminAuth } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserRole, NdaraUser, Enrollment } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const MASTER_ADMIN_EMAIL = 'salguienow@gmail.com';

/**
 * 🛡️ Helper de sécurité : Vérifie si l'appelant est un admin actif.
 */
async function verifyAdminOrThrow(adminId: string, checkMaster: boolean = false) {
    if (!adminId) throw new Error("UNAUTHORIZED: Identifiant manquant.");
    
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

/** 💰 1. Recharger le portefeuille (Transactionnel) */
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

/** 🛡️ 2. Modifier l'identité utilisateur (Sync Auth + Firestore) */
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
        await verifyAdminOrThrow(adminId, true); // Super Admin uniquement
        
        const db = getAdminDb();
        const auth = getAdminAuth();
        
        const userRef = db.collection('users').doc(targetUserId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) throw new Error("Utilisateur introuvable.");
        
        const oldData = userSnap.data();

        // 1. Mise à jour Firebase Auth
        if (data.email || data.password) {
            await auth.updateUser(targetUserId, {
                email: data.email || undefined,
                password: data.password || undefined,
                displayName: data.fullName
            });
        }

        // 2. Mise à jour Firestore
        const { password, ...firestoreData } = data;
        await userRef.update({
            ...firestoreData,
            updatedAt: FieldValue.serverTimestamp()
        });

        // 3. Log d'audit avec versioning
        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.identity.update',
            target: { id: targetUserId, type: 'user' },
            details: `Modification d'identité : ${Object.keys(data).join(', ')}`,
            previousState: { email: oldData?.email, fullName: oldData?.fullName, username: oldData?.username },
            timestamp: FieldValue.serverTimestamp()
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🔒 3. Gérer la révocation d'accès et les remboursements (Source de Vérité) */
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

            // 1. Révocation de l'accès (Source de Vérité)
            transaction.update(enrollRef, {
                accessStatus: 'revoked',
                revocationReason: reason,
                status: 'suspended',
                updatedAt: FieldValue.serverTimestamp()
            });

            // 2. Gestion financière (Si remboursement demandé)
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

            // 3. Log d'audit avec previousState
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
        return { success: false, error: e.message };
    }
}

/** 🔒 4. Modifier Statut (Suspension/Réactivation) */
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

/** 🎓 5. Changer Rôle */
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
