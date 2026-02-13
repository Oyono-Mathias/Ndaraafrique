import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation ultra-résiliente du SDK Firebase Admin.
 * Gère les erreurs de formatage JSON et les variables d'environnement manquantes.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment variables.');
    return null;
  }

  try {
    // 1. Nettoyage des guillemets éventuels ajoutés par l'hébergeur ou le .env
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
      // Fallback si les \n sont mal interprétés
      serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
    }
    
    // 3. Correction forcée de la clé privée (doit avoir de vrais sauts de ligne pour être valide)
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

/**
 * Retourne l'instance Firestore Admin.
 * Lance une erreur explicite si la config est manquante.
 */
export function getAdminDb() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("CONFIGURATION_SERVEUR_INCOMPLETE");
  }
  return app.firestore();
}

/**
 * Retourne l'instance Auth Admin.
 */
export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("CONFIGURATION_SERVEUR_INCOMPLETE");
  }
  return app.auth();
}
