'use server';

/**
 * @fileOverview Actions administratives hautement sécurisées pour Ndara Afrique.
 * ✅ SÉCURITÉ : Vérification systématique du rôle Admin côté serveur.
 * ✅ TRANSACTIONNEL : Utilisation de db.runTransaction pour les flux financiers.
 * ✅ AUDIT : Journalisation de chaque action dans admin_audit_logs.
 */

import { getAdminDb, getAdminAuth } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { UserRole, NdaraUser } from '@/lib/types';

/**
 * 🛡️ Helper de sécurité : Vérifie si l'appelant est un admin actif.
 */
async function verifyAdminOrThrow(adminId: string) {
    if (!adminId) throw new Error("UNAUTHORIZED: Identifiant manquant.");
    
    const db = getAdminDb();
    const adminDoc = await db.collection('users').doc(adminId).get();
    
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin' || adminDoc.data()?.status !== 'active') {
        console.error(`[SECURITY_ALERT] Tentative d'action admin non autorisée par UID: ${adminId}`);
        throw new Error("UNAUTHORIZED: Droits d'administrateur requis.");
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
}): Promise<{ success: boolean; error?: string }> {
    try {
        await verifyAdminOrThrow(adminId);
        if (amount <= 0) throw new Error("Le montant doit être positif.");

        const db = getAdminDb();
        
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection('users').doc(targetUserId);
            const userSnap = await transaction.get(userRef);

            if (!userSnap.exists) throw new Error("Utilisateur introuvable.");

            // 1. Mise à jour solde
            transaction.update(userRef, {
                balance: FieldValue.increment(amount),
                updatedAt: FieldValue.serverTimestamp()
            });

            // 2. Création du reçu de paiement
            const paymentRef = db.collection('payments').doc();
            transaction.set(paymentRef, {
                id: paymentRef.id,
                userId: targetUserId,
                amount: amount,
                currency: 'XOF',
                provider: 'admin_recharge',
                status: 'completed',
                date: FieldValue.serverTimestamp(),
                courseTitle: `Crédit Admin: ${reason}`,
                metadata: { type: 'wallet_topup', adminId, reason }
            });

            // 3. Log d'audit
            const auditRef = db.collection('admin_audit_logs').doc();
            transaction.set(auditRef, {
                adminId,
                eventType: 'user.wallet.recharge',
                target: { id: targetUserId, type: 'user' },
                details: `Injection de ${amount} XOF. Raison: ${reason}`,
                timestamp: FieldValue.serverTimestamp()
            });
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 💸 2. Débiter le portefeuille (Transactionnel) */
export async function debitUserWalletAction({
    adminId,
    targetUserId,
    amount,
    reason
}: {
    adminId: string;
    targetUserId: string;
    amount: number;
    reason: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await verifyAdminOrThrow(adminId);
        if (amount <= 0) throw new Error("Le montant doit être positif.");
        
        const db = getAdminDb();
        
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection('users').doc(targetUserId);
            const userSnap = await transaction.get(userRef);

            if (!userSnap.exists) throw new Error("Utilisateur introuvable.");
            const currentBalance = userSnap.data()?.balance || 0;

            if (currentBalance < amount) throw new Error("Solde insuffisant pour ce débit.");

            transaction.update(userRef, {
                balance: FieldValue.increment(-amount),
                updatedAt: FieldValue.serverTimestamp()
            });

            const auditRef = db.collection('admin_audit_logs').doc();
            transaction.set(auditRef, {
                adminId,
                eventType: 'user.wallet.debit',
                target: { id: targetUserId, type: 'user' },
                details: `Retrait manuel de ${amount} XOF. Raison: ${reason}`,
                timestamp: FieldValue.serverTimestamp()
            });
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🔒 3. Modifier Statut (Suspension/Réactivation) */
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
}): Promise<{ success: boolean; error?: string }> {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();
        
        await db.collection('users').doc(targetUserId).update({ 
            status,
            statusReason: reason,
            updatedAt: FieldValue.serverTimestamp()
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: `user.status.${status}`,
            target: { id: targetUserId, type: 'user' },
            details: `Statut modifié en '${status}'. Raison: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        // Si suspendu, on révoque également les jetons de session
        if (status === 'suspended') {
            await getAdminAuth().revokeRefreshTokens(targetUserId);
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🛡️ 4. Appliquer des restrictions granulaires */
export async function applyUserRestrictionsAction({
    adminId,
    targetUserId,
    restrictions,
    reason
}: {
    adminId: string;
    targetUserId: string;
    restrictions: NdaraUser['restrictions'];
    reason: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();

        await db.collection('users').doc(targetUserId).update({
            restrictions,
            'sanctions.isSanctioned': true,
            'sanctions.reason': reason,
            'sanctions.date': FieldValue.serverTimestamp(),
            'sanctions.imposedBy': adminId,
            updatedAt: FieldValue.serverTimestamp()
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.restrictions.update',
            target: { id: targetUserId, type: 'user' },
            details: `Restrictions mises à jour. Raison: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🔓 5. Lever toutes les restrictions */
export async function removeUserRestrictionsAction({
    adminId,
    targetUserId
}: {
    adminId: string;
    targetUserId: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();

        const defaultRestrictions = {
            canWithdraw: true,
            canSendMessage: true,
            canBuyCourse: true,
            canSellCourse: true,
            canAccessPlatform: true
        };

        await db.collection('users').doc(targetUserId).update({
            restrictions: defaultRestrictions,
            'sanctions.isSanctioned': false,
            updatedAt: FieldValue.serverTimestamp()
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.restrictions.remove',
            target: { id: targetUserId, type: 'user' },
            details: `Toutes les restrictions ont été levées.`,
            timestamp: FieldValue.serverTimestamp()
        });

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
}): Promise<{ success: boolean; error?: string }> {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();
        
        await db.collection('users').doc(targetUserId).update({ 
            role: newRole,
            updatedAt: FieldValue.serverTimestamp()
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.role.change',
            target: { id: targetUserId, type: 'user' },
            details: `Rôle modifié vers '${newRole}'.`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🎁 7. Offrir un cours */
export async function grantFreeCourseAction({
    adminId,
    targetUserId,
    courseId,
    reason
}: {
    adminId: string;
    targetUserId: string;
    courseId: string;
    reason: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();
        
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) throw new Error("Cours introuvable.");

        const enrollmentId = `${targetUserId}_${courseId}`;
        await db.collection('enrollments').doc(enrollmentId).set({
            id: enrollmentId,
            studentId: targetUserId,
            courseId: courseId,
            instructorId: courseDoc.data()?.instructorId,
            status: 'active',
            progress: 0,
            enrollmentDate: FieldValue.serverTimestamp(),
            lastAccessedAt: FieldValue.serverTimestamp(),
            isAdminGrant: true,
            grantReason: reason,
            grantedBy: adminId
        }, { merge: true });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.course.grant',
            target: { id: targetUserId, type: 'user' },
            details: `Accès gratuit offert : ${courseDoc.data()?.title}. Raison: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🗑️ 8. Suppression définitive (Action Irréversible) */
export async function hardDeleteUserAction({
    adminId,
    targetUserId,
    confirmation
}: {
    adminId: string;
    targetUserId: string;
    confirmation: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await verifyAdminOrThrow(adminId);
        if (confirmation !== 'SUPPRIMER') throw new Error("Code de confirmation incorrect.");

        const db = getAdminDb();
        const auth = getAdminAuth();

        // 1. Supprimer de Firebase Auth
        await auth.deleteUser(targetUserId);

        // 2. Marquer comme supprimé en DB (Audit preservation)
        await db.collection('users').doc(targetUserId).update({
            status: 'deleted',
            deletedAt: FieldValue.serverTimestamp(),
            email: `deleted_${targetUserId}@ndara.africa`
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.delete.hard',
            target: { id: targetUserId, type: 'user' },
            details: `Suppression définitive du compte par l'admin ${adminId}.`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🔐 9. Suspecter un compte */
export async function toggleSuspectStatusAction({
    adminId,
    targetUserId,
    isSuspect,
    reason
}: {
    adminId: string;
    targetUserId: string;
    isSuspect: boolean;
    reason: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();

        await db.collection('users').doc(targetUserId).update({
            isSuspect,
            suspectReason: isSuspect ? reason : FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp()
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: isSuspect ? 'user.suspect.flag' : 'user.suspect.clear',
            target: { id: targetUserId, type: 'user' },
            details: isSuspect ? `Marqué comme suspect. Raison: ${reason}` : `Statut suspect levé.`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🔑 10. Réinitialiser Mot de Passe (Lien sécurisé) */
export async function resetUserPasswordAction(adminId: string, targetUserId: string) {
    try {
        await verifyAdminOrThrow(adminId);
        const auth = getAdminAuth();
        const user = await auth.getUser(targetUserId);
        
        if (!user.email) throw new Error("Email utilisateur manquant.");

        const link = await auth.generatePasswordResetLink(user.email);
        
        await getAdminDb().collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.password.reset',
            target: { id: targetUserId, type: 'user' },
            details: `Génération lien reset mot de passe.`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true, link };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
