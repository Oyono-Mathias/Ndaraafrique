'use client';

import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player/lazy';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YoutubePlayerProps {
  url: string;
  className?: string;
}

/**
 * Lecteur Premium Ndara Afrique utilisant react-player.
 * Configuration optimisée pour masquer le branding YouTube.
 * Format 100% responsif 16/9.
 */
export function YoutubePlayer({ url, className }: YoutubePlayerProps) {
  const [hasWindow, setHasWindow] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setHasWindow(true);
    setError(false);
  }, [url]);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full bg-slate-900 rounded-2xl border-2 border-dashed border-slate-800 p-6 text-center shadow-2xl">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4 opacity-50" />
        <h3 className="text-white font-bold uppercase tracking-tight text-sm">Contenu absent</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto uppercase font-bold tracking-widest">Aucun lien vidéo n'a été trouvé pour cette leçon.</p>
      </div>
    );
  }

  if (!hasWindow) {
    return (
      <div className="flex items-center justify-center aspect-video w-full bg-slate-900 rounded-2xl border border-white/5 shadow-2xl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full bg-slate-900 rounded-2xl border-2 border-dashed border-red-900/30 p-6 text-center shadow-2xl">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-white font-bold uppercase tracking-tight text-sm">Erreur de lecture</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto uppercase font-bold tracking-widest leading-relaxed">
          Impossible de charger la vidéo. Vérifiez le lien ou vos paramètres de sécurité.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative w-full overflow-hidden rounded-2xl bg-black shadow-2xl border border-white/10 group",
      className
    )}>
      {/* Wrapper pour forcer le ratio 16/9 */}
      <div className="relative pt-[56.25%] w-full">
        <ReactPlayer
          url={url}
          className="absolute top-0 left-0"
          width="100%"
          height="100%"
          controls={true}
          playsinline
          onError={() => setError(true)}
          config={{
            youtube: {
              playerVars: {
                modestbranding: 1,
                rel: 0,
                iv_load_policy: 3,
                origin: typeof window !== 'undefined' ? window.location.origin : '',
              }
            }
          }}
        />
      </div>
    </div>
  );
}
