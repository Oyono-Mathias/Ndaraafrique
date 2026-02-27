'use client';

import React from 'react';
import { AlertCircle, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BunnyPlayerProps {
  videoId: string;
  className?: string;
}

/**
 * @fileOverview Lecteur Vidéo Premium Ndara Afrique propulsé par Bunny.net Stream.
 * Utilise le Library ID : 382715 pour un streaming sécurisé et sans logo externe.
 */
const LIBRARY_ID = "382715";

export function BunnyPlayer({ videoId, className }: BunnyPlayerProps) {
  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-800 p-6 text-center shadow-2xl">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4 opacity-50" />
        <h3 className="text-white font-bold uppercase tracking-tight text-sm">Vidéo en attente</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto uppercase font-bold tracking-widest">
          L'identifiant technique Bunny.net n'est pas encore configuré pour cette leçon.
        </p>
      </div>
    );
  }

  // URL d'intégration Bunny Stream optimisée
  // Paramètres : preload pour la rapidité, responsive pour le mobile
  const embedUrl = `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

  return (
    <div className={cn(
      "relative w-full overflow-hidden rounded-[2.5rem] bg-black shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/5 group",
      className
    )}>
      {/* Overlay de protection et Branding Ndara */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="bg-primary/20 backdrop-blur-xl px-4 py-2 rounded-2xl border border-primary/30 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Ndara Afrique Secure Stream</span>
        </div>
      </div>

      <div className="relative pt-[56.25%] w-full">
        <iframe
          src={embedUrl}
          loading="lazy"
          className="absolute top-0 left-0 w-full h-full border-none"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen;"
          allowFullScreen
          title="Lecteur Vidéo Ndara Afrique"
        ></iframe>
      </div>
      
      {/* Masque de protection inférieur pour éviter les clics sur les logos tiers si présents */}
      <div className="absolute bottom-0 right-0 w-32 h-12 z-30 bg-transparent" />
    </div>
  );
}
