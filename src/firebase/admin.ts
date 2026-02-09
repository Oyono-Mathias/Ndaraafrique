import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation ultra-robuste du SDK Firebase Admin.
 * Gère le format JSON complexe de la clé de compte de service.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is missing in environment variables.');
    return null;
  }

  try {
    // Nettoyage et parsing du JSON
    const cleanedKey = serviceAccountKey.trim();
    const serviceAccount = JSON.parse(cleanedKey.replace(/\\n/g, '\n'));
    
    if (!serviceAccount.private_key) {
        console.error('CRITICAL: The service account JSON is missing the private_key field.');
        return null;
    }

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId
    });
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin Initialization Failed:', error.message);
    return null;
  }
}

/**
 * Retourne l'instance Firestore du SDK Admin.
 * L'initialisation est faite à chaque appel pour garantir la disponibilité.
 */
export function getAdminDb() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("CONFIGURATION_SERVEUR_INCOMPLETE");
  }
  return app.firestore();
}

/**
 * Retourne l'instance Auth du SDK Admin.
 */
export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("CONFIGURATION_SERVEUR_INCOMPLETE");
  }
  return app.auth();
}
