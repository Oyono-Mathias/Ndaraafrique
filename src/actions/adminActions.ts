'use server';

/**
 * @fileOverview Actions administratives sécurisées pour Ndara Afrique.
 * ✅ SÉCURITÉ : Vérification systématique du rôle Admin en base de données.
 * ✅ AUDIT : Journalisation de chaque action dans admin_audit_logs.
 * ✅ VALIDATION : Contrôle strict des montants et des états.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { NdaraUser, UserRole, Payment } from '@/lib/types';

/**
 * 🛡️ Helper interne : Vérifie si l'appelant a les droits Admin.
 * @param adminId - L'UID de l'administrateur présumé.
 */
async function verifyAdminOrThrow(adminId: string) {
    const db = getAdminDb();
    const adminDoc = await db.collection('users').doc(adminId).get();
    
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
        console.error(`[SECURITY_ALERT] Tentative d'accès admin non autorisé par UID: ${adminId}`);
        throw new Error("UNAUTHORIZED: Droits d'administrateur requis.");
    }
}

/**
 * 💰 Recharger le portefeuille d'un utilisateur.
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
}) {
    await verifyAdminOrThrow(adminId);

    if (amount <= 0) throw new Error("Le montant doit être supérieur à zéro.");

    const db = getAdminDb();
    const batch = db.batch();
    const userRef = db.collection('users').doc(targetUserId);
    const paymentRef = db.collection('payments').doc();
    const auditRef = db.collection('admin_audit_logs').doc();

    // 1. Créditer le solde
    batch.update(userRef, {
        balance: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp()
    });

    // 2. Créer la transaction
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

    // 3. Logger l'audit
    batch.set(auditRef, {
        adminId,
        eventType: 'user.wallet.recharge',
        target: { id: targetUserId, type: 'user' },
        details: `Recharge de ${amount} XOF par admin. Raison: ${reason}`,
        timestamp: FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { success: true };
}

/**
 * 💸 Débiter le portefeuille d'un utilisateur (Ex: Rectification).
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
}) {
    await verifyAdminOrThrow(adminId);

    if (amount <= 0) throw new Error("Le montant du débit doit être positif.");

    const db = getAdminDb();
    const userRef = db.collection('users').doc(targetUserId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) throw new Error("Utilisateur introuvable.");
    
    const currentBalance = userSnap.data()?.balance || 0;
    if (currentBalance < amount) throw new Error("Solde insuffisant pour ce débit.");

    const batch = db.batch();
    const paymentRef = db.collection('payments').doc();
    const auditRef = db.collection('admin_audit_logs').doc();

    batch.update(userRef, {
        balance: FieldValue.increment(-amount),
        updatedAt: FieldValue.serverTimestamp()
    });

    batch.set(paymentRef, {
        id: paymentRef.id,
        userId: targetUserId,
        amount: -amount,
        currency: 'XOF',
        provider: 'admin_debit',
        status: 'completed',
        date: FieldValue.serverTimestamp(),
        courseTitle: `Débit Admin: ${reason}`,
        metadata: { type: 'wallet_debit', adminId, reason }
    });

    batch.set(auditRef, {
        adminId,
        eventType: 'user.wallet.debit',
        target: { id: targetUserId, type: 'user' },
        details: `Débit de ${amount} XOF par admin. Raison: ${reason}`,
        timestamp: FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { success: true };
}

/**
 * 🔒 Suspendre ou Réactiver un compte utilisateur.
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
}) {
    await verifyAdminOrThrow(adminId);

    const db = getAdminDb();
    const userRef = db.collection('users').doc(targetUserId);
    
    await db.runTransaction(async (transaction) => {
        transaction.update(userRef, { 
            status,
            statusReason: reason,
            updatedAt: FieldValue.serverTimestamp()
        });

        const auditRef = db.collection('admin_audit_logs').doc();
        transaction.set(auditRef, {
            adminId,
            eventType: `user.status.${status}`,
            target: { id: targetUserId, type: 'user' },
            details: `Statut modifié en '${status}'. Raison: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });
    });

    return { success: true };
}

/**
 * 🎓 Changer le rôle d'un utilisateur.
 */
