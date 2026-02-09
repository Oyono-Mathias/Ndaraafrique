import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation robuste du SDK Firebase Admin.
 * Fournit des accesseurs sécurisés pour Firestore et Auth sur le serveur.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  try {
    if (serviceAccountKey) {
      const cleanedKey = serviceAccountKey.trim();
      const serviceAccount = JSON.parse(cleanedKey.replace(/\\n/g, '\n'));
      
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
      });
    } else {
      // Fallback pour les environnements sans clé explicite (ex: Google Cloud)
      return admin.initializeApp({
        projectId: projectId
      });
    }
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin Initialization Failed:', error.message);
    return null;
  }
}

/**
 * Récupère l'instance Firestore Admin de manière sécurisée et initialisée.
 */
export function getAdminDb() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("DÉFAUT_CONFIGURATION : La clé FIREBASE_SERVICE_ACCOUNT_KEY est manquante ou invalide dans les paramètres du serveur (Vercel/Firebase).");
  }
  return app.firestore();
}

/**
 * Récupère l'instance Auth Admin de manière sécurisée.
 */
export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("DÉFAUT_CONFIGURATION : Impossible d'initialiser l'authentification Admin.");
  }
  return app.auth();
}

// Export pour compatibilité descendante
export const adminDb = null;
export const adminAuth = null;
