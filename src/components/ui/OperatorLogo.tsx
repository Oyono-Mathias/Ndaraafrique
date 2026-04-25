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
 * ✅ DYNAMIQUE : Priorité au fichier logo s'il est spécifié, sinon normalisation.
 */
export function OperatorLogo({ operatorName, logo, className, size = 32 }: OperatorLogoProps) {
  const [hasError, setHasError] = useState(false);

  // 1. Détermination de la source
  let finalSrc = '';
  
  // Si le logo passé est déjà un nom de fichier (contient un point d'extension)
  if (logo && (logo.includes('.png') || logo.includes('.jpg') || logo.includes('.svg'))) {
      finalSrc = logo.startsWith('/') ? logo : `/image/${logo}`;
  } else {
      // Sinon on normalise le nom pour trouver la clé correspondante dans notre dictionnaire
      const key = normalizeOperator(logo || operatorName);
      const operatorConfig = MOBILE_OPERATORS[key];
      if (operatorConfig) {
          finalSrc = operatorConfig.logoUrl;
      }
  }

  // 2. Rendu du Fallback (Logo Ndara) si l'image est absente ou brisée
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
        "relative flex items-center justify-center shrink-0 overflow-hidden rounded-xl bg-transparent",
        className
      )}
    >
      <img
        src={finalSrc}
        alt={operatorName || "Logo Opérateur"}
        className="w-full h-full object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
