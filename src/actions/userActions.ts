
'use server';

import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/firebase/admin';
import { DecodedIdToken } from 'firebase-admin/auth';
import { sendUserNotification } from './notificationActions';
import type { UserRole } from '@/lib/types';

// Helper to verify if the requester is an admin by checking their Firestore document
async function isRequesterAdmin(uid: string): Promise<boolean> {
    if (!adminDb) {
      console.warn("isRequesterAdmin check skipped: Firebase Admin SDK not initialized.");
      return false;
    }
    try {
        const userDoc = await adminDb.collection('users').doc(uid).get();
        return userDoc.exists && userDoc.data()?.role === 'admin';
    } catch (error) {
        console.error("Error verifying admin token:", error);
        return false;
    }
}


export async function deleteUserAccount({ userId, idToken }: { userId: string, idToken: string }): Promise<{ success: boolean, error?: string }> {
    if (!adminAuth || !adminDb) {
        return { success: false, error: "Le service est temporairement indisponible." };
    }
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const requesterUid = decodedToken.uid;
        let hasPermission = false;

        // Case 1: User is deleting their own account
        if (requesterUid === userId) {
            hasPermission = true;
        } else {
        // Case 2: An admin is deleting the account
            if (await isRequesterAdmin(requesterUid)) {
                hasPermission = true;
            }
        }
        
        if (!hasPermission) {
           return { success: false, error: "Permission refusée. Vous ne pouvez supprimer que votre propre compte ou être un administrateur." };
        }
    
        const batch = adminDb.batch();

        // 1. Delete from Auth (this will trigger other cleanup via extensions/functions if set up)
        await adminAuth.deleteUser(userId);
        
        // 2. Delete Firestore user document
        const userRef = adminDb.collection('users').doc(userId);
        batch.delete(userRef);

        // 3. Delete user's FCM tokens for better cleanup
        const fcmTokensCollection = adminDb.collectionGroup('fcmTokens');
        const userTokensRef = (await fcmTokensCollection.where('userId', '==', userId).get()).docs.map(d => d.ref);
        userTokensRef.forEach(ref => batch.delete(ref));

        // 4. Log the deletion to the audit log if an admin is deleting someone else
        if (requesterUid !== userId) {
            const auditLogRef = adminDb.collection('admin_audit_logs').doc();
            batch.set(auditLogRef, {
                adminId: requesterUid,
                eventType: 'user.delete',
                target: { id: userId, type: 'user' },
                details: `User account ${userId} deleted by admin ${requesterUid}.`,
                timestamp: FieldValue.serverTimestamp(),
            });
        }
        
        // Commit all batched operations
        await batch.commit();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user account:", error);
        return { success: false, error: error.message || 'Une erreur est survenue lors de la suppression du compte.' };
    }
}

export async function sendEncouragementMessage({ studentId }: { studentId: string }): Promise<{ success: boolean, error?: string }> {
     console.warn("sendEncouragementMessage is disabled because Admin SDK is not configured.");
     return { success: false, error: "L'envoi de message est temporairement désactivé." };
}

export async function importUsersAction({ users, adminId }: { users: { fullName: string; email: string }[], adminId: string }): Promise<{ success: boolean, results: { email: string, status: 'success' | 'error', error?: string }[] }> {
    if (!adminAuth || !adminDb) {
        return { success: false, results: users.map(u => ({ email: u.email, status: 'error', error: 'Service indisponible' })) };
    }
    const results: { email: string, status: 'success' | 'error', error?: string }[] = [];
    let overallSuccess = true;
    const batch = adminDb.batch();

    for (const user of users) {
        try {
            // Create user in Firebase Auth
            const userRecord = await adminAuth.createUser({
                email: user.email,
                displayName: user.fullName,
                password: Math.random().toString(36).slice(-8), // Generate a random password
                emailVerified: false,
            });

            // Create user document in Firestore
            const userRef = adminDb.collection('users').doc(userRecord.uid);
            batch.set(userRef, {
                uid: userRecord.uid,
                email: user.email,
                fullName: user.fullName,
                username: user.email.split('@')[0],
                phoneNumber: '',
                bio: '',
                role: 'student',
                status: 'active',
                isInstructorApproved: false,
                createdAt: FieldValue.serverTimestamp(),
                lastLogin: FieldValue.serverTimestamp(),
                isOnline: false,
                lastSeen: FieldValue.serverTimestamp(),
                profilePictureURL: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.fullName || 'A')}`,
                isProfileComplete: false,
                preferredLanguage: 'fr',
                socialLinks: { website: '', twitter: '', linkedin: '', youtube: '' },
                payoutInfo: {},
                instructorNotificationPreferences: {},
                pedagogicalPreferences: {},
                notificationPreferences: {},
                careerGoals: { currentRole: '', interestDomain: '', mainGoal: '' },
                permissions: {},
                badges: [],
                termsAcceptedAt: FieldValue.serverTimestamp(),
            });

            results.push({ email: user.email, status: 'success' });
        } catch (error: any) {
            console.error(`Failed to import user ${user.email}:`, error);
            results.push({ email: user.email, status: 'error', error: error.code || error.message });
            overallSuccess = false;
        }
    }
    
    // Add a single audit log entry for the bulk operation
    const auditLogRef = adminDb.collection('admin_audit_logs').doc();
    batch.set(auditLogRef, {
        adminId: adminId,
        eventType: 'user.import',
        target: { id: adminId, type: 'user' }, // Target is the admin performing the action
        details: `Bulk imported ${users.length} users. ${results.filter(r => r.status === 'success').length} succeeded, ${results.filter(r => r.status === 'error').length} failed.`,
        timestamp: FieldValue.serverTimestamp(),
    });


    await batch.commit();

    return { success: overallSuccess, results };
}


export async function updateUserStatus({ userId, status, adminId }: { userId: string, status: 'active' | 'suspended', adminId: string }): Promise<{ success: boolean, error?: string }> {
    if (!adminDb) return { success: false, error: "Service indisponible" };
    try {
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({ status });
        
        await adminDb.collection('security_logs').add({
            eventType: status === 'suspended' ? 'user_suspended' : 'user_reinstated',
            userId: adminId,
            targetId: userId,
            details: `User status changed to ${status} by admin ${adminId}.`,
            timestamp: FieldValue.serverTimestamp(),
            status: 'resolved'
        });

        await adminDb.collection('admin_audit_logs').add({
            adminId: adminId,
            eventType: 'user.status.update',
            target: { id: userId, type: 'user' },
            details: `User ${userId} status changed to ${status} by admin ${adminId}.`,
            timestamp: FieldValue.serverTimestamp(),
        });


        return { success: true };
    } catch(error: any) {
        return { success: false, error: error.message };
    }
}

export async function approveInstructorApplication({ userId, decision, message, adminId }: { userId: string, decision: 'accepted' | 'rejected', message: string, adminId: string }): Promise<{ success: boolean, error?: string }> {
    if (!adminDb) return { success: false, error: "Service indisponible" };
    try {
        const userRef = adminDb.collection('users').doc(userId);

        if (decision === 'accepted') {
            await userRef.update({ isInstructorApproved: true });
        } else {
            // Optional: Revert role to student if rejected
            await userRef.update({ isInstructorApproved: false }); 
        }

        // Send notification to user
        await sendUserNotification(userId, {
            title: `Votre candidature d'instructeur`,
            body: message,
            link: `/devenir-instructeur`
        });

        // Add to admin audit log
        await adminDb.collection('admin_audit_logs').add({
            adminId: adminId,
            eventType: 'instructor.application',
            target: { id: userId, type: 'user' },
            details: `Instructor application for ${userId} was ${decision} by admin ${adminId}.`,
            timestamp: FieldValue.serverTimestamp(),
        });


        return { success: true };
    } catch(error: any) {
        return { success: false, error: error.message };
    }
}

