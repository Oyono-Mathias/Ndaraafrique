import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Initialisation robuste et "Lazy" du SDK Firebase Admin.
 * Empêche les plantages au build et fournit un accès sécurisé à Firestore.
 */

const projectId = firebaseConfig.projectId;

function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  try {
    if (serviceAccountKey) {
      // Nettoyage de la clé pour gérer les sauts de ligne
      const cleanedKey = serviceAccountKey.trim();
      const serviceAccount = JSON.parse(cleanedKey.replace(/\\n/g, '\n'));
      
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
      });
    } else {
      // Fallback pour les environnements avec credentials par défaut (ex: Google Cloud)
      return admin.initializeApp({
        projectId: projectId
      });
    }
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin Initialization Failed:', error.message);
    return null;
  }
}

/**
 * Récupère l'instance Firestore Admin de manière sécurisée.
 * @throws Error si le SDK n'est pas configuré.
 */
export function getAdminDb() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("ADMIN_SDK_CONFIG_ERROR: Le serveur n'est pas encore configuré. Vérifiez la variable FIREBASE_SERVICE_ACCOUNT_KEY.");
  }
  const db = admin.firestore();
  
  // ✅ Crucial : Empêche Firestore de planter si une valeur est undefined
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    // Les paramètres ne peuvent être définis qu'une fois, on ignore si déjà fait
  }
  
  return db;
}

/**
 * Récupère l'instance Auth Admin de manière sécurisée.
 */
export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("ADMIN_SDK_CONFIG_ERROR: Le serveur n'est pas encore configuré.");
  }
  return admin.auth();
}

// Exportation des instances pour compatibilité ascendante (avec vérification de sécurité)
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
