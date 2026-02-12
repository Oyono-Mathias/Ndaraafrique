import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation ultra-résiliente du SDK Firebase Admin.
 * Gère les problèmes de formatage de clé JSON fréquents sur Vercel/Cloud Workstations.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is missing in environment variables.');
    return null;
  }

  try {
    let serviceAccount;
    
    // 1. Nettoyage du texte (suppression des guillemets extérieurs potentiels et espaces)
    let jsonString = serviceAccountKey.trim();
    
    // Gérer le cas où la variable est entourée de guillemets simples (fréquent dans .env)
    if (jsonString.startsWith("'") && jsonString.endsWith("'")) {
      jsonString = jsonString.slice(1, -1);
    }

    // 2. Parsing JSON robuste
    try {
        serviceAccount = JSON.parse(jsonString);
    } catch (e) {
        // Fallback si des retours à la ligne échappés bloquent (\n) ou si c'est déjà une chaîne échappée
        try {
            serviceAccount = JSON.parse(jsonString.replace(/\\n/g, '\n'));
        } catch (e2) {
            console.error('JSON Parse Error:', e2);
            return null;
        }
    }
    
    if (!serviceAccount || !serviceAccount.private_key) {
        console.error('CRITICAL: The service account JSON is missing the private_key field.');
        return null;
    }

    // 3. Correction forcée de la clé privée (indispensable pour RSA)
    if (typeof serviceAccount.private_key === 'string') {
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
