
'use server';

import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/firebase/admin';
import { DecodedIdToken } from 'firebase-admin/auth';

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
        // Delete from Auth
        await adminAuth.deleteUser(userId);
        
        // Delete from Firestore
        await adminDb.collection('users').doc(userId).delete();
        
        // Note: For full GDPR compliance, a Cloud Function triggered by user deletion
        // should be used to clean up all user-related data across subcollections and other collections.
        
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

export async function importUsersAction(users: { fullName: string; email: string }[]): Promise<{ success: boolean, results: { email: string, status: 'success' | 'error', error?: string }[] }> {
    const results: { email: string, status: 'success' | 'error', error?: string }[] = [];
    let overallSuccess = true;

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
            await adminDb.collection('users').doc(userRecord.uid).set({
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

    return { success: overallSuccess, results };
}
