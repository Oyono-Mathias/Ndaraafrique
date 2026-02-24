import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation sécurisée du SDK Firebase Admin pour Vercel.
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
    // Nettoyage des guillemets éventuels pour une lecture robuste
    serviceAccountKey = serviceAccountKey.trim();
    if (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'")) serviceAccountKey = serviceAccountKey.slice(1, -1);
    if (serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) serviceAccountKey = serviceAccountKey.slice(1, -1);

    let serviceAccount;
    try {
      // Tentative de parsing direct
      serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
      // Gestion des caractères d'échappement problématiques (\n dans la clé privée)
      serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
    }
    
    // Correction spécifique pour la clé privée
    if (serviceAccount && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId
    });
  } catch (error: any) {
    console.error('Firebase Admin Init Error:', error.message);
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
