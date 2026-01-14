
'use server';

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

async function getAdminServices() {
    const { adminAuth, adminDb } = await import('@/firebase/admin');
    return { adminAuth, adminDb };
}

export async function deleteUserAccount({ userId, idToken }: { userId: string, idToken: string }): Promise<{ success: boolean, error?: string }> {
    try {
        const { adminAuth, adminDb } = await getAdminServices();

        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // An admin can delete anyone. A user can only delete themself.
        if (decodedToken.uid !== userId && !decodedToken.admin) {
            return { success: false, error: "Permission refusée. Vous ne pouvez supprimer que votre propre compte." };
        }

        // Delete from Auth
        await adminAuth.deleteUser(userId);

        // Delete from Firestore
        await adminDb.collection('users').doc(userId).delete();

        // Optionally, you might want to delete user's subcollections or other related data here using a batch.

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
    const { adminAuth, adminDb } = await getAdminServices();
    
    const results: { email: string, status: 'success' | 'error', error?: string }[] = [];
    let overallSuccess = true;

    for (const user of users) {
        try {
            const userRecord = await adminAuth.createUser({
                email: user.email,
                displayName: user.fullName,
                password: Math.random().toString(36).slice(-8),
                emailVerified: false,
            });

            await adminDb.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                email: user.email,
                fullName: user.fullName,
                role: 'student',
                createdAt: getFirestore().FieldValue.serverTimestamp(),
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
