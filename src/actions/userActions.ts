'use server';

/**
 * @fileOverview Actions serveur pour la gestion des membres Ndara Afrique.
 * ✅ SÉCURITÉ : Nettoyage des objets pour Firestore (Anti-undefined).
 */

import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { UserRole, NdaraUser } from '@/lib/types';
import { sendUserNotification } from './notificationActions';

/**
 * Nettoie un objet des valeurs undefined pour Firestore.
 */
function sanitize(obj: any): any {
    return JSON.parse(JSON.stringify(obj, (key, value) => value === undefined ? null : value));
}

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
 * RECHARGER LE WALLET RÉEL (Action Admin)
 */
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
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "error.admin_only" };

    if (amount <= 0) return { success: false, error: "error.amount_positive" };

    try {
        const db = getAdminDb();
        const batch = db.batch();
        const userRef = db.collection('users').doc(userId);
        const auditRef = db.collection('admin_audit_logs').doc();
        const paymentRef = db.collection('payments').doc();

        batch.update(userRef, {
            balance: FieldValue.increment(amount),
            updatedAt: FieldValue.serverTimestamp()
        });

        // 🛡️ Nettoyage des données avant envoi
        const paymentData = sanitize({
            id: paymentRef.id,
            userId,
            amount,
            currency: 'XOF',
            provider: 'admin_recharge',
            status: 'completed',
            date: FieldValue.serverTimestamp(),
            courseTitle: `Recharge Admin: ${reason}`,
            metadata: { type: 'wallet_topup', adminId, reason }
        });

        batch.set(paymentRef, paymentData);

        batch.set(auditRef, sanitize({
            adminId,
            eventType: 'user.wallet.recharge',
            target: { id: userId, type: 'user' },
            details: `Recharge réelle de ${amount} XOF effectuée. Motif: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        }));

        await batch.commit();
        return { success: true, message: "success.wallet_recharged" };
    } catch (e: any) {
        console.error("[RechargeWallet] Firestore Error:", e.message);
        return { success: false, error: "error.generic" };
    }
}

/**
 * RECHARGER LE SOLDE VIRTUEL (Action Admin - Ads Factory)
 */
export async function rechargeVirtualBalanceAction({ 
    userId, 
    amount, 
    adminId 
}: { 
    userId: string; 
    amount: number; 
    adminId: string;
}) {
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "error.admin_only" };

    try {
        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);
        
        await userRef.update({
            virtualBalance: FieldValue.increment(amount),
            updatedAt: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: "error.generic" };
    }
}

/**
 * APPROUVER OU REJETER UNE CANDIDATURE EXPERT
 */
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
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "error.admin_only" };

    try {
        const db = getAdminDb();
        const batch = db.batch();
        const userRef = db.collection('users').doc(userId);

        if (decision === 'accepted') {
            batch.update(userRef, {
                isInstructorApproved: true,
                role: 'instructor',
                'instructorApplication.status': 'accepted',
                'instructorApplication.decisionDate': FieldValue.serverTimestamp(),
                'instructorApplication.feedback': message,
                updatedAt: FieldValue.serverTimestamp()
            });
        } else {
            batch.update(userRef, {
                isInstructorApproved: false,
                'instructorApplication.status': 'rejected',
                'instructorApplication.decisionDate': FieldValue.serverTimestamp(),
                'instructorApplication.feedback': message,
                updatedAt: FieldValue.serverTimestamp()
            });
        }

        const auditRef = db.collection('admin_audit_logs').doc();
        batch.set(auditRef, {
            adminId,
            eventType: 'instructor.application',
            target: { id: userId, type: 'user' },
            details: `Candidature instructeur ${decision}. Message: ${message}`,
            timestamp: FieldValue.serverTimestamp()
        });

        await batch.commit();
        
        await sendUserNotification(userId, {
            text: decision === 'accepted' 
                ? "Félicitations ! Votre compte Expert Ndara a été approuvé." 
                : "Votre candidature Expert a été refusée après examen.",
            link: decision === 'accepted' ? '/instructor/dashboard' : '/student/support',
            type: decision === 'accepted' ? 'success' : 'alert'
        });

        return { success: true };
    } catch (e: any) {
        console.error("Approve Application Error:", e);
        return { success: false, error: "error.generic" };
    }
}

/**
 * SUPPRIMER DÉFINITIVEMENT UN COMPTE (Action Admin)
 */
export async function deleteUserAccount({ userId, adminId }: { userId: string, adminId: string }) {
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "error.admin_only" };

    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        
        await auth.deleteUser(userId);
        await db.collection('users').doc(userId).delete();

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.delete',
            target: { id: userId, type: 'user' },
            details: `Utilisateur ${userId} supprimé par l'admin.`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true, message: "success.generic" };
    } catch (e: any) {
        console.error("Delete Account Error:", e);
        return { success: false, error: "error.generic" };
    }
}

/**
 * CRÉER UN COMPTE DE DÉMONSTRATION ÉLITE
 */
export async function createEliteDemoAccountAction({ 
    role, 
    adminId 
}: { 
    role: UserRole; 
    adminId: string; 
}) {
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "error.admin_only" };

    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        
        const timestamp = Date.now();
        const email = `demo_${role}_${timestamp}@ndara-afrique.demo`;
        const fullName = role === 'instructor' ? 'Expert Ndara (Demo)' : 'Étudiant Elite (Demo)';
        
        const userRecord = await auth.createUser({
            email,
            password: 'password123',
            displayName: fullName,
        });

        const userData: Partial<NdaraUser> = {
            uid: userRecord.uid,
            email,
            fullName,
            username: `ndara_demo_${timestamp}`,
            role,
            status: 'active',
            isInstructorApproved: role === 'instructor',
            isDemoAccount: true,
            virtualBalance: 500000,
            createdAt: FieldValue.serverTimestamp(),
            isProfileComplete: true,
            affiliateStats: { clicks: 120, registrations: 45, sales: 12, earnings: 150000 },
            affiliateBalance: 75000,
            profilePictureURL: `https://api.dicebear.com/8.x/avataaars/svg?seed=${userRecord.uid}`
        };

        await db.collection('users').doc(userRecord.uid).set(sanitize(userData));

        return { success: true, email, password: 'password123' };
    } catch (e: any) {
        return { success: false, error: "error.generic" };
    }
}

