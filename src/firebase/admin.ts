import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation robuste du SDK Firebase Admin.
 * Gère les erreurs de formatage JSON et les variables d'environnement manquantes.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is undefined.');
    return null;
  }

  try {
    // 1. Nettoyage des guillemets et espaces
    serviceAccountKey = serviceAccountKey.trim();
    if (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'")) {
      serviceAccountKey = serviceAccountKey.slice(1, -1);
    }
    if (serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) {
      serviceAccountKey = serviceAccountKey.slice(1, -1);
    }

    // 2. Tentative de parsing JSON avec fallback pour les sauts de ligne échappés
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
      // Si le JSON contient des sauts de ligne littéraux \n mal interprétés
      serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
    }
    
    // 3. Correction forcée de la clé privée pour les certificats
    if (serviceAccount && typeof serviceAccount.private_key === 'string') {
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
