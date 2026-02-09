import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation sécurisée et robuste du SDK Firebase Admin.
 * Tente de corriger les erreurs de formatage communes de la clé secrète.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is missing.');
    return null;
  }

  try {
    // Nettoyage de la clé pour éviter les erreurs de JSON.parse et de refresh token
    const cleanedKey = serviceAccountKey.trim();
    
    // On essaie de parser le JSON
    const serviceAccount = JSON.parse(cleanedKey.replace(/\\n/g, '\n'));
    
    // Vérification sommaire de la présence de la clé privée
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

export function getAdminDb() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("CONFIGURATION_SERVEUR_INCOMPLETE");
  }
  return app.firestore();
}

export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("CONFIGURATION_SERVEUR_INCOMPLETE");
  }
  return app.auth();
}
