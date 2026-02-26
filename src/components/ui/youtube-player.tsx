'use client';

import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getYouTubeID } from '@/lib/youtube-utils';

interface YoutubePlayerProps {
  url: string;
  className?: string;
}

/**
 * Lecteur Vidéo Ndara Afrique optimisé pour YouTube.
 * Utilise une iframe native pour une compatibilité maximale sur mobile.
 * Supporte les formats standards et les Shorts.
 */
export function YoutubePlayer({ url, className }: YoutubePlayerProps) {
  // Extraction de l'ID vidéo de manière robuste
  const videoId = useMemo(() => getYouTubeID(url), [url]);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full bg-slate-900 rounded-2xl border-2 border-dashed border-slate-800 p-6 text-center shadow-2xl">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4 opacity-50" />
        <h3 className="text-white font-bold uppercase tracking-tight text-sm">Contenu absent</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto uppercase font-bold tracking-widest">Aucun lien vidéo n'a été trouvé pour cette leçon.</p>
      </div>
    );
  }

  // Si l'ID ne peut pas être extrait, on affiche une erreur claire
  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full bg-slate-900 rounded-2xl border-2 border-dashed border-red-900/30 p-6 text-center shadow-2xl">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-white font-bold uppercase tracking-tight text-sm">Lien non reconnu</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto uppercase font-bold tracking-widest leading-relaxed">
          Le format du lien YouTube est invalide. Veuillez vérifier l'URL en base de données.
        </p>
      </div>
    );
  }

  // Lien embed sécurisé sans cookies
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&autoplay=0`;

  return (
    <div className={cn(
      "relative w-full overflow-hidden rounded-2xl bg-black shadow-2xl border border-white/10 group",
      className
    )}>
      {/* Conteneur 16/9 responsive */}
      <div className="relative pt-[56.25%] w-full">
        <iframe
          src={embedUrl}
          className="absolute top-0 left-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="Ndara Afrique Video Player"
          frameBorder="0"
        ></iframe>
      </div>
    </div>
  );
}
