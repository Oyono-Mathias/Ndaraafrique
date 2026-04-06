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
 * 🛡️ Helper interne : Vérifie si l'appelant a réellement les droits Admin dans Firestore.
 * On ne se fie jamais à l'ID passé par le client sans vérifier son statut en DB.
 */
async function verifyAdminOrThrow(adminId: string) {
    const db = getAdminDb();
    const adminDoc = await db.collection('users').doc(adminId).get();
    
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin' || adminDoc.data()?.status !== 'active') {
        console.error(`[SECURITY_ALERT] Tentative d'accès non autorisé par UID: ${adminId}`);
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

    // VALIDATION DES ENTRÉES
    if (amount <= 0) throw new Error("Le montant doit être supérieur à zéro.");
    if (!reason.trim()) throw new Error("Un motif est obligatoire pour l'audit.");

    const db = getAdminDb();
    const batch = db.batch();
    const userRef = db.collection('users').doc(targetUserId);
    const paymentRef = db.collection('payments').doc();
    const auditRef = db.collection('admin_audit_logs').doc();

    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error("Utilisateur cible introuvable.");

    // 1. Créditer le solde
    batch.update(userRef, {
        balance: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp()
    });

    // 2. Créer la transaction financière
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

    // 3. Journalisation de l'audit (Immuable)
    batch.set(auditRef, {
        adminId,
        eventType: 'user.wallet.recharge',
        target: { id: targetUserId, type: 'user' },
        details: `Recharge manuelle de ${amount} XOF par admin. Raison: ${reason}`,
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
    if (!reason.trim()) throw new Error("Un motif est obligatoire.");

    const db = getAdminDb();
    const userRef = db.collection('users').doc(targetUserId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) throw new Error("Utilisateur introuvable.");
    
    const currentBalance = userSnap.data()?.balance || 0;
    if (currentBalance < amount) throw new Error("Solde insuffisant pour effectuer ce débit.");

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
        details: `Débit manuel de ${amount} XOF par admin. Raison: ${reason}`,
        timestamp: FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { success: true };
}

/**
 * 🚫 Appliquer des restrictions à un utilisateur (Sanction).
 */
export async function applyUserRestrictionsAction({
    adminId,
    targetUserId,
    restrictions,
    reason,
    expirationDays
}: {
    adminId: string;
    targetUserId: string;
    restrictions: any;
    reason: string;
    expirationDays?: number;
}) {
    await verifyAdminOrThrow(adminId);

    if (!reason.trim()) throw new Error("Un motif de restriction est requis.");

    const db = getAdminDb();
    const userRef = db.collection('users').doc(targetUserId);
    
    const expiresAt = expirationDays 
        ? Timestamp.fromDate(new Date(Date.now() + expirationDays * 86400000))
        : null;

    await userRef.update({
        restrictions,
        sanctions: {
            isSanctioned: true,
            reason,
            imposedBy: adminId,
            date: FieldValue.serverTimestamp(),
            expiresAt
        },
        updatedAt: FieldValue.serverTimestamp()
    });

    await db.collection('admin_audit_logs').add({
        adminId,
        eventType: 'user.restrictions.apply',
        target: { id: targetUserId, type: 'user' },
        details: `Sanctions appliquées : ${reason}. Expiration: ${expirationDays || 'Permanente'}`,
        timestamp: FieldValue.serverTimestamp()
    });

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

    if (!reason.trim()) throw new Error("Veuillez motiver cette action de statut.");

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

    if (!reason.trim()) throw new Error("Le motif de suppression est obligatoire pour l'audit légal.");

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
            details: `Suppression logique (Soft delete). Raison: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });
    });

    return { success: true };
}