/**
 * ACCORDE L'ACCÈS À UN COURS
 */
export async function grantCourseAccess({
    studentId,
    courseId,
    adminId,
    reason,
    expirationInDays,
    expirationMinutes,
}: {
    studentId: string;
    courseId: string;
    adminId: string;
    reason: string;
    expirationInDays?: number;
    expirationMinutes?: number;
}) {
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) return { success: false, error: "error.course_not_found" };

        const enrollmentRef = db.collection('enrollments').doc(`${studentId}_${courseId}`);
        
        let expiresAt = null;
        if (expirationInDays) {
            expiresAt = Timestamp.fromMillis(Date.now() + expirationInDays * 86400000);
        } else if (expirationMinutes) {
            expiresAt = Timestamp.fromMillis(Date.now() + expirationMinutes * 60000);
        }

        batch.set(enrollmentRef, sanitize({
            studentId,
            courseId,
            instructorId: courseDoc.data()?.instructorId || '',
            status: 'active',
            progress: 0,
            enrollmentDate: FieldValue.serverTimestamp(),
            lastAccessedAt: FieldValue.serverTimestamp(),
            expiresAt
        }), { merge: true });

        batch.set(db.collection('admin_audit_logs').doc(), {
            adminId,
            eventType: 'course.grant',
            target: { id: studentId, type: 'user' },
            details: `Accès au cours "${courseDoc.data()?.title}" accordé. Motif: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        await batch.commit();
        return { success: true, message: "success.course_granted" };
    } catch (e: any) {
        return { success: false, error: "error.generic" };
    }
}

export async function updateUserProfileAction({ userId, data, requesterId }: { userId: string, data: any, requesterId: string }) {
    try {
        const db = getAdminDb();
        await db.collection('users').doc(userId).update(sanitize(data));
        return { success: true, message: "success.profile_updated" };
    } catch (error: any) {
        return { success: false, error: "error.generic" };
    }
}

export async function updateUserStatus({ userId, status, adminId }: { userId: string, status: string, adminId: string }) {
    try {
        const db = getAdminDb();
        await db.collection('users').doc(userId).update({ status });
        return { success: true, message: "success.generic" };
    } catch (e: any) {
        return { success: false, error: "error.generic" };
    }
}

export async function updateUserRole({ userId, role, adminId }: { userId: string, role: string, adminId: string }) {
    try {
        const db = getAdminDb();
        await db.collection('users').doc(userId).update({ role });
        return { success: true, message: "success.generic" };
    } catch (e: any) {
        return { success: false, error: "error.generic" };
    }
}