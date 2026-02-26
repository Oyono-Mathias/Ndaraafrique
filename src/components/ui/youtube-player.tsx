'use client';

import React, { useEffect, useRef } from 'react';
import { getYouTubeID } from '@/lib/youtube-utils';
import { AlertCircle } from 'lucide-react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

interface YoutubePlayerProps {
  url: string;
  className?: string;
}

/**
 * Lecteur Premium Plyr habillant YouTube.
 * Masque l'interface native de YouTube et offre une expérience immersive.
 */
export function YoutubePlayer({ url, className }: YoutubePlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const videoId = getYouTubeID(url);

  useEffect(() => {
    if (!videoRef.current || !videoId) return;

    // Initialisation de Plyr avec configuration optimisée
    playerRef.current = new Plyr(videoRef.current, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
      youtube: {
        noCookie: true,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        modestbranding: 1
      }
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full bg-slate-900 rounded-2xl border-2 border-dashed border-slate-800 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4 opacity-50" />
        <h3 className="text-white font-bold uppercase tracking-tight text-sm">Lien non reconnu</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto uppercase font-bold">Veuillez vérifier l'URL YouTube dans l'administration.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl border border-white/5", className)}>
      <div 
        ref={videoRef} 
        data-plyr-provider="youtube" 
        data-plyr-embed-id={videoId}
      />
    </div>
  );
}

// Helper pour concaténer les classes si lib/utils n'est pas chargé
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
