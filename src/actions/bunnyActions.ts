
'use server';

import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Actions serveur pour l'API Bunny Stream.
 * Diagnostic renforcé pour tracer les erreurs dans les logs Vercel.
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
      console.error("BUNNY_API_ERROR_DETAILS:", {
        status: response.status,
        body: errorBody,
        libraryId: LIBRARY_ID,
        endpoint: url
      });
      throw new Error(`Erreur Bunny Stream (${response.status}) : ${errorBody}`);
    }

    const data = await response.json();
    return { success: true, guid: data.guid as string };
  } catch (error: any) {
    console.error("Bunny Action Error:", error.message);
    return { success: false, error: error.message as string };
  }
}
