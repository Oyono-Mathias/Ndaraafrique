'use client';

/**
 * @fileOverview Lecteur Vidéo Premium Ndara Afrique via Iframe Bunny.net Stream pure.
 * Utilise le format direct recommandé par le CEO.
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
    // Récupération de l'ID de bibliothèque configuré par l'admin
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Settings;
        const id = data.platform?.bunnyLibraryId || "382715";
        setLibraryId(id);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [db]);

  if (isLoading) {
    return (
      <div className="aspect-video w-full bg-slate-900 rounded-[2rem] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Format : https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID
  const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;

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