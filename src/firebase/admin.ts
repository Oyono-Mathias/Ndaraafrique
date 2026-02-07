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
      // Nettoyage de la clé pour gérer les sauts de ligne et les caractères spéciaux
      const cleanedKey = serviceAccountKey.trim();
      const serviceAccount = JSON.parse(cleanedKey.replace(/\\n/g, '\n'));
      
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
      });
    } else {
      // Fallback pour les environnements avec credentials par défaut (ex: Google Cloud ou Firebase Hosting)
      // Si on est en production sur Firebase, initializeApp sans arguments fonctionne souvent par magie
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
    throw new Error("ADMIN_SDK_NOT_INITIALIZED: Le serveur n'a pas pu initialiser le compte de service. Vérifiez la variable FIREBASE_SERVICE_ACCOUNT_KEY dans vos paramètres d'environnement.");
  }
  const db = admin.firestore();
  
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    // Les paramètres ne peuvent être définis qu'une fois
  }
  
  return db;
}

/**
 * Récupère l'instance Auth Admin de manière sécurisée.
 */
export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("ADMIN_SDK_NOT_INITIALIZED: Impossible d'accéder à Auth Admin.");
  }
  return admin.auth();
}

// Exportation des instances pour compatibilité
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
