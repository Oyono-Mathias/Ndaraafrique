
'use server';

import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Actions serveur pour l'API Bunny Stream.
 * Gère la création de l'entrée vidéo avant le téléversement direct.
 */

const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const API_KEY = process.env.BUNNY_API_KEY;

export async function createBunnyVideo(title: string, instructorId: string) {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(instructorId).get();
    const userData = userDoc.data();

    // Sécurité : Seuls les instructeurs ou admins Ndara peuvent uploader
    if (!userDoc.exists || (userData?.role !== 'instructor' && userData?.role !== 'admin')) {
      throw new Error("Accès refusé : Seuls les formateurs peuvent uploader.");
    }

    // Diagnostic : Vérifier si la configuration est présente
    if (!API_KEY || API_KEY.length < 10) {
        throw new Error("Configuration Bunny.net manquante : Assurez-vous que BUNNY_API_KEY est configurée dans Vercel.");
    }

    if (!LIBRARY_ID) {
        throw new Error("ID de bibliothèque Bunny manquant (BUNNY_LIBRARY_ID).");
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
      if (status === 401) {
          throw new Error("Clé API Bunny invalide (401). Vérifiez votre AccessKey dans les paramètres Bunny.net.");
      }
      if (status === 404) {
          throw new Error("Bibliothèque Bunny introuvable (404). Vérifiez votre Library ID.");
      }
      throw new Error(`Erreur API Bunny (Statut ${status})`);
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
