'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Écran de chargement immersif Ndara Afrique.
 * Design Vintage, animation fluide et messages inspirants.
 */

const loadingMessages = [
  "Ndara Afrique prépare votre savoir...",
  "Connexion aux tuteurs Ndara...",
  "Chargement de votre réussite...",
  "Tonga na ndara...",
  "L'excellence est en chemin...",
  "Préparation de votre parcours...",
  "Bara ala, nous arrivons...",
];

export function LoadingScreen() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Sélectionne un message aléatoire au montage
    const randomIndex = Math.floor(Math.random() * loadingMessages.length);
    setMessage(loadingMessages[randomIndex]);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
      {/* Effet de lumière diffuse en arrière-plan */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Grain vintage subtil */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/noise-lines.png')]" />

      <div className="relative flex flex-col items-center gap-8 animate-in fade-in duration-700">
        {/* Cercle d'animation principal */}
        <div className="relative h-24 w-24">
          {/* Anneau extérieur tournant */}
          <div className="absolute inset-0 rounded-full border-2 border-[#CC7722]/20 border-t-[#CC7722] animate-spin duration-[2s]" />
          
          {/* Icône centrale pulsante */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 bg-[#CC7722]/10 rounded-full animate-pulse">
              <Sparkles className="h-10 w-10 text-[#CC7722]" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Textes */}
        <div className="text-center space-y-3 relative z-10">
          <h2 className="text-[#CC7722] font-black uppercase tracking-[0.4em] text-xs sm:text-sm">
            Ndara Afrique
          </h2>
          <div className="h-4 flex items-center justify-center">
            <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] animate-pulse italic">
              {message}
            </p>
          </div>
        </div>
      </div>

      {/* Barre de progression indéterminée en bas */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-900 overflow-hidden">
        <div className="h-full bg-[#CC7722] w-1/3 animate-[loadingLine_1.5s_infinite_ease-in-out]" />
      </div>

      <style jsx global>{`
        @keyframes loadingLine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
