import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation sécurisée et robuste du SDK Firebase Admin.
 * Utilise un identifiant de projet explicite pour éviter l'erreur "Unable to detect Project Id".
 */

const projectId = firebaseConfig.projectId;

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      // Nettoyage de la clé pour gérer les sauts de ligne potentiels
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
      } catch (parseError) {
        console.error("CRITICAL: Erreur de parsing JSON pour FIREBASE_SERVICE_ACCOUNT_KEY.");
        throw parseError;
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId // On force le Project ID même avec la clé
      });
      
      console.log("Firebase Admin SDK : Initialisé avec succès via la clé JSON.");
    } else {
      // Tentative d'initialisation par défaut avec Project ID explicite
      admin.initializeApp({
        projectId: projectId
      });
      console.log(`Firebase Admin SDK : Initialisé via Project ID (${projectId}).`);
    }

    // Configuration globale indispensable pour Firestore
    const db = admin.firestore();
    db.settings({ 
      ignoreUndefinedProperties: true,
    });

  } catch (error: any) {
    console.error('CRITICAL: Erreur d\'initialisation du SDK Admin Firebase :', error.message);
  }
}

// Exportation des instances
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;

/**
 * Helper pour récupérer la DB de manière sécurisée dans les actions.
 */
export function getAdminDb() {
    if (admin.apps.length === 0) {
        throw new Error("ADMIN_SDK_NOT_INITIALIZED: Le serveur n'est pas configuré. Vérifiez la clé de compte de service.");
    }
    return admin.firestore();
}
