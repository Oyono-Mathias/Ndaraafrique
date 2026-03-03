'use client';

/**
 * @fileOverview Lecteur Vidéo Premium Ndara Afrique via Iframe Bunny.net Stream pure.
 * Utilise le format direct recommandé pour une performance maximale.
 */

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
    // Récupération de l'ID de bibliothèque configuré par l'admin dans Firestore
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Settings;
        // ID par défaut (382715) ou celui configuré en admin
        const id = data.platform?.bunnyLibraryId || "382715";
        setLibraryId(id);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [db]);

  if (isLoading) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-[2rem] flex items-center justify-center border border-white/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Construction de l'URL d'intégration directe
  const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;

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
