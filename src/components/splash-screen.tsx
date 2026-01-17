
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // This logic now only runs on the client, after the initial render.
    const sessionStarted = sessionStorage.getItem('ndara-session-started');
    if (!sessionStarted) {
      setIsVisible(true);
      sessionStorage.setItem('ndara-session-started', 'true');

      const fadeTimer = setTimeout(() => {
        setIsFading(true);
      }, 2500); // Start fading out after 2.5s

      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 3000); // Completely hide after 3s (0.5s fade duration)

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    } else {
        // If the session has already started, ensure the splash screen is not visible.
        setIsVisible(false);
    }
  }, []); // The empty dependency array is crucial here.

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f172a] transition-opacity duration-500 ease-out",
        isFading ? "opacity-0" : "opacity-100"
      )}
    >
      <div className="relative overflow-hidden">
        <Image
          src="/icon.svg"
          alt="Ndara Afrique Logo"
          width={150}
          height={150}
          className="animate-[logoPulse_2.5s_ease-in-out_infinite]"
          priority
        />
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[logoSheen_2.5s_ease-in-out_infinite] mix-blend-soft-light"></div>
      </div>
    </div>
  );
}
