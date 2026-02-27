'use server';

/**
 * @fileOverview Actions serveur pour interagir avec l'API Bunny Stream.
 * Gère la création de placeholders vidéo avant l'upload direct.
 */

const LIBRARY_ID = '382715';
const API_KEY = 'bbdd6d9f-1b73-4228-9ba800bde9d1-942a-475f';

/**
 * Crée une entrée vidéo vide dans la bibliothèque Bunny Stream.
 * @param title Le titre de la leçon.
 * @returns L'objet vidéo contenant le GUID (videoId).
 */
export async function createBunnyVideo(title: string) {
  const url = `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`;
  
  try {
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
      throw new Error(errorData.message || 'Impossible de préparer le serveur Bunny.net');
    }

    const data = await response.json();
    return { 
      success: true, 
      guid: data.guid,
      libraryId: LIBRARY_ID,
      apiKey: API_KEY
    };
  } catch (error: any) {
    console.error("Bunny API Prep Error:", error.message);
    return { success: false, error: error.message };
  }
}
