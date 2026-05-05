'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, AlertCircle, FileVideo } from 'lucide-react';
import { getVideoToken } from '@/actions/bunnyActions';
import { getPrivateR2Url } from '@/actions/r2Actions';
import { useRole } from '@/context/RoleContext';

interface BunnyPlayerProps {
  videoId: string;
  courseId?: string;
  provider?: 'bunny' | 'r2';
}

/**
 * @fileOverview Lecteur Vidéo Multi-Source Ndara Afrique.
 * ✅ HYBRIDE : Supporte Bunny Stream et Cloudflare R2 (URLs signées).
 * ✅ SÉCURITÉ : Vérification d'accès via R2 Presigned URLs pour les vidéos privées.
 */
export function BunnyPlayer({ videoId, courseId, provider = 'bunny' }: BunnyPlayerProps) {
  const { user } = useRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const initializePlayer = async () => {
      if (!videoId || videoId === "0" || videoId === "none") {
        setLoading(false);
        setError("VIDE");
        return;
      }
      
      setLoading(true);
      setError(null);

      try {
        if (provider === 'r2') {
            if (!user) throw new Error("Authentification requise.");
            // Récupération d'une URL signée sécurisée pour R2
            const result = await getPrivateR2Url(`lectures/${videoId}`, user.uid, courseId);
            if (result.success) {
                setVideoUrl(result.url || null);
            } else {
                throw new Error(result.error);
            }
        } else {
            // Logique Bunny existante
            const result = await getVideoToken(videoId);
            if (!result.success || !result.token) {
                const fallbackLib = "607753";
                setVideoUrl(`https://iframe.mediadelivery.net/embed/${fallbackLib}/${videoId}?autoplay=false`);
            } else {
                setVideoUrl(`https://iframe.mediadelivery.net/embed/${result.libraryId}/${videoId}?token=${result.token}&expires=${result.expires}`);
            }
        }
      } catch (err: any) {
        setError(err.message || "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    };

    initializePlayer();
  }, [videoId, provider, user, courseId]);

  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

  if (loading) {
    return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Chargement sécurisé...</p>
      </div>
    );
  }

  if (error === "VIDE") {
    return (
      <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
        <FileVideo className="h-12 w-12 text-slate-700 mb-4 opacity-50" />
        <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">Vidéo absente</p>
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">{error || "Accès restreint"}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black group" onContextMenu={handleContextMenu}>
      {provider === 'r2' ? (
          <video 
            src={videoUrl} 
            className="w-full h-full object-contain" 
            controls 
            playsInline 
            controlsList="nodownload"
          />
      ) : (
          <iframe
            src={videoUrl}
            loading="lazy"
            className="absolute top-0 left-0 h-full w-full"
            style={{ border: 0 }}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen={true}
          ></iframe>
      )}

      <div className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Source {provider.toUpperCase()}</span>
      </div>
    </div>
  );
}
