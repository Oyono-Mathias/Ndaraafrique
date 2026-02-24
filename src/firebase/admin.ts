import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation ultra-robuste du SDK Firebase Admin.
 * Compatible avec Firebase App Hosting et les environnements de production.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  // Si déjà initialisé, on retourne l'instance existante
  if (admin.apps.length > 0) return admin.app();

  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  try {
    // 1. Priorité à la clé JSON fournie dans les variables d'environnement
    if (serviceAccountKey) {
      // Nettoyage de la chaîne au cas où elle serait entourée de guillemets par l'hébergeur
      serviceAccountKey = serviceAccountKey.trim();
      if (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'")) serviceAccountKey = serviceAccountKey.slice(1, -1);
      if (serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) serviceAccountKey = serviceAccountKey.slice(1, -1);

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountKey);
      } catch (e) {
        // Fallback si les \n ne sont pas correctement échappés
        serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
      }
      
      // Sécurisation de la clé privée
      if (serviceAccount && typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
    }
    
    // 2. Fallback sur l'initialisation automatique (si tournant sur Google Cloud / Firebase)
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
