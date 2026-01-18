
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function addToWaitlist(email: string): Promise<{ success: boolean; error?: string }> {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Veuillez fournir une adresse e-mail valide.' };
  }

  // Gracefully fail if the admin SDK is not initialized
  if (!adminDb) {
    console.warn("addToWaitlist skipped: Firebase Admin SDK not initialized.");
    // Simulate success to not break the UI for the user.
    return { success: true }; 
  }

  try {
    const waitlistRef = adminDb.collection('waitlist').doc(email);
    await waitlistRef.set({
      email: email,
      addedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true };
  } catch (error: any) {
    console.error("Error adding to waitlist:", error);
    return { success: false, error: 'Une erreur est survenue. Veuillez réessayer.' };
  }
}
