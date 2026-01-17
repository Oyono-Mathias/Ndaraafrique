
import * as admin from 'firebase-admin';

// Ensure the app is initialized only once
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines in the private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error('Firebase Admin Initialization Error:', error.stack);
    // We log the error but don't re-throw. 
    // This allows the server to start, and individual server actions will fail gracefully
    // if they depend on the uninitialized admin SDK.
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
