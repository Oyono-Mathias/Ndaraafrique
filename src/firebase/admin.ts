import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation sécurisée et robuste du SDK Firebase Admin.
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
      // Fallback ADC (Application Default Credentials) - Fonctionne en interne GCP / Firebase Studio
      return admin.initializeApp({
        projectId: projectId
      });
    }
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin Initialization Failed:', error.message);
    return null;
  }
}

export function getAdminDb() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("CONFIGURATION_MANQUANTE : La variable d'environnement FIREBASE_SERVICE_ACCOUNT_KEY n'est pas configurée.");
  }
  return app.firestore();
}

export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("CONFIGURATION_MANQUANTE : Authentification Admin impossible.");
  }
  return app.auth();
}
