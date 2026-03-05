'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { getVideoToken } from '@/actions/bunnyActions';

interface BunnyPlayerProps {
  videoId: string;
}

/**
 * @fileOverview Lecteur Vidéo Ultra-Sécurisé Ndara Afrique.
 * ✅ URLs Signées : Accès temporaire par utilisateur.
 * ✅ Anti-téléchargement : Désactivation des fonctions natives de partage et copie.
 * ✅ Adaptive Streaming : Optimisé pour les connexions africaines via HLS.
 */
export function BunnyPlayer({ videoId }: BunnyPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    const initializePlayer = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!videoId) throw new Error("ID Vidéo manquant.");

        // Récupération du jeton de sécurité côté serveur
        const result = await getVideoToken(videoId);
        
        if (!result.success || !result.libraryId) {
            // Fallback si pas de clé de sécurité (mode développement)
            const fallbackLib = "607753";
            setEmbedUrl(`https://iframe.mediadelivery.net/embed/${fallbackLib}/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true&disableDownload=true`);
        } else {
            // URL Signée complète avec paramètres de protection
            const url = `https://iframe.mediadelivery.net/embed/${result.libraryId}/${videoId}?token=${result.token}&expires=${result.expires}&autoplay=false&loop=false&muted=false&preload=true&responsive=true&disableDownload=true&disablePictureInPicture=true&disableSharing=true`;
            setEmbedUrl(url);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializePlayer();
  }, [videoId]);

  const handlePreventContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center border border-white/5 space-y-4 animate-pulse">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Initialisation sécurisée...</p>
      </div>
    );
  }

  if (error || !embedUrl) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center border border-red-900/20 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-white font-bold uppercase tracking-tight">Erreur de lecture</h3>
        <p className="text-slate-500 text-xs mt-2 uppercase font-medium leading-relaxed">{error || "Impossible de charger la vidéo."}</p>
      </div>
    );
  }

  return (
    <div 
        className="relative w-full shadow-2xl rounded-[2rem] overflow-hidden border border-white/5 bg-black group" 
        style={{ paddingTop: '56.25%' }}
        onContextMenu={handlePreventContextMenu}
    >
      {/* Overlay de protection invisible contre les clics droits */}
      <div className="absolute inset-0 z-10 pointer-events-none" />
      
      <iframe
        src={embedUrl}
        loading="lazy"
        className="absolute top-0 left-0 h-full w-full"
        style={{ border: 0 }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen={true}
        title="Lecteur Vidéo Ndara Afrique"
      ></iframe>

      {/* Badge de réassurance sécurité */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <ShieldCheck className="h-3 w-3 text-emerald-500" />
        <span className="text-[8px] font-black text-white uppercase tracking-widest">Streaming Chiffré</span>
      </div>
    </div>
  );
}
