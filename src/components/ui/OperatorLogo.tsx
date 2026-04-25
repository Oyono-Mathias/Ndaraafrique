'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { normalizeOperator } from '@/utils/normalizeOperator';
import { MOBILE_OPERATORS } from '@/constants/mobileOperators';

interface OperatorLogoProps {
  operatorName?: string;
  logo?: string; // Nom exact du fichier
  className?: string;
  size?: number;
}

/**
 * @fileOverview Affiche le logo officiel de l'opérateur.
 * Utilise la normalisation pour garantir l'affichage même avec des noms de providers variés.
 */
export function OperatorLogo({ operatorName, logo, className, size = 32 }: OperatorLogoProps) {
  const [hasError, setHasError] = useState(false);

  // 1. Détermination de la source de l'image
  let finalSrc = '';

  if (logo) {
    // Si un nom de fichier spécifique est fourni (via config pays)
    finalSrc = logo.startsWith('/') ? logo : `/image/${logo}`;
  } else {
    // Sinon, normalisation du nom de l'opérateur/provider
    const key = normalizeOperator(operatorName);
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
        className={cn("rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-white/5 p-1", className)}
      >
        <img
          src="/logo.png"
          alt="Ndara"
          className="w-full h-full object-contain opacity-50"
        />
      </div>
    );
  }

  return (
    <div 
      style={{ width: size, height: size }}
      className={cn(
        "relative flex items-center justify-center shrink-0 overflow-hidden rounded-md",
        className
      )}
    >
      <img
        src={finalSrc}
        alt={operatorName || "Opérateur"}
        className="w-full h-full object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
