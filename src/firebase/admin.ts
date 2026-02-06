
import * as admin from 'firebase-admin';

/**
 * @fileOverview Initialisation sécurisée du SDK Firebase Admin.
 * Tente d'initialiser avec une clé de compte de service ou les identifiants par défaut.
 */

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      // Nettoyage et parse de la clé JSON
      const serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      
      // Configuration globale pour ignorer les propriétés 'undefined' (évite les erreurs au set/update)
      admin.firestore().settings({ ignoreUndefinedProperties: true });
      
      console.log("Firebase Admin SDK initialisé via FIREBASE_SERVICE_ACCOUNT_KEY.");
    } else {
      // Tentative d'initialisation par défaut (utile dans certains environnements cloud)
      admin.initializeApp();
      admin.firestore().settings({ ignoreUndefinedProperties: true });
      console.log("Firebase Admin SDK initialisé via les identifiants par défaut.");
    }
  } catch (error: any) {
    console.error('CRITICAL: Erreur d\'initialisation du SDK Admin Firebase :', error.message);
  }
}

// Exportation sécurisée des services
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
