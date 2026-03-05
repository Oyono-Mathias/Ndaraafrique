'use server';

import { getAdminDb } from '@/firebase/admin';
import { createHash } from 'crypto';

/**
 * @fileOverview Actions serveur pour l'API Bunny Stream et la génération de Signed URLs.
 */

const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const API_KEY = process.env.BUNNY_API_KEY; // Stream API Key
const SECURITY_KEY = process.env.BUNNY_SECURITY_KEY; // Token Authentication Key (Library > Security)

/**
 * Génère un jeton de sécurité (Signed URL) pour le lecteur Bunny Stream.
 * Algorithme : SHA256(SecurityKey + VideoID + Expires)
 */
export async function getVideoToken(videoId: string) {
  if (!SECURITY_KEY || !LIBRARY_ID) {
    console.warn("BUNNY_SECURITY_KEY ou LIBRARY_ID non configurés sur Vercel.");
    return { success: false, token: null };
  }

  try {
    // Expiration dans 2 heures (7200 secondes)
    const expires = Math.floor(Date.now() / 1000) + 7200;
    
    // Construction de la chaîne de signature selon la spec Bunny
    const input = SECURITY_KEY + videoId + expires;
    const token = createHash('sha256').update(input).digest('hex');

    return { 
      success: true, 
      token, 
      expires,
      libraryId: LIBRARY_ID 
    };
  } catch (error) {
    console.error("TOKEN_GEN_ERROR:", error);
    return { success: false, error: "Échec de sécurisation de la vidéo." };
  }
}

/**
 * Récupère les métadonnées réelles d'une vidéo depuis Bunny (Titre, Durée...).
 */
export async function getBunnyVideoMetadata(videoId: string) {
    try {
        if (!API_KEY || !LIBRARY_ID) {
            throw new Error("Configuration Bunny.net (API Key) manquante.");
        }

        const url = `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`;
        const response = await fetch(url, {
            headers: {
                'AccessKey': API_KEY,
                'accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("BUNNY_METADATA_ERROR:", response.status, errorBody);
            throw new Error(`Erreur Bunny Metadata (${response.status})`);
        }

        const data = await response.json();
        return { 
            success: true, 
            length: data.length || 0,
            status: data.status, 
            title: data.title 
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
