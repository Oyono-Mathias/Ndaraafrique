'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Splash Screen Cinématique Fintech Ndara Afrique.
 * ✅ DESIGN : Light Streaks (Netflix Style), Particules flottantes, Révélation douce.
 * ✅ PERFORMANCE : S'affiche une seule fois par session.
 */
export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);
  
  // Génération des particules pour le rendu React
  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: Math.random() * 3 + 2,
      color: ['#3b82f6', '#fbbf24', '#ffffff'][Math.floor(Math.random() * 3)],
    }));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const sessionStarted = sessionStorage.getItem('ndara-session-started');
    if (!sessionStarted) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      sessionStorage.setItem('ndara-session-started', 'true');

      // 3 secondes d'animation cinématique
      const fadeTimer = setTimeout(() => {
        setIsFading(true);
      }, 3000);

      // Masquage total après le fondu (0.8s)
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = '';
      }, 3800);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
        document.body.style.overflow = '';
      };
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-800 ease-in-out",
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* 1. Background Gradient Pulse */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a202c_0%,_#000000_70%)] animate-[bg-pulse_4s_ease-in-out_infinite] pointer-events-none" />
      
      {/* 2. Cinematic Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* 3. Light Streaks */}
      <div className="streak streak-left absolute top-1/2 left-0 h-[2px] w-1/2 bg-gradient-to-r from-transparent via-blue-500 to-amber-500 -translate-y-1/2 opacity-0 shadow-[0_0_15px_#3b82f6] animate-[streak-in-left_1.2s_cubic-bezier(0.22,1,0.36,1)_forwards_0.2s]" />
      <div className="streak streak-right absolute top-1/2 right-0 h-[2px] w-1/2 bg-gradient-to-l from-transparent via-blue-500 to-amber-500 -translate-y-1/2 opacity-0 shadow-[0_0_15px_#3b82f6] animate-[streak-in-right_1.2s_cubic-bezier(0.22,1,0.36,1)_forwards_0.2s]" />

      {/* 4. Logo Container */}
      <div className="relative z-10 flex flex-col items-center animate-[logo-reveal_1.5s_cubic-bezier(0.16,1,0.3,1)_forwards_0.6s] opacity-0 scale-[0.8] blur-[10px]">
        <Image
          src="/logo.png"
          alt="Ndara Afrique"
          width={220}
          height={220}
          className="object-contain animate-[glow-pulse_2s_ease-in-out_infinite_alternate]"
          priority
        />
        
        <div className="mt-8 text-center animate-[text-rise_1s_ease-out_forwards_1.2s] opacity-0 translate-y-5">
            <h1 className="text-2xl md:text-4xl font-bold tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-amber-400 uppercase">
                Ndara Afrique
            </h1>
            <p className="text-[10px] md:text-xs text-gray-500 mt-3 font-light tracking-[0.5em] uppercase">
                The Future of Finance
            </p>
        </div>
      </div>

      {/* 5. Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full opacity-0"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.left}%`,
              bottom: `-10px`,
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              animation: `float-up ${p.duration}s ease-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes bg-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes streak-in-left {
          0% { transform: translateX(-100%) translateY(-50%) scaleX(0.5); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(0) translateY(-50%) scaleX(1); opacity: 0; }
        }
        @keyframes streak-in-right {
          0% { transform: translateX(100%) translateY(-50%) scaleX(0.5); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(0) translateY(-50%) scaleX(1); opacity: 0; }
        }
        @keyframes logo-reveal {
          to { opacity: 1; transform: scale(1); filter: blur(0px); }
        }
        @keyframes glow-pulse {
          from { filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5)); }
          to { filter: drop-shadow(0 0 25px rgba(251, 191, 36, 0.6)); }
        }
        @keyframes text-rise {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float-up {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translateY(-100px) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
