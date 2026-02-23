import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation ultra-robuste du SDK Firebase Admin.
 * Gère les formats de clés JSON complexes, les sauts de ligne et les guillemets parasites.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.error('CRITICAL ERROR: FIREBASE_SERVICE_ACCOUNT_KEY is undefined in environment variables.');
    return null;
  }

  try {
    // 1. Nettoyage profond de la chaîne (espaces, guillemets simples/doubles en début/fin)
    serviceAccountKey = serviceAccountKey.trim();
    if (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'")) {
      serviceAccountKey = serviceAccountKey.slice(1, -1);
    }
    if (serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) {
      serviceAccountKey = serviceAccountKey.slice(1, -1);
    }

    // 2. Parsing JSON avec support des sauts de ligne échappés
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
      // Fallback si les \n sont mal échappés
      serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
    }
    
    // 3. Correction impérative de la clé privée pour le format PEM
    if (serviceAccount && typeof serviceAccount.private_key === 'string') {
      if (!serviceAccount.private_key.includes('\n')) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
    }

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId
    });
  } catch (error: any) {
    console.error('CRITICAL ERROR: Firebase Admin Initialization Failed:', error.message);
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
