
import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation ultra-robuste du SDK Firebase Admin.
 * Gère les différents formats de clés (JSON brut, chaînes échappées, etc.)
 * ✅ RÉSOLU : Support amélioré pour les déploiements Vercel.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (typeof window !== 'undefined') return null;

  if (admin.apps.length > 0) return admin.app();

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
      console.error("CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is missing.");
      return null;
  }

  try {
    let serviceAccount;
    
    // Nettoyage agressif des guillemets et espaces
    const cleanedKey = serviceAccountKey.trim().replace(/^['"]|['"]$/g, '');

    try {
      // Tentative 1: JSON Standard
      serviceAccount = JSON.parse(cleanedKey);
    } catch (e) {
      // Tentative 2: JSON avec sauts de ligne échappés (\n)
      serviceAccount = JSON.parse(cleanedKey.replace(/\\n/g, '\n'));
    }
    
    // Correction cruciale pour la clé privée
    if (serviceAccount && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    // Vérification des champs obligatoires pour éviter le crash silent de initializeApp
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error("JSON du compte de service incomplet (project_id, private_key ou client_email manquant).");
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
