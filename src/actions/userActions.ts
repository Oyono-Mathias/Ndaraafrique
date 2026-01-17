
'use server';

import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/firebase/admin';
import { DecodedIdToken } from 'firebase-admin/auth';
import { sendUserNotification } from './notificationActions';

// Helper function to verify the ID token and check if the caller is an admin
async function verifyAdmin(idToken: string): Promise<DecodedIdToken | null> {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userRecord = await adminAuth.getUser(decodedToken.uid);
        if (userRecord.customClaims?.['role'] === 'admin') {
            return decodedToken;
        }
        return decodedToken; // Return decoded token even if not admin for self-deletion check
    } catch (error) {
        console.error("Error verifying admin token:", error);
        return null;
    }
}


export async function deleteUserAccount({ userId, idToken }: { userId: string, idToken: string }): Promise<{ success: boolean, error?: string }> {
    const decodedToken = await verifyAdmin(idToken);
    
    // Check for permission: either the user is deleting their own account OR an admin is deleting it.
    if (!decodedToken || (decodedToken.uid !== userId && decodedToken.firebase.sign_in_provider !== 'admin')) {
       return { success: false, error: "Permission refusée. Vous ne pouvez supprimer que votre propre compte ou être un administrateur." };
    }
    
    try {
        const batch = adminDb.batch();

        // Delete from Auth
        await adminAuth.deleteUser(userId);
        
        // Delete from Firestore
        const userRef = adminDb.collection('users').doc(userId);
        batch.delete(userRef);

        // Log the deletion to the audit log
        const auditLogRef = adminDb.collection('admin_audit_logs').doc();
        batch.set(auditLogRef, {
            adminId: decodedToken.uid,
            eventType: 'user.delete',
            target: { id: userId, type: 'user' },
            details: `User account ${userId} deleted by ${decodedToken.uid}.`,
            timestamp: FieldValue.serverTimestamp(),
        });
        
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
                role: 'student',
                createdAt: FieldValue.serverTimestamp(),
                isInstructorApproved: false,
            });

            results.push({ email: user.email, status: 'success' });
        } catch (error: any) {
            console.error(`Failed to import user ${user.email}:`, error);
            results.push({ email: user.email, status: 'error', error: error.message });
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
    try {
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({ status });
        
        await adminDb.collection('security_logs').add({
            eventType: status === 'suspended' ? 'user_suspended' : 'user_reinstated',
            userId: adminId,
            targetId: userId,
            details: `User status changed to ${status} by admin ${adminId}.`,
            timestamp: FieldValue.serverTimestamp(),
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
            eventType: 'instructor.application', // Corrected eventType
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
