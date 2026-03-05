'use server';

import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Actions serveur pour l'API Bunny Stream.
 * Fournit un diagnostic détaillé en cas d'échec de communication.
 */

const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID || '382715';
const API_KEY = process.env.BUNNY_API_KEY || 'bbdd6d9f-1b73-4228-9ba800bde9d1-942a-475f';

export async function createBunnyVideo(title: string, instructorId: string) {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(instructorId).get();
    const userData = userDoc.data();

    // Sécurité : Seuls les instructeurs ou admins Ndara peuvent uploader
    if (!userDoc.exists || (userData?.role !== 'instructor' && userData?.role !== 'admin')) {
      throw new Error("Accès refusé : Seuls les formateurs peuvent uploader.");
    }

    // Diagnostic : Vérifier si la clé API semble configurée
    if (!API_KEY || API_KEY.length < 10) {
        throw new Error("Configuration Bunny.net manquante : Vérifiez BUNNY_API_KEY dans vos variables d'environnement.");
    }

    const url = `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'AccessKey': API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({ title: title || "Nouvelle Vidéo Ndara" }),
    });

    if (!response.ok) {
      const status = response.status;
      let errorMsg = `Erreur API Bunny (Statut ${status})`;
      
      try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
      } catch (e) {
          // Si pas de JSON, on gère les codes d'état standards
          if (status === 401) errorMsg = "Clé API Bunny invalide ou refusée (401 Unauthorized).";
          if (status === 404) errorMsg = "Bibliothèque Bunny introuvable (404 Not Found).";
      }
      
      throw new Error(errorMsg);
    }

    const data = await response.json();

    return { 
      success: true, 
      guid: data.guid as string, 
      libraryId: LIBRARY_ID,
      uploadKey: API_KEY 
    };
  } catch (error: any) {
    console.error("Bunny API Prep Error:", error.message);
    return { success: false, error: error.message as string };
  }
}
