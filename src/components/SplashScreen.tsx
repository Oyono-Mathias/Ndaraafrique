'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Splash Screen Cinématique Fintech Ndara Afrique.
 * ✅ DESIGN : Transformation du logo en "Token" circulaire pour supprimer le cadre carré.
 * ✅ EFFETS : Light Streaks, Particules et lueur émeraude.
 * ✅ SLOGAN : Corrigé pour refléter l'éducation (L'Excellence par le Savoir).
 */
export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);
  
  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: Math.random() * 3 + 2,
      color: ['#10b981', '#fbbf24', '#ffffff'][Math.floor(Math.random() * 3)],
    }));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const sessionStarted = sessionStorage.getItem('ndara-session-started');
    if (!sessionStarted) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      sessionStorage.setItem('ndara-session-started', 'true');

      const fadeTimer = setTimeout(() => {
        setIsFading(true);
      }, 3500);

      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = '';
      }, 4300);

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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#064e3b_0%,_#000000_75%)] animate-[bg-pulse_4s_ease-in-out_infinite] pointer-events-none" />
      
      {/* 2. Cinematic Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* 3. Light Streaks */}
      <div className="streak streak-left absolute top-1/2 left-0 h-[1px] w-1/2 bg-gradient-to-r from-transparent via-primary to-amber-500 -translate-y-1/2 opacity-0 shadow-[0_0_20px_#10b981] animate-[streak-in-left_1.5s_cubic-bezier(0.22,1,0.36,1)_forwards_0.2s]" />
      <div className="streak streak-right absolute top-1/2 right-0 h-[1px] w-1/2 bg-gradient-to-l from-transparent via-primary to-amber-500 -translate-y-1/2 opacity-0 shadow-[0_0_20px_#10b981] animate-[streak-in-right_1.5s_cubic-bezier(0.22,1,0.36,1)_forwards_0.2s]" />

      {/* 4. Logo "Fintech Token" Container */}
      <div className="relative z-10 flex flex-col items-center animate-[logo-reveal_1.8s_cubic-bezier(0.16,1,0.3,1)_forwards_0.6s] opacity-0 scale-[0.8] blur-[15px]">
        
        {/* Logo Wrapper (The Seal) */}
        <div className="relative w-48 h-48 md:w-60 md:h-60 rounded-full p-1 bg-gradient-to-tr from-primary/40 via-white/10 to-amber-500/40 shadow-[0_0_60px_rgba(16,185,129,0.2)] group">
            <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
            <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white/5 bg-slate-900 shadow-inner">
                <Image
                  src="https://image.qwenlm.ai/public_source/23617130-d98e-46af-b51f-e280cb15b998/183e44d40-cf51-49e9-8ac2-0d0e0a6b7559.png"
                  alt="Ndara Afrique"
                  fill
                  className="object-cover scale-110"
                  priority
                />
            </div>
            {/* Glow Aura */}
            <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl opacity-50 animate-pulse" />
        </div>
        
        <div className="mt-10 text-center animate-[text-rise_1.2s_ease-out_forwards_1.4s] opacity-0 translate-y-8">
            <h1 className="text-3xl md:text-5xl font-black tracking-[0.25em] text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                Ndara Afrique
            </h1>
            <p className="text-[10px] md:text-xs text-primary font-black tracking-[0.6em] uppercase mt-4 opacity-80">
                L'Excellence par le Savoir
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
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes streak-in-left {
          0% { transform: translateX(-100%) translateY(-50%) scaleX(0.2); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateX(0) translateY(-50%) scaleX(1.2); opacity: 0; }
        }
        @keyframes streak-in-right {
          0% { transform: translateX(100%) translateY(-50%) scaleX(0.2); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateX(0) translateY(-50%) scaleX(1.2); opacity: 0; }
        }
        @keyframes logo-reveal {
          to { opacity: 1; transform: scale(1); filter: blur(0px); }
        }
        @keyframes text-rise {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float-up {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          20% { opacity: 0.6; }
          100% { transform: translateY(-150px) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
