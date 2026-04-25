'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { normalizeOperator } from '@/utils/normalizeOperator';
import { MOBILE_OPERATORS } from '@/constants/mobileOperators';

interface OperatorLogoProps {
  operatorName?: string;
  logo?: string; 
  className?: string;
  size?: number;
}

/**
 * @fileOverview Affiche le logo officiel de l'opérateur.
 * ✅ ROBUSTESSE : Utilise une balise img standard pour les ressources locales public/image/.
 */
export function OperatorLogo({ operatorName, logo, className, size = 32 }: OperatorLogoProps) {
  const [hasError, setHasError] = useState(false);

  // 1. Normalisation de la clé (mtn, orange, wave, etc.)
  const key = normalizeOperator(logo || operatorName);
  
  // 2. Détermination de la source
  let finalSrc = '';
  
  if (logo && logo.includes('.')) {
      // Si on a déjà un nom de fichier complet (ex: mtn.png)
      finalSrc = logo.startsWith('/') ? logo : `/image/${logo}`;
  } else {
      // Sinon on utilise le mapping standard basé sur la clé normalisée
      const operatorConfig = MOBILE_OPERATORS[key];
      if (operatorConfig) {
          finalSrc = operatorConfig.logoUrl;
      }
  }

  // 3. Rendu du Fallback (Logo Ndara) si l'image est absente ou brisée
  if (!finalSrc || hasError) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={cn("rounded-xl bg-slate-900 flex items-center justify-center shrink-0 border border-white/5 p-1.5 shadow-inner", className)}
      >
        <img
          src="/logo.png"
          alt="Ndara"
          className="w-full h-full object-contain opacity-40 grayscale"
        />
      </div>
    );
  }

  return (
    <div 
      style={{ width: size, height: size }}
      className={cn(
        "relative flex items-center justify-center shrink-0 overflow-hidden rounded-xl bg-white/5",
        className
      )}
    >
      <img
        src={finalSrc}
        alt={operatorName || key}
        className="w-full h-full object-contain p-0.5"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
