
import * as admin from 'firebase-admin';

// Ensure the app is initialized only once
if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      // This is not a fatal error during build, but server actions will fail.
      console.warn("Firebase Admin SDK not initialized: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. This is expected during client build, but server-side features will not work.");
    } else {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (error: any) {
    console.error('Firebase Admin Initialization Error:', error.message);
    // Log the error but don't re-throw, allowing the build process to continue.
    // Functions attempting to use the uninitialized SDK will fail gracefully.
  }
}

// Defensive export: only export services if initialization was successful.
// If not, export null and let runtime checks in server actions handle it.
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
