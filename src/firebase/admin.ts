
import * as admin from 'firebase-admin';

/**
 * @fileOverview Initialisation sécurisée du SDK Firebase Admin.
 * Gère les cas où la clé de compte de service est fournie sous forme de chaîne JSON.
 */

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      // Nettoyage de la clé (parfois des caractères d'échappement s'insèrent dans les env vars)
      const serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin SDK initialisé avec succès.");
    } else {
      console.warn("Firebase Admin SDK non initialisé : FIREBASE_SERVICE_ACCOUNT_KEY est manquante.");
    }
  } catch (error: any) {
    console.error('Erreur lors de l\'initialisation du SDK Admin Firebase :', error.message);
  }
}

export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