export async function changeUserRoleAction({
    adminId,
    targetUserId,
    newRole
}: {
    adminId: string;
    targetUserId: string;
    newRole: UserRole;
}) {
    await verifyAdminOrThrow(adminId);

    const db = getAdminDb();
    const userRef = db.collection('users').doc(targetUserId);

    await db.runTransaction(async (transaction) => {
        transaction.update(userRef, { 
            role: newRole,
            updatedAt: FieldValue.serverTimestamp()
        });

        const auditRef = db.collection('admin_audit_logs').doc();
        transaction.set(auditRef, {
            adminId,
            eventType: 'user.role.update',
            target: { id: targetUserId, type: 'user' },
            details: `Rôle mis à jour vers '${newRole}'.`,
            timestamp: FieldValue.serverTimestamp()
        });
    });

    return { success: true };
}

/**
 * 🗑️ Suppression "Soft Delete" d'un utilisateur.
 */
export async function softDeleteUserAction({
    adminId,
    targetUserId,
    reason
}: {
    adminId: string;
    targetUserId: string;
    reason: string;
}) {
    await verifyAdminOrThrow(adminId);

    const db = getAdminDb();
    const userRef = db.collection('users').doc(targetUserId);

    await db.runTransaction(async (transaction) => {
        transaction.update(userRef, { 
            status: 'deleted',
            deletedAt: FieldValue.serverTimestamp(),
            deletionReason: reason
        });

        const auditRef = db.collection('admin_audit_logs').doc();
        transaction.set(auditRef, {
            adminId,
            eventType: 'user.delete',
            target: { id: targetUserId, type: 'user' },
            details: `Suppression du compte (Soft delete). Raison: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });
    });

    return { success: true };
}

/**
 * 🎁 Offrir l'accès à un cours (Grant Access).
 */
export async function grantCourseAccessAction({
    adminId,
    targetUserId,
    courseId,
    reason
}: {
    adminId: string;
    targetUserId: string;
    courseId: string;
    reason: string;
}) {
    await verifyAdminOrThrow(adminId);

    const db = getAdminDb();
    const enrollmentId = `${targetUserId}_${courseId}`;
    const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
    const courseRef = db.collection('courses').doc(courseId);
    
    const courseSnap = await courseRef.get();
    if (!courseSnap.exists) throw new Error("Cours introuvable.");

    await db.runTransaction(async (transaction) => {
        transaction.set(enrollmentRef, {
            id: enrollmentId,
            studentId: targetUserId,
            courseId: courseId,
            instructorId: courseSnap.data()?.instructorId || 'SYSTEM',
            status: 'active',
            progress: 0,
            enrollmentDate: FieldValue.serverTimestamp(),
            lastAccessedAt: FieldValue.serverTimestamp(),
            priceAtEnrollment: 0,
            enrollmentType: 'admin_grant',
            grantReason: reason
        }, { merge: true });

        const auditRef = db.collection('admin_audit_logs').doc();
        transaction.set(auditRef, {
            adminId,
            eventType: 'user.course.grant',
            target: { id: targetUserId, type: 'user' },
            details: `Accès offert au cours '${courseSnap.data()?.title}'. Motif: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });
    });

    return { success: true };
}

/**
 * 🧾 Récupérer l'historique financier d'un utilisateur.
 */
export async function getUserFinanceHistoryAction({
    adminId,
    targetUserId
}: {
    adminId: string;
    targetUserId: string;
}) {
    await verifyAdminOrThrow(adminId);

    const db = getAdminDb();
    const paymentsSnap = await db.collection('payments')
        .where('userId', '==', targetUserId)
        .orderBy('date', 'desc')
        .limit(50)
        .get();

    return paymentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Payment[];
}
