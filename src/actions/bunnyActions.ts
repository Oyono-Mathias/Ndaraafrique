'use server';

import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Actions serveur pour interagir avec l'API Bunny Stream.
 * Gère la création sécurisée de placeholders vidéos pour le Direct Upload.
 */

const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID || '382715';
const API_KEY = process.env.BUNNY_API_KEY || 'bbdd6d9f-1b73-4228-9ba800bde9d1-942a-475f';

/**
 * Prépare une entrée vidéo chez Bunny Stream.
 * Vérifie le rôle de l'instructeur avant de donner l'autorisation d'upload.
 */
export async function createBunnyVideo(title: string, instructorId: string) {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(instructorId).get();
    const userData = userDoc.data();

    // SÉCURITÉ : Seuls les formateurs approuvés ou admins peuvent uploader
    if (!userDoc.exists || (userData?.role !== 'instructor' && userData?.role !== 'admin')) {
      throw new Error("Accès refusé : Seuls les formateurs approuvés peuvent uploader des vidéos.");
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
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur lors de la création sur Bunny.net');
    }

    const data = await response.json();

    return { 
      success: true, 
      guid: data.guid as string, 
      libraryId: LIBRARY_ID,
      uploadKey: API_KEY // On transmet la clé pour le PUT direct (sécurisé via SSL)
    };
  } catch (error: any) {
    console.error("Bunny API Prep Error:", error.message);
    return { success: false, error: error.message as string };
  }
}
