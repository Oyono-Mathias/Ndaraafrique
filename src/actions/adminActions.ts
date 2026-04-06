'use server';

/**
 * @fileOverview Actions administratives sécurisées pour Ndara Afrique.
 * ✅ SÉCURITÉ : Vérification systématique du rôle Admin en base de données.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserRole } from '@/lib/types';

/**
 * 🛡️ Helper interne : Vérifie si l'appelant a réellement les droits Admin dans Firestore.
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

    if (amount <= 0) throw new Error("Le montant doit être positif.");
    if (!reason.trim()) throw new Error("Un motif est obligatoire.");

    const db = getAdminDb();
    const batch = db.batch();
    const userRef = db.collection('users').doc(targetUserId);
    const paymentRef = db.collection('payments').doc();
    const auditRef = db.collection('admin_audit_logs').doc();

    batch.update(userRef, {
        balance: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp()
    });

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

    batch.set(auditRef, {
        adminId,
        eventType: 'user.wallet.recharge',
        target: { id: targetUserId, type: 'user' },
        details: `Injection de ${amount} XOF. Raison: ${reason}`,
        timestamp: FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { success: true };
}

/**
 * 💸 Débiter le portefeuille d'un utilisateur.
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
}

/**
 * 🔒 Modifier le statut d'un utilisateur (Suspendre/Réactiver).
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
}

/**
 * 🚫 Appliquer des restrictions à un utilisateur.
 */
export async function applyUserRestrictionsAction({
    adminId,
    targetUserId,
    restrictions,
    reason
}: {
    adminId: string;
    targetUserId: string;
    restrictions: any;
    reason: string;
}) {
    await verifyAdminOrThrow(adminId);

    const db = getAdminDb();
    await db.collection('users').doc(targetUserId).update({
        restrictions,
        sanctions: {
            isSanctioned: true,
            reason,
            imposedBy: adminId,
            date: FieldValue.serverTimestamp()
        },
        updatedAt: FieldValue.serverTimestamp()
    });

    return { success: true };
}

/**
 * 🔓 Lever toutes les restrictions.
 */
export async function removeUserRestrictionsAction({
    adminId,
    targetUserId
}: {
    adminId: string;
    targetUserId: string;
}) {
    await verifyAdminOrThrow(adminId);

    const db = getAdminDb();
    await db.collection('users').doc(targetUserId).update({
        restrictions: FieldValue.delete(),
        sanctions: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp()
    });

    return { success: true };
}

/**
 * 🗑️ Suppression Logique.
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
    await db.collection('users').doc(targetUserId).update({ 
        status: 'deleted',
        deletedAt: FieldValue.serverTimestamp(),
        deletionReason: reason
    });

    return { success: true };
}

/**
 * 🎓 Changer Rôle.
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
    await db.collection('users').doc(targetUserId).update({ 
        role: newRole,
        updatedAt: FieldValue.serverTimestamp()
    });

    return { success: true };
}
