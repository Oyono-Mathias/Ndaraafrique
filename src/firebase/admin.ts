
import * as admin from 'firebase-admin';

// Ensure the app is initialized only once
if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    // Check if the service account key is a valid, non-empty string before parsing.
    if (typeof serviceAccountKey === 'string' && serviceAccountKey.trim().length > 0) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // This is not a fatal error during build, but server actions will fail.
      console.warn("Firebase Admin SDK not initialized: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set or is empty. This is expected during client build, but server-side features will not work.");
    }
  } catch (error: any) {
    // Catching parsing errors specifically.
    console.error('Firebase Admin Initialization Error: Could not parse service account key. ' + error.message);
  }
}

// Defensive export: only export services if initialization was successful.
// If not, export null and let runtime checks in server actions handle it.
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
