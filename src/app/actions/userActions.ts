

'use server';

import { adminAuth, adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function deleteUserAccount({ userId, idToken }: { userId: string, idToken: string }): Promise<{ success: boolean, error?: string }> {
    if (!idToken) {
        return { success: false, error: "Aucun token d'authentification." };
    }
    
    try {
        // 1. Verify the token of the user making the request (the admin)
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const adminUid = decodedToken.uid;

        // 2. Verify that the user making the request is an admin
        const adminUserDoc = await adminDb.collection('users').doc(adminUid).get();
        if (!adminUserDoc.exists || adminUserDoc.data()?.role !== 'admin') {
            return { success: false, error: 'Accès non autorisé. Seuls les administrateurs peuvent supprimer des utilisateurs.' };
        }
        
        // Prevent admin from deleting themselves
        if (adminUid === userId) {
            return { success: false, error: 'Un administrateur ne peut pas se supprimer lui-même.' };
        }

        // 3. Delete user from Firebase Authentication
        await adminAuth.deleteUser(userId);

        // 4. Delete user document from Firestore
        await adminDb.collection('users').doc(userId).delete();

        return { success: true };

    } catch (error: any) {
        console.error("Error deleting user:", error);
        if (error.code === 'auth/user-not-found') {
            return { success: false, error: "L'utilisateur n'existe pas dans Firebase Authentication." };
        }
         if (error.code === 'auth/id-token-expired') {
            return { success: false, error: "Le token a expiré. Veuillez vous reconnecter." };
        }
        return { success: false, error: error.message || 'Une erreur inconnue est survenue.' };
    }
}

export async function sendEncouragementMessage({ studentId }: { studentId: string }): Promise<{ success: boolean, error?: string }> {
    if (!studentId) {
        return { success: false, error: "L'ID de l'étudiant est manquant." };
    }
    
    const message = "Félicitations pour votre progression ! Continuez comme ça, vous êtes sur la bonne voie.";

    try {
        const chatHistoryRef = adminDb.collection('users').doc(studentId).collection('chatHistory');
        
        await chatHistoryRef.add({
            sender: 'ai',
            text: message,
            timestamp: FieldValue.serverTimestamp(),
        });

        return { success: true };

    } catch (error: any) {
        console.error("Error sending encouragement message:", error);
        return { success: false, error: error.message || "Une erreur inconnue est survenue lors de l'envoi du message." };
    }
}

export async function importUsersAction(users: { fullName: string; email: string }[]): Promise<{ success: boolean, results: { email: string, status: 'success' | 'error', error?: string }[] }> {
    const results: { email: string, status: 'success' | 'error', error?: string }[] = [];

    for (const userData of users) {
        try {
            // Generate a secure random password
            const password = Math.random().toString(36).slice(-8);
            
            const userRecord = await adminAuth.createUser({
                email: userData.email,
                emailVerified: true,
                password: password,
                displayName: userData.fullName,
            });

            await adminDb.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                email: userData.email,
                fullName: userData.fullName,
                username: userData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_'), // Generate a default username
                role: 'student',
                status: 'active',
                createdAt: FieldValue.serverTimestamp(),
                isInstructorApproved: false,
                isProfileComplete: false,
                // TODO: Send welcome email with temporary password
            });

            results.push({ email: userData.email, status: 'success' });

        } catch (error: any) {
            console.error(`Failed to import user ${userData.email}:`, error);
             let errorMessage = error.message;
            if (error.code === 'auth/email-already-exists') {
                errorMessage = "Cet email existe déjà dans le système.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Le format de l'email est invalide.";
            }
            results.push({ email: userData.email, status: 'error', error: errorMessage });
        }
    }
    return { success: true, results };
}




    
