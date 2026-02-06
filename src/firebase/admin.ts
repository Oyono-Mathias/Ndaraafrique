import * as admin from 'firebase-admin';

/**
 * @fileOverview Initialisation sécurisée et robuste du SDK Firebase Admin.
 * Utilise un pattern Singleton pour garantir une seule instance et éviter les erreurs de connexion.
 */

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      // Nettoyage de la clé pour gérer les sauts de ligne potentiels
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
    });

  } catch (error: any) {
    console.error('CRITICAL: Erreur d\'initialisation du SDK Admin Firebase :', error.message);
  }
}

// Exportation des instances (garanties non-nulles si l'initialisation réussit)
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;

/**
 * Helper pour récupérer la DB de manière sécurisée dans les actions.
 * Lance une erreur explicite si le SDK n'est pas configuré.
 */
export function getAdminDb() {
    if (admin.apps.length === 0) {
        // Tentative de ré-initialisation de secours au cas où
        try {
            const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
            if (key) {
                admin.initializeApp({ credential: admin.credential.cert(JSON.parse(key.replace(/\\n/g, '\n'))) });
                const db = admin.firestore();
                db.settings({ ignoreUndefinedProperties: true });
                return db;
            }
        } catch (e) {}
        throw new Error("ADMIN_SDK_NOT_INITIALIZED: Le compte de service Firebase n'est pas configuré sur le serveur.");
    }
    return admin.firestore();
}
