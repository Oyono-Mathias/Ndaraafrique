'use server';

import { getAdminDb } from '@/firebase/admin';
import { createHash } from 'crypto';

/**
 * @fileOverview Actions serveur pour l'API Bunny Stream et la sécurité des vidéos.
 */

const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const API_KEY = process.env.BUNNY_API_KEY; // Account API Key
const SECURITY_KEY = process.env.BUNNY_SECURITY_KEY; // Token Authentication Key

/**
 * Génère un token de sécurité (URL Signée) pour le lecteur Bunny Stream.
 * Empêche l'accès non autorisé et le partage de liens.
 */
export async function getVideoToken(videoId: string) {
  if (!SECURITY_KEY || !LIBRARY_ID) {
    console.warn("BUNNY_SECURITY_KEY non configurée. Accès non sécurisé.");
    return { success: false, token: null };
  }

  try {
    // Expiration dans 2 heures
    const expires = Math.floor(Date.now() / 1000) + 7200;
    const input = SECURITY_KEY + videoId + expires;
    const token = createHash('sha256').update(input).digest('hex');

    return { 
      success: true, 
      token, 
      expires,
      libraryId: LIBRARY_ID 
    };
  } catch (error) {
    return { success: false, error: "Erreur lors de la génération du jeton." };
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
            status: data.status, 
            title: data.title 
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
