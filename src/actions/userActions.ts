'use server';

/**
 * @fileOverview Actions serveur pour la gestion des membres Ndara Afrique.
 * ✅ SÉCURITÉ : Gestion stricte des achats de formation.
 */

import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserRole, NdaraUser } from '@/lib/types';
import { sendUserNotification } from './notificationActions';
import { processNdaraPayment } from '@/services/paymentProcessor';

/** 🛡️ Vérifie si l'appelant est réellement admin dans Firestore */
async function verifyAdminOrThrow(uid: string) {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        throw new Error("UNAUTHORIZED_ACCESS: Requester is not an admin.");
    }
}

/** 
 * 💰 ACHAT DE COURS VIA WALLET (Transactionnel) 
 * SÉCURISÉ : Vérifie l'existence, les doublons et le solde.
 */
export async function purchaseCourseWithWalletAction({
    userId,
    courseId,
    amount
}: {
    userId: string;
    courseId: string;
    amount: number;
}) {
    try {
        const db = getAdminDb();
        
        // 1. Vérification d'existence du cours
        const courseRef = db.collection('courses').doc(courseId);
        const courseSnap = await courseRef.get();
        if (!courseSnap.exists) return { success: false, error: "COURS_NON_TROUVÉ" };
        const courseData = courseSnap.data();

        // 2. Vérification de doublon (Déjà acheté ?)
        const enrollmentId = `${userId}_${courseId}`;
        const enrollmentSnap = await db.collection('enrollments').doc(enrollmentId).get();
        if (enrollmentSnap.exists) return { success: false, error: "DEJA_ACHETE" };

        // 3. Vérification du solde utilisateur
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data() as NdaraUser;
        const currentBalance = userData.balance || 0;

        if (currentBalance < amount) {
            return { success: false, error: "SOLDE_INSUFFISANT" };
        }

        // 4. Appel du processeur financier pour l'exécution atomique
        const result = await processNdaraPayment({
            transactionId: `WAL-PUR-${Date.now()}-${userId.substring(0,5)}`,
            provider: 'wallet',
            amount: amount,
            currency: 'XOF',
            metadata: { 
                userId, 
                courseId, 
                courseTitle: courseData?.title,
                type: 'course_purchase',
                isSimulated: false 
            }
        });

        if (result.success) {
            await sendUserNotification(userId, {
                text: `Félicitations ! Vous avez acquis la formation "${courseData?.title}" via votre wallet.`,
                type: 'success',
                link: `/student/courses/${courseId}`
            });
            return { success: true };
        }
        
        return { success: false, error: "ERREUR_TRANSACTION" };
    } catch (e: any) {
        console.error("[WALLET_PURCHASE_ERROR]:", e.message);
        return { success: false, error: e.message };
    }
}

/** 
 * 💰 RECHARGER LE WALLET (Action Admin Sécurisée)
 */
export async function rechargeUserWallet({ 
    userId, 
    amount, 
    adminId,
    reason,
    isSimulated = false
}: { 
    userId: string; 
    amount: number; 
    adminId: string;
    reason: string;
    isSimulated?: boolean;
}) {
    try {
        await verifyAdminOrThrow(adminId);

        if (amount <= 0) return { success: false, error: "error.amount_positive" };

        const result = await processNdaraPayment({
            transactionId: `ADM-TOP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            provider: isSimulated ? 'admin_recharge_test' : 'admin_recharge',
            amount: amount,
            currency: 'XOF',
            metadata: { 
                userId, 
                courseId: 'WALLET_TOPUP',
                type: 'wallet_topup', 
                adminId, 
                reason,
                isSimulated 
            }
        });

        if (result.success) {
            const fondsLabel = isSimulated ? "virtuel (simulation)" : "réel (production)";
            await sendUserNotification(userId, {
                text: `Votre compte a été crédité de ${amount.toLocaleString()} XOF en solde ${fondsLabel} par l'administration.`,
                type: 'success'
            });
            return { success: true };
        }
        
        return { success: false, error: "error.generic" };
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
        await verifyAdminOrThrow(adminId);

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
        await verifyAdminOrThrow(adminId);

        const db = getAdminDb();
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) return { success: false, error: "error.course_not_found" };

        const enrollmentRef = db.collection('enrollments').doc(`${studentId}_${courseId}`);
        
        let expiresAt = null;
        if (expirationInDays) {
            expiresAt = new Date(Date.now() + expirationInDays * 86400000);
        } else if (expirationMinutes) {
            expiresAt = new Date(Date.now() + expirationMinutes * 60000);
        }

        const enrollmentData = {
            studentId,
            courseId,
            instructorId: courseDoc.data()?.instructorId || '',
            status: 'active',
            progress: 0,
            enrollmentDate: FieldValue.serverTimestamp(),
            lastAccessedAt: FieldValue.serverTimestamp(),
            expiresAt: expiresAt,
            grantReason: reason,
            grantedBy: adminId
        };

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
    if (userId !== requesterId) {
        try { await verifyAdminOrThrow(requesterId); }
        catch(e) { return { success: false, error: "error.not_authorized" }; }
    }
    const db = getAdminDb();
    await db.collection('users').doc(userId).update(data);
    return { success: true, message: "success.profile_updated" };
}
