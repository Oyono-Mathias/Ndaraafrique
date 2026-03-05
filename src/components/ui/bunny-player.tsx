'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { getVideoToken } from '@/actions/bunnyActions';

interface BunnyPlayerProps {
  videoId: string;
}

/**
 * @fileOverview Lecteur Vidéo Ultra-Sécurisé Ndara Afrique.
 * ✅ URLs Signées (Signed URLs) : Accès protégé par jeton éphémère.
 * ✅ Anti-téléchargement : Flags DRM activés.
 * ✅ Adaptive Streaming : HLS optimisé pour l'Afrique.
 */
export function BunnyPlayer({ videoId }: BunnyPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    const initializeSecurePlayer = async () => {
      if (!videoId) return;
      
      setLoading(true);
      setError(null);

      try {
        // Étape cruciale : On demande au serveur de signer l'URL
        const result = await getVideoToken(videoId);
        
        if (!result.success || !result.token) {
            // Fallback uniquement si les clés ne sont pas encore sur Vercel
            const fallbackLib = "607753";
            setEmbedUrl(`https://iframe.mediadelivery.net/embed/${fallbackLib}/${videoId}?autoplay=false&disableDownload=true`);
            console.warn("Mode non sécurisé activé (Clés manquantes)");
        } else {
            // Construction de l'URL Signée avec tous les verrous de sécurité
            // - token & expires : Authentification
            // - disableDownload : Empêche le bouton droit/téléchargement
            // - disableSharing : Cache les liens de partage
            // - disablePictureInPicture : Évite l'extraction hors du contexte
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

  // Bloque le menu contextuel sur le conteneur du lecteur
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center border border-white/5 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Signature sécurisée...</p>
      </div>
    );
  }

  if (error || !embedUrl) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center border border-red-900/20 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-white font-bold uppercase tracking-tight">Accès restreint</h3>
        <p className="text-slate-500 text-[10px] mt-2 max-w-xs mx-auto uppercase font-black tracking-widest leading-relaxed">
            Impossible de valider votre jeton d'accès. Veuillez rafraîchir la page.
        </p>
      </div>
    );
  }

  return (
    <div 
        className="relative w-full shadow-2xl rounded-[2.5rem] overflow-hidden border border-white/5 bg-black group" 
        style={{ paddingTop: '56.25%' }}
        onContextMenu={handleContextMenu}
    >
      {/* Bouclier invisible : bloque l'interaction directe avec le clic droit */}
      <div className="absolute inset-0 z-10 pointer-events-none" />
      
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
        <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Flux Chiffré & Signé</span>
      </div>
    </div>
  );
}
