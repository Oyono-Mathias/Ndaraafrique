'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import type { Settings } from '@/lib/types';

interface BunnyPlayerProps {
  videoId: string;
}

/**
 * @fileOverview Lecteur Vidéo Ndara Afrique optimisé pour Bunny Stream.
 * Gère l'extraction propre de l'ID vidéo et utilise l'iframe officielle.
 */
export function BunnyPlayer({ videoId }: BunnyPlayerProps) {
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Settings;
        setLibraryId(data.platform?.bunnyLibraryId || "607753");
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [db]);

  const cleanVideoId = useMemo(() => {
    if (!videoId) return '';
    // Si c'est une URL complète, on extrait le GUID
    if (videoId.includes('/')) {
      const parts = videoId.split('/');
      return parts[parts.length - 1].split('?')[0];
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

  const activeLibraryId = libraryId || "607753";
  const embedUrl = `https://iframe.mediadelivery.net/embed/${activeLibraryId}/${cleanVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

  return (
    <div className="relative w-full shadow-2xl rounded-[2rem] overflow-hidden border border-white/5 bg-black" style={{ paddingTop: '56.25%' }}>
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
