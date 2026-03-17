
import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation Firebase Admin.
 * Nettoyage automatique des guillemets et des sauts de ligne pour Vercel.
 */

export function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  let key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) return null;

  try {
    // Nettoyage des guillemets éventuels autour du JSON
    key = key.trim();
    if (key.startsWith("'") || key.startsWith('"')) key = key.substring(1, key.length - 1);

    const serviceAccount = JSON.parse(key);
    
    // Correction impérative de la clé privée (sauts de ligne)
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || firebaseConfig.projectId
    });
  } catch (e) {
    console.error("Firebase Admin Init Error:", e);
    return null;
  }
}

export function getAdminDb() {
  const app = initializeAdmin();
  if (!app) throw new Error("ADMIN_NOT_CONFIGURED");
  return app.firestore();
}

export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) throw new Error("ADMIN_NOT_CONFIGURED");
  return app.auth();
}
