import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation ultra-robuste du SDK Firebase Admin.
 * Gère les différents formats de clés (JSON brut, chaînes échappées, etc.)
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (typeof window !== 'undefined') return null;

  if (admin.apps.length > 0) return admin.app();

  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
      console.error("CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is missing in environment variables.");
      return null;
  }

  try {
    // Nettoyage des guillemets superflus si Vercel les a ajoutés
    let cleanedKey = serviceAccountKey.trim();
    if (cleanedKey.startsWith("'") && cleanedKey.endsWith("'")) cleanedKey = cleanedKey.slice(1, -1);
    if (cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) cleanedKey = cleanedKey.slice(1, -1);

    let serviceAccount;
    try {
      // Tentative de parsing JSON standard
      serviceAccount = JSON.parse(cleanedKey);
    } catch (e) {
      // Si échec, tentative de parsing après nettoyage des sauts de ligne échappés
      serviceAccount = JSON.parse(cleanedKey.replace(/\\n/g, '\n'));
    }
    
    // Correction cruciale pour la clé privée (doit contenir de vrais sauts de ligne)
    if (serviceAccount && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId
    });
  } catch (error: any) {
    console.error('FATAL: Firebase Admin Initialization Failed:', error.message);
    return null;
  }
}

export function getAdminDb() {
  const app = initializeAdmin();
  if (!app) {
      // On jette une erreur explicite qui sera attrapée par les try/catch des actions
      throw new Error("ADMIN_NOT_CONFIGURED");
  }
  return app.firestore();
}

export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) {
      throw new Error("ADMIN_NOT_CONFIGURED");
  }
  return app.auth();
}
