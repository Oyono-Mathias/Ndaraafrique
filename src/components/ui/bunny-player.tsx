
'use client';

/**
 * @fileOverview Lecteur Vidéo Premium Ndara Afrique via Iframe Bunny.net Stream.
 * Gère l'extraction automatique du GUID et la configuration du Library ID.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import type { Settings } from '@/lib/types';

interface BunnyPlayerProps {
  videoId: string;
}

export function BunnyPlayer({ videoId }: BunnyPlayerProps) {
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Settings;
        setLibraryId(data.platform?.bunnyLibraryId || null);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [db]);

  const cleanVideoId = useMemo(() => {
    if (!videoId) return '';
    // Extraction automatique du GUID si une URL est saisie au lieu de l'ID seul
    if (videoId.includes('/')) {
      const parts = videoId.split('/');
      const lastPart = parts[parts.length - 1].split('?')[0];
      return lastPart;
    }
    return videoId;
  }, [videoId]);

  if (isLoading) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-[2rem] flex items-center justify-center border border-white/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!libraryId) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center border-2 border-dashed border-amber-500/20 p-6 text-center shadow-2xl">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4 opacity-50" />
        <h3 className="text-white font-bold uppercase tracking-tight text-sm">Configuration Requise</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto uppercase font-bold tracking-widest leading-relaxed">
          L&apos;ID de bibliothèque Bunny n&apos;est pas configuré. <br/>
          Allez dans : Admin &gt; Paramètres &gt; Hébergement Vidéo.
        </p>
      </div>
    );
  }

  const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${cleanVideoId}`;

  return (
    <div 
      className="relative w-full shadow-2xl rounded-[2rem] overflow-hidden border border-white/5 bg-black" 
      style={{ aspectRatio: "16/9" }}
    >
      <iframe
        src={embedUrl}
        loading="lazy"
        style={{ border: 0, position: "absolute", top: 0, height: "100%", width: "100%" }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen={true}
        title="Lecteur Vidéo Ndara Afrique"
      ></iframe>
    </div>
  );
}
