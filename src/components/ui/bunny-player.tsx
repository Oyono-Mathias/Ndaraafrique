
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, AlertCircle, FileVideo } from 'lucide-react';
import { getVideoToken } from '@/actions/bunnyActions';

interface BunnyPlayerProps {
  videoId: string;
}

/**
 * @fileOverview Lecteur Vidéo Ultra-Sécurisé Ndara Afrique.
 * ✅ RÉSOLU : Gestion robuste des IDs vides ou invalides (Évite le 404 Bunny).
 */
export function BunnyPlayer({ videoId }: BunnyPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    const initializeSecurePlayer = async () => {
      // ✅ Sécurité : Si pas d'ID, on affiche l'état vide au lieu de l'iframe 404
      if (!videoId || videoId === "0" || videoId === "none") {
        setLoading(false);
        setError("VIDE");
        return;
      }
      
      setLoading(true);
      setError(null);

      try {
        const result = await getVideoToken(videoId);
        
        if (!result.success || !result.token) {
            // Fallback si pas de token (version publique ou erreur de signature)
            const fallbackLib = "607753";
            setEmbedUrl(`https://iframe.mediadelivery.net/embed/${fallbackLib}/${videoId}?autoplay=false&disableDownload=true`);
        } else {
            const url = `https://iframe.mediadelivery.net/embed/${result.libraryId}/${videoId}?token=${result.token}&expires=${result.expires}&autoplay=false&preload=true&responsive=true&disableDownload=true&disablePictureInPicture=true&disableSharing=true`;
            setEmbedUrl(url);
        }
      } catch (err: any) {
        setError("La sécurisation de la vidéo a échoué.");
      } finally {
        setLoading(false);
      }
    };

    initializeSecurePlayer();
  }, [videoId]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Signature Ndara...</p>
      </div>
    );
  }

  if (error === "VIDE") {
    return (
      <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
        <FileVideo className="h-12 w-12 text-slate-700 mb-4 opacity-50" />
        <h3 className="text-white font-bold uppercase tracking-tight text-sm">Vidéo absente</h3>
        <p className="text-slate-500 text-[10px] mt-2 uppercase font-black tracking-widest leading-relaxed">
            Ce chapitre n'a pas encore de contenu vidéo lié.
        </p>
      </div>
    );
  }

  if (error || !embedUrl) {
    return (
      <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-white font-bold uppercase tracking-tight text-sm">Accès restreint</h3>
        <p className="text-slate-500 text-[10px] mt-2 uppercase font-black tracking-widest leading-relaxed">
            Impossible de valider votre jeton d'accès.
        </p>
      </div>
    );
  }

  return (
    <div 
        className="relative w-full h-full bg-black group" 
        onContextMenu={handleContextMenu}
    >
      <iframe
        src={embedUrl}
        loading="lazy"
        className="absolute top-0 left-0 h-full w-full"
        style={{ border: 0 }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen={true}
        title="Lecteur Ndara Premium"
      ></iframe>

      {/* Badge Sécurité Ndara */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Flux Chiffré</span>
      </div>
    </div>
  );
}
