
/**
 * Extrait l'ID d'une vidéo YouTube depuis n'importe quel format d'URL.
 */
export function getYouTubeID(url: string): string | null {
  if (!url) return null;
  
  // Supporte: 
  // youtube.com/watch?v=...
  // youtu.be/...
  // youtube.com/embed/...
  // youtube.com/shorts/...
  // youtube.com/v/...
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    return match[2];
  }
  
  // Regex alternative de secours
  const altRegExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const altMatch = url.match(altRegExp);
  
  return altMatch ? altMatch[1] : null;
}

/**
 * Génère le lien d'intégration (embed) sécurisé.
 * Utilise youtube-nocookie.com pour éviter l'erreur "Service non disponible"
 * et améliorer la compatibilité avec les comptes Google Workspace.
 */
export function getYouTubeEmbedUrl(videoId: string | null): string | null {
  if (!videoId) return null;
  // Paramètres optimisés : pas de vidéos suggérées (rel=0), marque discrète (modestbranding=1)
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0`;
}
