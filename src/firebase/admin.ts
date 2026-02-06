
import * as admin from 'firebase-admin';

/**
 * @fileOverview Initialisation sécurisée et robuste du SDK Firebase Admin.
 * Utilise un pattern Singleton pour garantir une seule instance et éviter les erreurs de connexion.
 */

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      
      console.log("Firebase Admin SDK : Initialisé avec succès via la clé JSON.");
    } else {
      // Tentative d'initialisation par défaut (utile sur Google Cloud / Firebase App Hosting)
      admin.initializeApp();
      console.log("Firebase Admin SDK : Initialisé via les identifiants par défaut de l'environnement.");
    }

    // Configuration globale indispensable pour éviter les plantages sur les champs vides
    const db = admin.firestore();
    db.settings({ 
      ignoreUndefinedProperties: true,
      timestampsInSnapshots: true 
    });

  } catch (error: any) {
    console.error('CRITICAL: Erreur d\'initialisation du SDK Admin Firebase :', error.message);
  }
}

// Exportation des instances (garanties non-nulles si l'initialisation réussit)
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;

// Helper pour récupérer la DB de manière sécurisée dans les actions
export function getAdminDb() {
    const db = admin.apps.length > 0 ? admin.firestore() : null;
    if (!db) {
        throw new Error("La base de données Firebase Admin n'est pas initialisée. Vérifiez vos variables d'environnement (FIREBASE_SERVICE_ACCOUNT_KEY).");
    }
    return db;
}
