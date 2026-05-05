'use client';

import React, { useState, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface NdaraImageProps extends Omit<ImageProps, 'src'> {
  src?: string;
  fallbackSrc?: string;
  containerClassName?: string;
}

/**
 * @fileOverview Composant Image Intelligent pour Ndara Afrique.
 * ✅ RÉSILIENCE : Si la source principale (ex: Bunny) échoue, tente le fallback (ex: Firebase).
 * ✅ PLACEHOLDER : Affiche une icône élégante en cas d'échec total.
 */
export function NdaraImage({ 
    src, 
    fallbackSrc, 
    alt, 
    containerClassName,
    className,
    ...props 
}: NdaraImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);
  const [isError, setIsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setCurrentSrc(src);
    setIsError(false);
    setRetryCount(0);
  }, [src]);

  const handleError = () => {
    if (retryCount === 0 && fallbackSrc) {
        console.warn(`[NdaraImage] Échec chargement source principale. Tentative fallback...`);
        setCurrentSrc(fallbackSrc);
        setRetryCount(1);
    } else {
        console.error(`[NdaraImage] Échec total du chargement d'image.`);
        setIsError(true);
    }
  };

  if (!currentSrc || isError) {
    return (
        <div className={cn(
            "bg-slate-800 flex items-center justify-center border border-white/5",
            containerClassName || "w-full h-full rounded-2xl"
        )}>
            <ImageIcon className="text-slate-600 opacity-20" size={32} />
        </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
        <Image
            {...props}
            src={currentSrc}
            alt={alt || "Ndara Image"}
            className={cn("transition-opacity duration-500", className)}
            onError={handleError}
            unoptimized={currentSrc.includes('storage.googleapis.com')} // Firebase ne supporte pas toujours bien l'optimizer Next sans config spécifique
        />
    </div>
  );
}
