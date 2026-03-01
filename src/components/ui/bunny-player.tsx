'use client';

/**
 * @fileOverview Lecteur Vidéo Premium Ndara Afrique propulsé par Bunny.net Stream.
 * ✅ RÉSOLU : ID de bibliothèque dynamique via réglages admin.
 * ✅ RÉSOLU : Nettoyage automatique du Video ID (GUID extraction).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, ShieldCheck, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import type { Settings } from '@/lib/types';

interface BunnyPlayerProps {
  videoId: string;
  className?: string;
}

export function BunnyPlayer({ videoId, className }: BunnyPlayerProps) {
  const db = getFirestore();
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger le Library ID depuis les réglages globaux
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Settings;
        setLibraryId(data.platform?.bunnyLibraryId || "382715");
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [db]);

  // Nettoyage intelligent de l'ID (au cas où le formateur copie une URL entière)
  const cleanVideoId = useMemo(() => {
    if (!videoId) return "";
    // GUID est une chaîne de 36 caractères avec des tirets
    const guidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = videoId.match(guidRegex);
    return match ? match[0] : videoId;
  }, [videoId]);

  if (isLoading) {
    return (
      <div className="aspect-video w-full bg-slate-900 rounded-[2.5rem] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!libraryId) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-red-900/30 p-6 text-center shadow-2xl">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-white font-bold uppercase tracking-tight text-sm">Configuration manquante</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto uppercase font-bold tracking-widest">
          L'administrateur doit configurer le "Library ID" dans les paramètres.
        </p>
      </div>
    );
  }

  if (!cleanVideoId) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-800 p-6 text-center shadow-2xl">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4 opacity-50" />
        <h3 className="text-white font-bold uppercase tracking-tight text-sm">Contenu absent</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto uppercase font-bold tracking-widest">
          Aucun identifiant vidéo n'a été fourni pour cette leçon.
        </p>
      </div>
    );
  }

  const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${cleanVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

  return (
    <div className={cn(
      "relative w-full overflow-hidden rounded-[2.5rem] bg-black shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/5 group",
      className
    )}>
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="bg-primary/20 backdrop-blur-xl px-4 py-2 rounded-2xl border border-primary/30 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Ndara Secure Stream</span>
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
      
      <div className="absolute bottom-0 right-0 w-32 h-12 z-30 bg-transparent" />
    </div>
  );
}
