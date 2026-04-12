'use server';

/**
 * @fileOverview Actions administratives sécurisées pour Ndara Afrique.
 * ✅ SÉCURITÉ : Vérification systématique du rôle Admin en base de données.
 * ✅ ROBUSTESSE : Retour d'un objet standard { success, error } pour le frontend.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserRole, NdaraUser } from '@/lib/types';

/**
 * 🛡️ Helper interne : Vérifie si l'appelant a réellement les droits Admin dans Firestore.
 * Ne fait pas confiance à l'ID seul, vérifie le statut actif et le rôle.
 */
async function verifyAdminOrThrow(adminId: string) {
    if (!adminId) throw new Error("UNAUTHORIZED: Identifiant manquant.");
    
    const db = getAdminDb();
    const adminDoc = await db.collection('users').doc(adminId).get();
    
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin' || adminDoc.data()?.status !== 'active') {
        console.error(`[SECURITY_ALERT] Accès admin refusé pour UID: ${adminId}`);
        throw new Error("UNAUTHORIZED: Droits d'administrateur requis.");
    }
}

/**
 * 💰 1. Recharger le portefeuille d'un utilisateur.
 */
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
        if (!reason.trim()) throw new Error("Un motif est obligatoire.");

        const db = getAdminDb();
        const batch = db.batch();
        const userRef = db.collection('users').doc(targetUserId);
        const paymentRef = db.collection('payments').doc();
        const auditRef = db.collection('admin_audit_logs').doc();

        // Mise à jour du solde
        batch.update(userRef, {
            balance: FieldValue.increment(amount),
            updatedAt: FieldValue.serverTimestamp()
        });

        // Enregistrement de la transaction
        batch.set(paymentRef, {
            id: paymentRef.id,
            userId: targetUserId,
            amount: amount,
            currency: 'XOF',
            provider: 'admin_recharge',
            status: 'completed',
            date: FieldValue.serverTimestamp(),
            courseTitle: `Recharge Admin: ${reason}`,
            metadata: { type: 'wallet_topup', adminId, reason }
        });

        // Log d'audit
        batch.set(auditRef, {
            adminId,
            eventType: 'user.wallet.recharge',
            target: { id: targetUserId, type: 'user' },
            details: `Injection de ${amount} XOF. Raison: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        await batch.commit();
        return { success: true };
    } catch (e: any) {
        console.error("[RECHARGE_ERROR]", e.message);
        return { success: false, error: e.message };
    }
}

/**
 * 💸 2. Débiter le portefeuille d'un utilisateur.
 */
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
        const userRef = db.collection('users').doc(targetUserId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) throw new Error("Utilisateur introuvable.");
        if ((userSnap.data()?.balance || 0) < amount) throw new Error("Solde insuffisant.");

        const batch = db.batch();
        
        batch.update(userRef, {
            balance: FieldValue.increment(-amount),
            updatedAt: FieldValue.serverTimestamp()
        });

        batch.set(db.collection('admin_audit_logs').doc(), {
            adminId,
            eventType: 'user.wallet.debit',
            target: { id: targetUserId, type: 'user' },
            details: `Débit manuel de ${amount} XOF. Raison: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        await batch.commit();
        return { success: true };
    } catch (e: any) {
        console.error("[DEBIT_ERROR]", e.message);
        return { success: false, error: e.message };
    }
}

/**
 * 🔒 3 & 4. Modifier le statut d'un utilisateur (Suspendre/Réactiver).
 */
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
        const userRef = db.collection('users').doc(targetUserId);
        
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
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 🗑️ 5. Suppression Logique (Soft Delete).
 */
export async function softDeleteUserAction({
    adminId,
    targetUserId,
    reason
}: {
    adminId: string;
    targetUserId: string;
    reason: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await verifyAdminOrThrow(adminId);

        const db = getAdminDb();
        await db.collection('users').doc(targetUserId).update({ 
            status: 'deleted',
            deletedAt: FieldValue.serverTimestamp(),
            deletionReason: reason
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.delete.soft',
            target: { id: targetUserId, type: 'user' },
            details: `Suppression logique. Raison: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 🎓 6. Changer Rôle Utilisateur.
 */
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

/**
 * 🛡️ 7. Appliquer des restrictions.
 */
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

/**
 * 🔓 8. Lever toutes les restrictions.
 */
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

/**
 * 🎁 9. Offrir un cours (Grant Access).
 */
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
        const enrollmentRef = db.collection('enrollments').doc(enrollmentId);

        await enrollmentRef.set({
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
            details: `Accès gratuit au cours '${courseDoc.data()?.title}' accordé. Raison: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 🔍 10. Voir les transactions d'un utilisateur.
 */
export async function getUserTransactionsAction(adminId: string, targetUserId: string) {
    try {
        await verifyAdminOrThrow(adminId);

        const db = getAdminDb();
        const paymentsSnap = await db.collection('payments')
            .where('userId', '==', targetUserId)
            .orderBy('date', 'desc')
            .get();

        return { 
            success: true, 
            transactions: paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) 
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
