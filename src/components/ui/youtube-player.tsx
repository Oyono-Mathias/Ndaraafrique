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
 * Masque au maximum le branding YouTube pour une expérience immersive.
 * Ajoute des masques de protection pour cacher le titre et le logo.
 */
export function YoutubePlayer({ url, className }: YoutubePlayerProps) {
  // Extraction de l'ID vidéo
  const videoId = useMemo(() => getYouTubeID(url), [url]);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full bg-slate-900 rounded-2xl border-2 border-dashed border-slate-800 p-6 text-center shadow-2xl">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4 opacity-50" />
        <h3 className="text-white font-bold uppercase tracking-tight text-sm">Contenu absent</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto uppercase font-bold tracking-widest">Aucun lien vidéo configuré.</p>
      </div>
    );
  }

  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full bg-slate-900 rounded-2xl border-2 border-dashed border-red-900/30 p-6 text-center shadow-2xl">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-white font-bold uppercase tracking-tight text-sm">Lien non reconnu</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto uppercase font-bold tracking-widest">Le format du lien est invalide.</p>
      </div>
    );
  }

  // modestbranding=1 : retire le logo YouTube de la barre de contrôle
  // rel=0 : limite les suggestions à la chaîne d'origine (si possible)
  // iv_load_policy=3 : désactive les annotations
  // showinfo=0 : déprécié mais inclus pour compatibilité
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&controls=1&autoplay=0`;

  return (
    <div className={cn(
      "relative w-full overflow-hidden rounded-2xl bg-black shadow-2xl border border-white/10 group",
      className
    )}>
      {/* 
          MASQUE SUPÉRIEUR (Titre & Chaîne) 
          Empêche de voir et de cliquer sur le titre YouTube qui trahit la provenance.
      */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black via-black/60 to-transparent z-20 pointer-events-none transition-opacity duration-500 group-hover:opacity-0" />
      
      {/* Bouclier interactif : empêche le clic sur le bandeau de titre */}
      <div className="absolute top-0 left-0 right-0 h-14 z-30 bg-transparent" />

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
      
      {/* 
          MASQUE INFÉRIEUR DROIT 
          Cache le bouton "Regarder sur YouTube" qui apparaît parfois au survol.
      */}
      <div className="absolute bottom-0 right-0 w-32 h-12 z-30 bg-transparent" />
    </div>
  );
}
