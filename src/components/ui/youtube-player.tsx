
'use client';

import React from 'react';
import { getYouTubeID, getYouTubeEmbedUrl } from '@/lib/youtube-utils';
import { AlertCircle } from 'lucide-react';

interface YoutubePlayerProps {
  url: string;
  className?: string;
}

/**
 * Lecteur vidéo YouTube robuste pour Ndara Afrique.
 * Supporte : watch, youtu.be, embed et Shorts.
 * Utilise nocookie.com pour contourner les restrictions de compte.
 */
export function YoutubePlayer({ url, className }: YoutubePlayerProps) {
  const videoId = getYouTubeID(url);
  const embedUrl = getYouTubeEmbedUrl(videoId);

  if (!videoId || !embedUrl) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full bg-slate-900 rounded-2xl border-2 border-dashed border-slate-800 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4 opacity-50" />
        <h3 className="text-white font-bold uppercase tracking-tight">Lien vidéo invalide</h3>
        <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">Le format du lien YouTube n'est pas reconnu. Veuillez vérifier l'URL dans l'administration.</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl border border-white/5 ${className}`}>
      <iframe
        src={embedUrl}
        title="Ndara Afrique Video Player"
        width="100%"
        height="100%"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      ></iframe>
    </div>
  );
}
