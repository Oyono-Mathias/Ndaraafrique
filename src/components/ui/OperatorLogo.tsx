'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Smartphone } from 'lucide-react';
import { normalizeOperator } from '@/utils/normalizeOperator';
import { MOBILE_OPERATORS } from '@/constants/mobileOperators';

interface OperatorLogoProps {
  operatorName?: string;
  logo?: string; // Nom exact du fichier (ex: orange.png)
  className?: string;
  size?: number;
}

/**
 * @fileOverview Affiche le logo officiel depuis public/image/.
 * ✅ FIABLE : Utilise une balise img standard avec fallback automatique en cas d'erreur.
 * ✅ DIRECT : Pointe vers /image/nom-du-fichier.
 */
export function OperatorLogo({ operatorName, logo, className, size = 32 }: OperatorLogoProps) {
  const [hasError, setHasError] = useState(false);

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

  // 2. Rendu du Fallback (si pas de source ou si l'image est brisée)
  if (!finalSrc || hasError) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={cn("rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 border border-white/5", className)}
      >
        <Smartphone size={size * 0.5} />
      </div>
    );
  }

  // 3. Rendu de l'image (standard img pour éviter les soucis de cache/optimisation locale)
  return (
    <div 
      style={{ width: size, height: size }}
      className={cn(
        "relative flex items-center justify-center shrink-0 overflow-hidden",
        className
      )}
    >
      <img
        src={finalSrc}
        alt={operatorName || "Logo"}
        className="w-full h-full object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
