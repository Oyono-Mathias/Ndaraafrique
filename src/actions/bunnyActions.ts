'use server';

import { createHash } from 'crypto';

/**
 * @fileOverview Actions serveur pour l'API Bunny (Stream & Storage).
 */

const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID || "607753";
const API_KEY = process.env.BUNNY_API_KEY || "bbdd6d9f-1b73-4228-9ba800bde9d1-942a-475f"; 
const SECURITY_KEY = process.env.BUNNY_SECURITY_KEY || "810ccb8b-3439-45f1-9b94-21d4e3f800af";

// --- CONFIGURATION BUNNY STORAGE ---
const STORAGE_ZONE_NAME = process.env.BUNNY_STORAGE_ZONE_NAME || "ndara-afrique-storage";
const STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD; // Doit être configuré dans .env
const PULL_ZONE_URL = process.env.BUNNY_PULL_ZONE_URL || "https://ndara-assets.b-cdn.net";

/**
 * Génère un jeton de sécurité (Signed URL) pour le lecteur Bunny Stream.
 */
export async function getVideoToken(videoId: string) {
  if (!SECURITY_KEY || !LIBRARY_ID) {
    console.warn("BUNNY_SECURITY_KEY ou LIBRARY_ID non configurés.");
    return { success: false, token: null };
  }

  try {
    const expires = Math.floor(Date.now() / 1000) + 7200; // 2 heures
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
    return { success: false, error: "Échec de sécurisation." };
  }
}

/**
 * Récupère les métadonnées d'une vidéo (Durée, Statut).
 */
export async function getBunnyVideoMetadata(videoId: string) {
    try {
        if (!API_KEY || !LIBRARY_ID) throw new Error("Config Bunny manquante.");

        const url = `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`;
        const response = await fetch(url, {
            headers: { 
                'AccessKey': API_KEY, 
                'accept': 'application/json' 
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur Bunny (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        return { 
            success: true, 
            length: data.length || 0, 
            status: data.status, 
            title: data.title 
        };
    } catch (error: any) {
        console.error("METADATA_FETCH_ERROR:", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Supprime définitivement une vidéo de Bunny Stream.
 */
export async function deleteBunnyVideo(videoId: string) {
    try {
        if (!API_KEY || !LIBRARY_ID) return { success: false, error: "Configuration API Bunny manquante." };

        const url = `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'AccessKey': API_KEY, 'accept': 'application/json' },
        });

        if (!response.ok) return { success: false, error: `Erreur Bunny Stream: ${response.status}` };
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Retourne les infos pour l'accès public aux fichiers du Storage Bunny.
 */
export async function getBunnyStorageConfig() {
    return {
        zoneName: STORAGE_ZONE_NAME,
        pullZoneUrl: PULL_ZONE_URL,
        hasPassword: !!STORAGE_PASSWORD
    };
}
