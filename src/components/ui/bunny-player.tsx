'use client';

/**
 * @fileOverview Lecteur Vidéo Premium Ndara Afrique via Iframe Bunny.net Stream.
 * Optimisé pour la performance et la compatibilité mobile (Android-First).
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
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
    // Récupération de l'ID de bibliothèque configuré par l'admin
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Settings;
        // Utilisation du Library ID paramétré ou valeur par défaut
        const id = data.platform?.bunnyLibraryId || "382715";
        setLibraryId(id);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [db]);

  // Extraction propre du GUID au cas où le formateur colle une URL entière
  const cleanVideoId = React.useMemo(() => {
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

  if (!cleanVideoId || !libraryId) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-800 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4 opacity-50" />
        <h3 className="text-white font-bold uppercase text-sm tracking-tight">Configuration Requise</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto font-bold uppercase tracking-widest leading-relaxed">
          L'ID de bibliothèque (Admin) ou l'ID de vidéo (Leçon) est manquant.
        </p>
      </div>
    );
  }

  // URL d'intégration Bunny standard
  const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${cleanVideoId}`;

  return (
    <div className="w-full shadow-2xl rounded-[2rem] overflow-hidden border border-white/5 bg-black">
      <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
        <iframe
          src={embedUrl}
          loading="lazy"
          className="absolute top-0 left-0 w-full h-full border-none"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen;"
          allowFullScreen={true}
          title="Lecteur Vidéo Ndara Afrique"
        ></iframe>
      </div>
    </div>
  );
}
