
'use client';

/**
 * @fileOverview Écran de chargement optimisé Ndara Afrique.
 * ✅ PERFORMANCE : Minimaliste pour ne pas bloquer le thread principal.
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';

const loadingMessages = [
  "Ndara Afrique prépare votre savoir...",
  "Connexion aux tuteurs Ndara...",
  "L'excellence est en chemin...",
  "Tonga na ndara...",
  "Bara ala, nous arrivons...",
];

export function LoadingScreen() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative flex flex-col items-center gap-8 animate-in fade-in duration-500">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-12 w-12 bg-slate-900 rounded-full flex items-center justify-center shadow-2xl">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" priority />
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-primary font-black uppercase tracking-[0.4em] text-[10px]">Ndara Afrique</h2>
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.15em] animate-pulse italic">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
