import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation ultra-résiliente du SDK Firebase Admin.
 * Tente de réparer les erreurs courantes de formatage de clé JSON (quotes, échappements, etc.)
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is missing in environment variables.');
    return null;
  }

  try {
    let serviceAccount;
    
    // Tenter un parsing direct
    try {
        serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
        // Si ça échoue, nettoyer les quotes et les retours à la ligne échappés
        const cleaned = serviceAccountKey.trim().replace(/^['"]|['"]$/g, '');
        serviceAccount = JSON.parse(cleaned.replace(/\\n/g, '\n'));
    }
    
    if (!serviceAccount || !serviceAccount.private_key) {
        console.error('CRITICAL: The service account JSON is missing the private_key field.');
        return null;
    }

    // S'assurer que la clé privée contient bien des vrais retours à la ligne
    if (typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId
    });
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin Initialization Failed:', error.message);
    return null;
  }
}

/**
 * Retourne l'instance Firestore du SDK Admin.
 */
export function getAdminDb() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("CONFIGURATION_SERVEUR_INCOMPLETE");
  }
  return app.firestore();
}

/**
 * Retourne l'instance Auth du SDK Admin.
 */
export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("CONFIGURATION_SERVEUR_INCOMPLETE");
  }
  return app.auth();
}
