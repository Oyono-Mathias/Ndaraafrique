/**
 * @fileOverview Utilitaires pour la manipulation des liens YouTube.
 */

/**
 * Extrait l'ID d'une vidéo YouTube depuis n'importe quel format d'URL.
 * Supporte : watch?v=, youtu.be/, embed/, shorts/, m.youtube.com
 */
export function getYouTubeID(url: string): string | null {
  if (!url) return null;
  
  // Regex exhaustive pour tous les formats YouTube connus (Standard, Shorts, Mobile, Embed)
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  
  return match ? match[1] : null;
}

/**
 * Génère le lien d'intégration (embed) sécurisé sans cookies.
 */
export function getYouTubeEmbedUrl(videoId: string | null): string | null {
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&autoplay=0`;
}
