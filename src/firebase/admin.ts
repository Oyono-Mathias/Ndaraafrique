
import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation sécurisée du SDK Firebase Admin.
 * Gère le parsing robuste de la clé JSON des variables d'environnement.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
      console.error("CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment variables.");
      return null;
  }

  try {
    serviceAccountKey = serviceAccountKey.trim();
    
    // Suppression des guillemets éventuels autour de la chaîne JSON
    if (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'")) serviceAccountKey = serviceAccountKey.slice(1, -1);
    if (serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) serviceAccountKey = serviceAccountKey.slice(1, -1);

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
      // Fallback si les sauts de ligne ne sont pas correctement échappés dans la chaîne
      serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
    }
    
    // Nettoyage de la clé privée pour garantir que \n est interprété comme un saut de ligne réel
    if (serviceAccount && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId
    });
  } catch (error: any) {
    console.error('Firebase Admin Initialization Error:', error.message);
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
