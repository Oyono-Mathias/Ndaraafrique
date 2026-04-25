'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Smartphone } from 'lucide-react';
import { normalizeOperator } from '@/utils/normalizeOperator';
import { MOBILE_OPERATORS } from '@/constants/mobileOperators';

interface OperatorLogoProps {
  operatorName?: string;
  logo?: string; // Nom exact du fichier (ex: mtn.png)
  className?: string;
  size?: number;
}

/**
 * @fileOverview Affiche le logo officiel depuis public/image/.
 * ✅ DIRECT : Utilise le nom de fichier fourni.
 * ✅ PUR : Aucun style de fond ou de couleur imposé.
 */
export function OperatorLogo({ operatorName, logo, className, size = 32 }: OperatorLogoProps) {
  // 1. Détermination du chemin source
  let finalSrc = '';

  if (logo) {
    // Si c'est un nom de fichier, on pointe vers /image/
    finalSrc = logo.startsWith('/') ? logo : `/image/${logo}`;
  } else if (operatorName) {
    // Fallback sur le catalogue par défaut via le nom de l'opérateur
    const code = normalizeOperator(operatorName);
    const operator = MOBILE_OPERATORS[code];
    if (operator) {
      finalSrc = operator.logoUrl;
    }
  }

  // 2. Rendu
  if (!finalSrc) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={cn("rounded-lg bg-slate-800 flex items-center justify-center text-slate-600 shrink-0", className)}
      >
        <Smartphone size={size * 0.5} />
      </div>
    );
  }

  return (
    <div 
      style={{ width: size, height: size }}
      className={cn(
        "relative flex items-center justify-center shrink-0 overflow-hidden",
        className
      )}
    >
      <Image
        src={finalSrc}
        alt={operatorName || "Logo"}
        fill
        className="object-contain"
        sizes={`${size}px`}
        unoptimized // ✅ Crucial pour les logos locaux dans public/image
      />
    </div>
  );
}
