'use client';

/**
 * @fileOverview Lecteur Vidéo Premium Ndara Afrique propulsé par Bunny.net Stream.
 * ✅ RÉSOLU : Accès robuste à l'ID de bibliothèque (Library ID).
 * ✅ RÉSOLU : Nettoyage automatique du Video ID (GUID extraction).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    // Écoute en temps réel des paramètres pour récupérer le Library ID
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Settings;
        // On cherche le Library ID dans platform ou general
        const id = data.platform?.bunnyLibraryId || (data as any).bunnyLibraryId || "382715";
        setLibraryId(id);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [db]);

  // Nettoyage intelligent : si on met une URL, on n'extrait que le GUID
  const cleanVideoId = useMemo(() => {
    if (!videoId) return "";
    const guidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = videoId.match(guidRegex);
    return match ? match[0] : videoId;
  }, [videoId]);

  if (isLoading) {
    return (
      <div className="aspect-video w-full bg-slate-900 rounded-[2rem] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cleanVideoId) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-800 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4 opacity-50" />
        <h3 className="text-white font-bold uppercase text-sm">Identifiant Manquant</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto font-bold uppercase tracking-widest">
          Veuillez saisir le Video ID (GUID) dans les paramètres de la leçon.
        </p>
      </div>
    );
  }

  // URL d'intégration Bunny sécurisée
  const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${cleanVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

  return (
    <div className={cn(
      "relative w-full overflow-hidden rounded-[2rem] bg-black shadow-2xl border border-white/5 group",
      className
    )}>
      {/* Badge de sécurité Ndara */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="bg-primary/20 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-primary/30 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-[9px] font-black text-white uppercase tracking-widest">Ndara Stream Securisé</span>
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
      
      {/* Overlay invisible pour protéger les contrôles si nécessaire */}
      <div className="absolute bottom-0 right-0 w-24 h-10 z-30 bg-transparent" />
    </div>
  );
}