import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation ultra-résiliente du SDK Firebase Admin.
 * Gère les problèmes de formatage de clé JSON fréquents sur Vercel/Cloud Workstations.
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
    let serviceAccount;
    
    // Nettoyage robuste de la chaîne
    let jsonString = serviceAccountKey.trim();
    if (jsonString.startsWith("'") && jsonString.endsWith("'")) {
      jsonString = jsonString.slice(1, -1);
    }

    try {
      serviceAccount = JSON.parse(jsonString);
    } catch (e) {
      // Fallback si des \n sont restés échappés
      serviceAccount = JSON.parse(jsonString.replace(/\\n/g, '\n'));
    }
    
    if (typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId
    });
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin Initialization Failed:', error.message);
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
