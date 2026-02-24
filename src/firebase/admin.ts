
import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation ultra-robuste du SDK Firebase Admin.
 * Compatible avec Vercel et Firebase App Hosting.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  try {
    // 1. Si on a une clé JSON dans les variables d'environnement
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
    }
    
    // 2. Fallback sur l'initialisation automatique (pour Firebase Hosting/Functions)
    return admin.initializeApp();
  } catch (error: any) {
    console.warn('Firebase Admin Init Notice:', error.message);
    return null;
  }
}

export function getAdminDb() {
  const app = initializeAdmin();
  if (!app) throw new Error("CONFIGURATION_SERVEUR_INCOMPLETE");
  return app.firestore();
}

export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) throw new Error("CONFIGURATION_SERVEUR_INCOMPLETE");
  return app.auth();
}
