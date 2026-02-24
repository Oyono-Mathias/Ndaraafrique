import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation ultra-robuste du SDK Firebase Admin.
 * Optimisé pour Vercel avec lecture JSON sécurisée.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  try {
    if (serviceAccountKey) {
      // Nettoyage des guillemets éventuels
      serviceAccountKey = serviceAccountKey.trim();
      if (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'")) serviceAccountKey = serviceAccountKey.slice(1, -1);
      if (serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) serviceAccountKey = serviceAccountKey.slice(1, -1);

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountKey);
      } catch (e) {
        // Fallback pour les échappements de nouvelles lignes
        serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
      }
      
      if (serviceAccount && typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
    }
    
    // Auto-init en environnement Google Cloud
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
