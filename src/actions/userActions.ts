'use server';

/**
 * @fileOverview Actions serveur pour la gestion des membres Ndara Afrique.
 * ✅ RÉSOLU : Ajout du système de solde virtuel et réel.
 */

import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { UserRole, NdaraUser } from '@/lib/types';

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
 * Utilisé pour créditer manuellement un compte (dépôt physique, correction, etc.)
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
    if (!isAdmin) return { success: false, error: "Action réservée aux administrateurs." };

    if (amount <= 0) return { success: false, error: "Le montant doit être positif." };

    try {
        const db = getAdminDb();
        const batch = db.batch();
        const userRef = db.collection('users').doc(userId);
        const auditRef = db.collection('admin_audit_logs').doc();
        const paymentRef = db.collection('payments').doc();

        // 1. Mise à jour du solde
        batch.update(userRef, {
            balance: FieldValue.increment(amount),
            updatedAt: FieldValue.serverTimestamp()
        });

        // 2. Création du reçu de transaction
        batch.set(paymentRef, {
            id: paymentRef.id,
            userId,
            amount,
            currency: 'XOF',
            provider: 'admin_recharge',
            status: 'Completed',
            date: FieldValue.serverTimestamp(),
            courseTitle: `Recharge Admin: ${reason}`,
            metadata: {
                type: 'wallet_topup',
                adminId,
                reason
            }
        });

        // 3. Journal d'audit
        batch.set(auditRef, {
            adminId,
            eventType: 'user.wallet.recharge',
            target: { id: userId, type: 'user' },
            details: `Recharge réelle de ${amount} XOF effectuée. Motif: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        await batch.commit();
        return { success: true };
    } catch (e: any) {
        console.error("RECHARGE_WALLET_ERROR:", e);
        return { success: false, error: e.message };
    }
}

/**
 * RECHARGER LE SOLDE VIRTUEL (Demo Mode)
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
    if (!isAdmin) return { success: false, error: "Action réservée aux administrateurs." };

    try {
        const db = getAdminDb();
        await db.collection('users').doc(userId).update({
            virtualBalance: FieldValue.increment(amount),
            isDemoAccount: true,
            updatedAt: FieldValue.serverTimestamp()
        });

        // Logger dans l'audit
        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.status.update',
            target: { id: userId, type: 'user' },
            details: `Recharge virtuelle de ${amount} XOF effectuée (Mode Publicité).`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
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
    if (!isAdmin) return { success: false, error: "Action réservée aux administrateurs." };

    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        
        const timestamp = Date.now();
        const email = `demo_${role}_${timestamp}@ndara-afrique.demo`;
        const fullName = role === 'instructor' ? 'Expert Ndara (Demo)' : 'Étudiant Elite (Demo)';
        
        // 1. Création Auth
        const userRecord = await auth.createUser({
            email,
            password: 'password123',
            displayName: fullName,
        });

        // 2. Création Profil Firestore
        const userData: Partial<NdaraUser> = {
            uid: userRecord.uid,
            email,
            fullName,
            username: `ndara_demo_${timestamp}`,
            role,
            status: 'active',
            isInstructorApproved: role === 'instructor',
            isDemoAccount: true,
            virtualBalance: 500000, // Commence avec 500k pour la démo
            createdAt: FieldValue.serverTimestamp(),
            isProfileComplete: true,
            affiliateStats: { clicks: 120, registrations: 45, sales: 12, earnings: 150000 },
            affiliateBalance: 75000,
            profilePictureURL: `https://api.dicebear.com/8.x/avataaars/svg?seed=${userRecord.uid}`
        };

        await db.collection('users').doc(userRecord.uid).set(userData);

        return { success: true, email, password: 'password123' };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * RÉPARER LES STATISTIQUES DES COURS (Sync Ratings)
 */
export async function syncAllCourseStatsAction(adminId: string) {
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "Action réservée aux administrateurs." };

    try {
        const db = getAdminDb();
        const coursesSnap = await db.collection('courses').get();
        let count = 0;

        for (const courseDoc of coursesSnap.docs) {
            const courseId = courseDoc.id;
            const reviewsSnap = await db.collection('course_reviews').where('courseId', '==', courseId).get();
            
            if (!reviewsSnap.empty) {
                const reviewsData = reviewsSnap.docs.map(d => d.data());
                const total = reviewsData.length;
                const avg = reviewsData.reduce((acc, curr) => acc + (curr.rating || 0), 0) / total;
                
                await courseDoc.ref.update({
                    rating: Number(avg.toFixed(1)),
                    participantsCount: total
                });
                count++;
            } else {
                await courseDoc.ref.update({
                    rating: 0,
                    participantsCount: 0
                });
            }
        }
        
        return { success: true, count };
    } catch (e: any) {
        return { success: false, error: e.message };
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
        if (!courseDoc.exists) return { success: false, error: "Cours introuvable." };

        const enrollmentRef = db.collection('enrollments').doc(`${studentId}_${courseId}`);
        
        let expiresAt = null;
        if (expirationInDays) {
            expiresAt = Timestamp.fromMillis(Date.now() + expirationInDays * 86400000);
        } else if (expirationMinutes) {
            expiresAt = Timestamp.fromMillis(Date.now() + expirationMinutes * 60000);
        }

        batch.set(enrollmentRef, {
            studentId,
            courseId,
            instructorId: courseDoc.data()?.instructorId || '',
            status: 'active',
            progress: 0,
            enrollmentDate: FieldValue.serverTimestamp(),
            lastAccessedAt: FieldValue.serverTimestamp(),
            expiresAt
        }, { merge: true });

        const logRef = db.collection('admin_audit_logs').doc();
        batch.set(logRef, {
            adminId,
            eventType: 'course.grant',
            target: { id: studentId, type: 'user' },
            details: `Accès au cours "${courseDoc.data()?.title}" accordé. Motif: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        await batch.commit();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * RÉPARER LES CERTIFICATS (MASS SYNC)
 */
export async function repairAllCertificatesAction(adminId: string) {
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "Action réservée aux administrateurs." };

    try {
        const db = getAdminDb();
        const progressSnap = await db.collection('course_progress').where('progressPercent', '==', 100).get();
        let count = 0;
        let batch = db.batch();

        for (const doc of progressSnap.docs) {
            const data = doc.data();
            const enrollmentId = `${data.userId}_${data.courseId}`;
            const enrollRef = db.collection('enrollments').doc(enrollmentId);
            
            batch.set(enrollRef, { progress: 100 }, { merge: true });
            count++;

            if (count % 450 === 0) {
                await batch.commit();
                batch = db.batch();
            }
        }

        if (count % 450 !== 0) await batch.commit();
        
        return { success: true, count };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * SYNCHRONISATION AUTH -> FIRESTORE
 */
export async function syncUsersWithAuthAction(adminId: string) {
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "Action réservée aux administrateurs." };

    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        
        const listUsers = await auth.listUsers();
        let batch = db.batch();
        let count = 0;
        let created = 0;

        for (const userRecord of listUsers.users) {
            const userRef = db.collection('users').doc(userRecord.uid);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
                const email = userRecord.email || '';
                const fullName = userRecord.displayName || email.split('@')[0] || 'Membre Ndara';
                
                batch.set(userRef, {
                    uid: userRecord.uid,
                    email: email,
                    fullName: fullName,
                    username: fullName.replace(/\s/g, '_').toLowerCase() + Math.floor(1000 + Math.random() * 9000),
                    role: 'student',
                    status: 'active',
                    isInstructorApproved: false,
                    isProfileComplete: !!userRecord.displayName,
                    profilePictureURL: userRecord.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
                    createdAt: FieldValue.serverTimestamp(),
                    isOnline: false,
                    lastSeen: FieldValue.serverTimestamp(),
                    careerGoals: { currentRole: '', interestDomain: '', mainGoal: '' }
                });
                
                created++;
                count++;
            }

            if (count >= 450) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }

        if (count > 0) await batch.commit();
        return { success: true, count: created };
    } catch (error: any) {
        console.error("Sync Error:", error);
        return { success: false, error: error.message };
    }
}

export async function approveInstructorApplication({ userId, decision, adminId, message }: { userId: string, decision: 'accepted' | 'rejected', adminId: string, message?: string }) {
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const userRef = db.collection('users').doc(userId);
        
        batch.update(userRef, {
            role: decision === 'accepted' ? 'instructor' : 'student',
            isInstructorApproved: decision === 'accepted',
            'instructorApplication.decisionAt': FieldValue.serverTimestamp()
        });

        const auditRef = db.collection('admin_audit_logs').doc();
        batch.set(auditRef, {
            adminId,
            eventType: 'instructor.application',
            target: { id: userId, type: 'user' },
            details: `Candidature ${decision === 'accepted' ? 'approuvée' : 'rejetée'}.`,
            timestamp: FieldValue.serverTimestamp()
        });

        await batch.commit();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function migrateUserProfilesAction(adminId: string) {
    const isAdmin = await isRequesterAdmin(adminId);
    if (!isAdmin) return { success: false, error: "Action réservée aux administrateurs." };

    try {
        const db = getAdminDb();
        const usersSnap = await db.collection('users').get();
        let count = 0;
        let batch = db.batch();

        for (const doc of usersSnap.docs) {
            const data = doc.data();
            const updates: any = {};
            let needsUpdate = false;

            if (data.status === undefined) { updates.status = 'active'; needsUpdate = true; }
            if (data.role === undefined) { updates.role = 'student'; needsUpdate = true; }
            if (data.isInstructorApproved === undefined) { updates.isInstructorApproved = false; needsUpdate = true; }

            if (needsUpdate) {
                batch.update(doc.ref, updates);
                count++;
            }

            if (count >= 450) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }

        if (count > 0) await batch.commit();
        return { success: true, count };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateUserProfileAction({ userId, data, requesterId }: { userId: string, data: any, requesterId: string }) {
    try {
        const db = getAdminDb();
        await db.collection('users').doc(userId).update(data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateUserStatus({ userId, status, adminId }: { userId: string, status: string, adminId: string }) {
    try {
        const db = getAdminDb();
        await db.collection('users').doc(userId).update({ status });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateUserRole({ userId, role, adminId }: { userId: string, role: string, adminId: string }) {
    try {
        const db = getAdminDb();
        await db.collection('users').doc(userId).update({ role });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteUserAccount({ userId, idToken }: { userId: string, idToken: string }) {
    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        await auth.deleteUser(userId);
        await db.collection('users').doc(userId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
