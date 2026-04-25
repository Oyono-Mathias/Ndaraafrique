'use client';

import React from 'react';
import Image from 'next/image';
import { normalizeOperator } from '@/utils/normalizeOperator';
import { MOBILE_OPERATORS } from '@/constants/mobileOperators';
import { cn } from '@/lib/utils';
import { Smartphone } from 'lucide-react';

interface OperatorLogoProps {
  operatorName: string | undefined;
  logo?: string; // Nom du fichier dans /image/ (ex: mtn-momo.png)
  className?: string;
  size?: number;
}

/**
 * @fileOverview Affichage du logo opérateur basé sur le fichier réel.
 * ✅ SÉCURITÉ : Utilise le nom de fichier spécifié dans la config pays.
 * ✅ DESIGN : Aucun fond coloré forcé, respecte le visuel original du logo.
 */
export function OperatorLogo({ operatorName, logo, className, size = 32 }: OperatorLogoProps) {
  // 1. Si un logo spécifique est fourni dans la config (ex: orange-money.png)
  let finalSrc = logo ? (logo.startsWith('/') ? logo : `/image/${logo}`) : '';

  // 2. Sinon, on cherche dans les constantes basées sur le nom de l'opérateur
  if (!finalSrc) {
    const code = normalizeOperator(operatorName);
    const operator = MOBILE_OPERATORS[code];
    if (operator) {
      finalSrc = operator.logoUrl;
    }
  }

  if (!finalSrc) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={cn("rounded-full bg-slate-800 flex items-center justify-center text-slate-500 shrink-0", className)}
      >
        <Smartphone size={size * 0.5} />
      </div>
    );
  }

  return (
    <div 
      style={{ width: size, height: size }}
      className={cn(
        "relative rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/5",
        className
      )}
    >
      <Image
        src={finalSrc}
        alt={operatorName || "Payment Logo"}
        fill
        className="object-contain p-1"
        sizes={`${size}px`}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
    </div>
  );
}
