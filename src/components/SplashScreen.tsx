'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Splash Screen Cinématique Ndara Afrique.
 * ✅ DESIGN : Prestige Netflix-style reveal.
 * ✅ PERFORMANCE : S'affiche une seule fois par session.
 */
export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const sessionStarted = sessionStorage.getItem('ndara-session-started');
    if (!sessionStarted) {
      setIsVisible(true);
      sessionStorage.setItem('ndara-session-started', 'true');

      // 2.5 secondes de prestige total
      const fadeTimer = setTimeout(() => {
        setIsFading(true);
      }, 2500);

      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f172a] transition-opacity duration-700 ease-in-out",
        isFading ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Texture grainée pour le côté vintage/premium */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/p6.png')]" />
      
      <div className="relative flex flex-col items-center">
        {/* Lueur cinématique derrière le logo */}
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-[glowReveal_2s_ease-out_forwards_0.5s]" />
        
        <div className="relative overflow-hidden p-4">
          {/* Logo avec Révélation Douce */}
          <div className="animate-[cinematicReveal_1.5s_cubic-bezier(0.22,1,0.36,1)_forwards_0.3s] opacity-0 scale-90">
            <Image
              src="/logo.png"
              alt="Ndara Afrique"
              width={180}
              height={180}
              className="relative z-10 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              priority
            />
          </div>
          
          {/* Balayage Lumineux (Light Sweep) */}
          <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg] animate-[splashSheen_1.8s_ease-in-out_forwards_0.8s] z-20" />
        </div>

        {/* Signature Textuelle */}
        <div className="mt-8 overflow-hidden">
            <p className="text-primary font-black uppercase text-[10px] animate-[textReveal_1.2s_ease-out_forwards_1.2s] opacity-0 translate-y-4">
                Excellence Panafricaine
            </p>
        </div>
      </div>
    </div>
  );
}