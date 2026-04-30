'use server';

/**
 * @fileOverview Actions administratives hautement sécurisées pour Ndara Afrique.
 * ✅ SÉCURITÉ : Vérification systématique du rôle Admin côté serveur via Firestore.
 * ✅ TRANSACTIONNEL : Utilisation de db.runTransaction pour les flux financiers.
 * ✅ AUTH SYNC : Suppression réelle du compte dans Firebase Auth.
 */

import { getAdminDb, getAdminAuth } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
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

            transaction.update(userRef, {
                balance: FieldValue.increment(amount),
                updatedAt: FieldValue.serverTimestamp()
            });

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

/** 💰 2. Débiter le portefeuille (Transactionnel) */
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
            if (currentBalance < amount) throw new Error("Solde insuffisant pour le débit.");

            transaction.update(userRef, {
                balance: FieldValue.increment(-amount),
                updatedAt: FieldValue.serverTimestamp()
            });

            const paymentRef = db.collection('payments').doc();
            transaction.set(paymentRef, {
                id: paymentRef.id,
                userId: targetUserId,
                amount: amount,
                currency: 'XOF',
                provider: 'admin_debit',
                status: 'completed',
                date: FieldValue.serverTimestamp(),
                courseTitle: `Débit Admin: ${reason}`,
                metadata: { type: 'wallet_debit', adminId, reason }
            });

            const auditRef = db.collection('admin_audit_logs').doc();
            transaction.set(auditRef, {
                adminId,
                eventType: 'user.wallet.debit',
                target: { id: targetUserId, type: 'user' },
                details: `Débit de ${amount} XOF. Raison: ${reason}`,
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

        if (status === 'suspended') {
            await getAdminAuth().revokeRefreshTokens(targetUserId);
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🎓 4. Changer Rôle */
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

/** 🚫 5. Appliquer des restrictions */
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
}): Promise<{ success: boolean; error?: string }> {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();
        
        await db.collection('users').doc(targetUserId).update({ 
            restrictions,
            restrictionReason: reason,
            updatedAt: FieldValue.serverTimestamp()
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.restrictions.apply',
            target: { id: targetUserId, type: 'user' },
            details: `Restrictions appliquées. Raison: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** ✅ 6. Lever les restrictions */
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
            restrictionReason: FieldValue.delete(),
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

/** ⚠️ 7. Marquer/Lever suspicion */
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
            eventType: isSuspect ? 'user.suspect.mark' : 'user.suspect.clear',
            target: { id: targetUserId, type: 'user' },
            details: isSuspect ? `Marqué comme suspect. Raison: ${reason}` : `Suspicion levée.`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 🗑️ 8. Suppression définitive (Action Irréversible & Synchronisée) */
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

        console.log(`[AUTH_SYNC] Début de suppression totale pour UID: ${targetUserId}`);

        // 1. Suppression du compte dans Firebase Auth (Identité réelle)
        try {
            await auth.deleteUser(targetUserId);
            console.log(`[AUTH_SYNC] Identité Auth supprimée.`);
        } catch (authError: any) {
            if (authError.code !== 'auth/user-not-found') {
                throw new Error(`Erreur Auth Admin: ${authError.message}`);
            }
        }

        // 2. Marquage "deleted" pour intégrité des logs (recommandé en fintech)
        await db.collection('users').doc(targetUserId).update({
            status: 'deleted',
            deletedAt: FieldValue.serverTimestamp(),
            fullName: 'Utilisateur Supprimé',
            email: `deleted_${targetUserId}@ndara.africa`,
            username: `deleted_${targetUserId.substring(0, 5)}`,
            profilePictureURL: '',
            balance: 0,
            affiliateBalance: 0
        });

        // 3. Log d'audit immuable
        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.delete.hard',
            target: { id: targetUserId, type: 'user' },
            details: `Suppression définitive effectuée par l'admin ${adminId}. Identité révoquée.`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        console.error(`[AUTH_SYNC_ERROR]`, e.message);
        return { success: false, error: e.message };
    }
}

/** 🔐 9. Réinitialiser Mot de Passe (Lien sécurisé) */
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

/** 🧪 10. Script de Migration : Normalisation des statuts de paiement */
export async function migratePaymentStatusesAction(adminId: string) {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();
        const paymentsRef = db.collection('payments');
        
        // On récupère les paiements qui pourraient avoir une mauvaise casse
        const snapshot = await paymentsRef.get();
        const batch = db.batch();
        let count = 0;

        snapshot.forEach(doc => {
            const currentStatus = doc.data().status;
            if (currentStatus && currentStatus !== currentStatus.toLowerCase()) {
                batch.update(doc.ref, { status: currentStatus.toLowerCase() });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
        }

        return { success: true, migratedCount: count };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
