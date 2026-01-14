

'use server';

// import { adminAuth, adminDb } from '@/firebase/admin';
// import { FieldValue } from 'firebase-admin/firestore';

export async function deleteUserAccount({ userId, idToken }: { userId: string, idToken: string }): Promise<{ success: boolean, error?: string }> {
    console.warn("deleteUserAccount is disabled because Admin SDK is not configured.");
    return { success: false, error: "La suppression de compte est temporairement désactivée." };
}

export async function sendEncouragementMessage({ studentId }: { studentId: string }): Promise<{ success: boolean, error?: string }> {
     console.warn("sendEncouragementMessage is disabled because Admin SDK is not configured.");
     return { success: false, error: "L'envoi de message est temporairement désactivé." };
}

export async function importUsersAction(users: { fullName: string; email: string }[]): Promise<{ success: boolean, results: { email: string, status: 'success' | 'error', error?: string }[] }> {
    console.warn("importUsersAction is disabled because Admin SDK is not configured.");
    const results = users.map(u => ({ email: u.email, status: 'error' as const, error: "L'importation est temporairement désactivée."}));
    return { success: false, results };
}
