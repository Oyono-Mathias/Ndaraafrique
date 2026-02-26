/**
 * @fileOverview Utilitaires pour la manipulation des liens YouTube.
 */

/**
 * Extrait l'ID d'une vidéo YouTube depuis n'importe quel format d'URL.
 * Supporte : watch?v=, youtu.be/, embed/, shorts/
 */
export function getYouTubeID(url: string): string | null {
  if (!url) return null;
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    return match[2];
  }
  
  // Regex alternative de secours pour les formats complexes
  const altRegExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const altMatch = url.match(altRegExp);
  
  return altMatch ? altMatch[1] : null;
}

/**
 * Génère le lien d'intégration (embed) sécurisé sans cookies.
 */
export function getYouTubeEmbedUrl(videoId: string | null): string | null {
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&autoplay=0`;
}
