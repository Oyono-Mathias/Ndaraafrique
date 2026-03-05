'use server';

import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Actions serveur pour l'API Bunny Stream.
 */

const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const API_KEY = process.env.BUNNY_API_KEY;

export async function createBunnyVideo(title: string, instructorId: string) {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(instructorId).get();
    const userData = userDoc.data();

    if (!userDoc.exists || (userData?.role !== 'instructor' && userData?.role !== 'admin')) {
      throw new Error("Accès refusé : Autorisation formateur requise.");
    }

    if (!API_KEY || !LIBRARY_ID) {
        throw new Error("Configuration Bunny.net manquante sur le serveur.");
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
      const errorBody = await response.text();
      throw new Error(`Erreur Bunny Stream (${response.status}) : ${errorBody}`);
    }

    const data = await response.json();
    return { success: true, guid: data.guid as string };
  } catch (error: any) {
    console.error("Bunny Action Error:", error.message);
    return { success: false, error: error.message as string };
  }
}

/**
 * Récupère les métadonnées d'une vidéo (incluant la durée en secondes).
 */
export async function getBunnyVideoMetadata(videoId: string) {
    try {
        if (!API_KEY || !LIBRARY_ID) {
            throw new Error("Configuration Bunny.net manquante.");
        }

        const url = `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`;
        const response = await fetch(url, {
            headers: {
                'AccessKey': API_KEY,
                'accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Erreur Bunny Metadata (${response.status})`);
        }

        const data = await response.json();
        // data.length contient la durée en secondes
        return { 
            success: true, 
            length: data.length || 0,
            status: data.status, // 0: Queued, 1: Processing, 2: Encoding, 3: Finished, 4: ResolutionFinished, 5: Failed
            title: data.title 
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
