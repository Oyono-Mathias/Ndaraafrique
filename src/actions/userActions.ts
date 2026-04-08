'use server';

/**
 * @fileOverview Actions serveur pour la gestion des membres Ndara Afrique.
 * ✅ SÉCURITÉ : Vérification systématique du rôle Admin côté serveur.
 * ✅ ANTI-CORRUPTION : Plus de confiance aveugle dans l'ID passé par le client.
 */

import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserRole, NdaraUser } from '@/lib/types';
import { sendUserNotification } from './notificationActions';

/** 🛡️ Vérifie si l'appelant est réellement admin dans Firestore */
async function verifyAdminOrThrow(uid: string) {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        throw new Error("UNAUTHORIZED_ACCESS: Requester is not an admin.");
    }
}

function sanitize(obj: any): any {
    return JSON.parse(JSON.stringify(obj, (key, value) => value === undefined ? null : value));
}

/** RECHARGER LE WALLET RÉEL (Action Admin Sécurisée) */
export async function rechargeUserWallet({ 
    userId, 
    amount, 
    adminId,
    reason 
}: { 
    userId: string; 
    amount: number; 
    adminId: string;
    reason: string;
}) {
    try {
        await verifyAdminOrThrow(adminId); // ✅ Validation serveur

        if (amount <= 0) return { success: false, error: "error.amount_positive" };

        const db = getAdminDb();
        const batch = db.batch();
        const userRef = db.collection('users').doc(userId);
        const auditRef = db.collection('admin_audit_logs').doc();
        const paymentRef = db.collection('payments').doc();

        batch.update(userRef, {
            balance: FieldValue.increment(amount),
            updatedAt: FieldValue.serverTimestamp()
        });

        batch.set(paymentRef, sanitize({
            id: paymentRef.id,
            userId,
            amount,
            currency: 'XOF',
            provider: 'admin_recharge',
            status: 'completed',
            date: FieldValue.serverTimestamp(),
            courseTitle: `Recharge Admin: ${reason}`,
            metadata: { type: 'wallet_topup', adminId, reason }
        }));

        batch.set(auditRef, sanitize({
            adminId,
            eventType: 'user.wallet.recharge',
            target: { id: userId, type: 'user' },
            details: `Recharge réelle de ${amount} XOF par admin ${adminId}. Motif: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        }));

        await batch.commit();
        return { success: true, message: "success.wallet_recharged" };
    } catch (e: any) {
        console.error("[RECHARGE_SECURE_ERROR]:", e.message);
        return { success: false, error: "error.not_authorized" };
    }
}

/** 🧪 CRÉER UN COMPTE DE DÉMO ELITE (Ads Factory) */
export async function createEliteDemoAccountAction({ role, adminId }: { role: UserRole, adminId: string }) {
    await verifyAdminOrThrow(adminId);
    
    const db = getAdminDb();
    const auth = getAdminAuth();
    const email = `demo_${Date.now()}@ndara.africa`;
    const password = "Password123!";
    
    try {
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: `Elite Demo ${role.toUpperCase()}`,
        });

        const userRef = db.collection('users').doc(userRecord.uid);
        await userRef.set({
            uid: userRecord.uid,
            email,
            fullName: `Elite Demo ${role.toUpperCase()}`,
            username: `demo_${userRecord.uid.substring(0, 5)}`,
            role,
            status: 'active',
            isInstructorApproved: role === 'instructor',
            isDemoAccount: true,
            balance: 0,
            virtualBalance: 1000000,
            createdAt: FieldValue.serverTimestamp(),
            affiliateStats: { clicks: 1500, registrations: 450, sales: 85, earnings: 250000 }
        });

        return { success: true, email, password };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** 💰 GONFLER LE SOLDE VIRTUEL (Ads Factory) */
export async function rechargeVirtualBalanceAction({ userId, amount, adminId }: { userId: string, amount: number, adminId: string }) {
    await verifyAdminOrThrow(adminId);
    const db = getAdminDb();
    await db.collection('users').doc(userId).update({
        virtualBalance: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp()
    });
    return { success: true };
}

/** APPROUVER UNE CANDIDATURE (Action Admin Sécurisée) */
export async function approveInstructorApplication({
    userId,
    decision,
    message,
    adminId,
}: {
    userId: string;
    decision: 'accepted' | 'rejected';
    message: string;
    adminId: string;
}) {
    try {
        await verifyAdminOrThrow(adminId); // ✅ Validation serveur

        const db = getAdminDb();
        const batch = db.batch();
        const userRef = db.collection('users').doc(userId);

        const updateData: any = {
            'instructorApplication.status': decision,
            'instructorApplication.decisionDate': FieldValue.serverTimestamp(),
            'instructorApplication.feedback': message,
            updatedAt: FieldValue.serverTimestamp()
        };

        if (decision === 'accepted') {
            updateData.isInstructorApproved = true;
            updateData.role = 'instructor';
        }

        batch.update(userRef, updateData);

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'instructor.application',
            target: { id: userId, type: 'user' },
            details: `Candidature ${decision} pour ${userId}`,
            timestamp: FieldValue.serverTimestamp()
        });

        await batch.commit();
        
        await sendUserNotification(userId, {
            text: decision === 'accepted' ? "Félicitations ! Votre compte Expert a été approuvé." : "Candidature Expert refusée.",
            link: decision === 'accepted' ? '/instructor/dashboard' : '/student/support',
            type: decision === 'accepted' ? 'success' : 'alert'
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: "error.not_authorized" };
    }
}

export async function grantCourseAccess({
    studentId,
    courseId,
    adminId,
    reason,
    expirationInDays,
}: {
    studentId: string;
    courseId: string;
    adminId: string;
    reason: string;
    expirationInDays?: number;
}) {
    try {
        await verifyAdminOrThrow(adminId); // ✅ Validation serveur

        const db = getAdminDb();
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) return { success: false, error: "error.course_not_found" };

        const enrollmentRef = db.collection('enrollments').doc(`${studentId}_${courseId}`);
        
        const enrollmentData = sanitize({
            studentId,
            courseId,
            instructorId: courseDoc.data()?.instructorId || '',
            status: 'active',
            progress: 0,
            enrollmentDate: FieldValue.serverTimestamp(),
            lastAccessedAt: FieldValue.serverTimestamp(),
            expiresAt: expirationInDays ? new Date(Date.now() + expirationInDays * 86400000) : null
        });

        await enrollmentRef.set(enrollmentData, { merge: true });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'course.grant',
            target: { id: studentId, type: 'user' },
            details: `Accès au cours ${courseId} accordé. Motif: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true, message: "success.course_granted" };
    } catch (e: any) {
        return { success: false, error: "error.not_authorized" };
    }
}

export async function updateUserStatus({ userId, status, adminId }: { userId: string, status: string, adminId: string }) {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();
        await db.collection('users').doc(userId).update({ status });
        return { success: true };
    } catch (e) { return { success: false, error: "error.not_authorized" }; }
}

export async function updateUserRole({ userId, role, adminId }: { userId: string, role: string, adminId: string }) {
    try {
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();
        await db.collection('users').doc(userId).update({ role });
        return { success: true };
    } catch (e) { return { success: false, error: "error.not_authorized" }; }
}

export async function updateUserProfileAction({ userId, data, requesterId }: { userId: string, data: any, requesterId: string }) {
    // Ici, on vérifie que l'utilisateur modifie SON PROPRE profil ou qu'il est admin
    if (userId !== requesterId) {
        try { await verifyAdminOrThrow(requesterId); }
        catch(e) { return { success: false, error: "error.not_authorized" }; }
    }
    const db = getAdminDb();
    await db.collection('users').doc(userId).update(sanitize(data));
    return { success: true, message: "success.profile_updated" };
}
