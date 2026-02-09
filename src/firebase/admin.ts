import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation robuste du SDK Firebase Admin.
 * Gère la connexion sécurisée côté serveur pour les Actions.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  // Si déjà initialisé, on retourne l'instance existante
  if (admin.apps.length > 0) return admin.app();

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  try {
    if (serviceAccountKey) {
      // Nettoyage de la clé pour gérer les retours à la ligne dans les variables d'env
      const cleanedKey = serviceAccountKey.trim();
      const serviceAccount = JSON.parse(cleanedKey.replace(/\\n/g, '\n'));
      
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
      });
    } else {
      // Fallback pour les environnements avec identifiants par défaut (ex: Google Cloud Functions)
      // Note: En local ou sur Vercel, cela peut échouer sans clé explicite.
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
 * Récupère l'instance Firestore Admin.
 * @throws Error si l'initialisation échoue (souvent dû à une clé manquante).
 */
export function getAdminDb() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("CONFIGURATION_MANQUANTE : La variable d'environnement FIREBASE_SERVICE_ACCOUNT_KEY n'est pas configurée sur le serveur.");
  }
  return app.firestore();
}

/**
 * Récupère l'instance Auth Admin.
 */
export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("CONFIGURATION_MANQUANTE : Impossible d'initialiser l'authentification Admin.");
  }
  return app.auth();
}