export async function grantCourseAccess(
    { studentId, courseId, adminId, reason, expirationInDays }: 
    { studentId: string; courseId: string; adminId: string; reason: string; expirationInDays?: number }
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: "Service indisponible" };
  const batch = adminDb.batch();

  try {
    const enrollmentId = `${studentId}_${courseId}`;
    const enrollmentRef = adminDb.collection('enrollments').doc(enrollmentId);
    
    const enrollmentDoc = await enrollmentRef.get();
    if (enrollmentDoc.exists) {
        return { success: false, error: 'Cet utilisateur est déjà inscrit à ce cours.' };
    }

    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
        return { success: false, error: 'Le cours sélectionné est introuvable.' };
    }
    const courseData = courseDoc.data();
    if (!courseData) {
         return { success: false, error: 'Les données du cours sont invalides.' };
    }

    const enrollmentPayload: any = {
        studentId: studentId,
        courseId: courseId,
        instructorId: courseData.instructorId,
        enrollmentDate: FieldValue.serverTimestamp(),
        progress: 0,
        priceAtEnrollment: 0,
        enrollmentType: 'admin_grant',
    };
    
    const grantPayload: any = {
        studentId: studentId,
        courseId: courseId,
        grantedBy: adminId,
        reason: reason,
        createdAt: FieldValue.serverTimestamp(),
    };
    
    let expirationDetails = "Accès permanent.";
    if (expirationInDays && expirationInDays > 0) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expirationInDays);
        enrollmentPayload.expiresAt = Timestamp.fromDate(expiresAt);
        grantPayload.expiresAt = Timestamp.fromDate(expiresAt);
        expirationDetails = `Accès expire le ${expiresAt.toLocaleDateString('fr-FR')}.`;
    }

    batch.set(enrollmentRef, enrollmentPayload);

    const grantRef = adminDb.collection('admin_grants').doc();
    batch.set(grantRef, grantPayload);
    
    const auditLogRef = adminDb.collection('admin_audit_logs').doc();
    batch.set(auditLogRef, {
        adminId: adminId,
        eventType: 'course.grant',
        target: { id: enrollmentId, type: 'enrollment' },
        details: `L'administrateur ${adminId} a offert le cours '${courseData.title}' à l'utilisateur ${studentId}. Raison: ${reason}. ${expirationDetails}`,
        timestamp: FieldValue.serverTimestamp(),
    });


    await batch.commit();
    return { success: true };

  } catch (error: any) {
    console.error('Error granting course access:', error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}

export async function updateUserRole({ userId, role, adminId }: { userId: string, role: UserRole, adminId: string }): Promise<{ success: boolean, error?: string }> {
    if (!adminDb) return { success: false, error: "Service indisponible" };
    try {
        const userRef = adminDb.collection('users').doc(userId);
        
        const batch = adminDb.batch();
        batch.update(userRef, { role });

        // Add to admin audit log
        batch.set(adminDb.collection('admin_audit_logs').doc(), {
            adminId: adminId,
            eventType: 'user.role.update',
            target: { id: userId, type: 'user' },
            details: `User role for ${userId} changed to ${role} by admin ${adminId}.`,
            timestamp: FieldValue.serverTimestamp(),
        });

        await batch.commit();

        return { success: true };
    } catch(error: any) {
        return { success: false, error: error.message };
    }
}
