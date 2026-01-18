
import * as admin from 'firebase-admin';

// Ensure the app is initialized only once
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
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
