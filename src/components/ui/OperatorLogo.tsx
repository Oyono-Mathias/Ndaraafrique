'use client';

import React from 'react';
import Image from 'next/image';
import { normalizeOperator } from '@/utils/normalizeOperator';
import { MOBILE_OPERATORS } from '@/constants/mobileOperators';
import { cn } from '@/lib/utils';
import { Smartphone } from 'lucide-react';

interface OperatorLogoProps {
  operatorName: string | undefined;
  className?: string;
  size?: number;
}

/**
 * @fileOverview Composant d'affichage intelligent du logo opérateur.
 * ✅ DESIGN : Parfaitement circulaire pour correspondre à l'UI Fintech.
 * ✅ FALLBACK : Affiche les initiales en majuscules si l'image est absente.
 */
export function OperatorLogo({ operatorName, className, size = 32 }: OperatorLogoProps) {
  const code = normalizeOperator(operatorName);
  const operator = MOBILE_OPERATORS[code];

  if (!operator) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={cn("rounded-full bg-slate-800 flex items-center justify-center text-slate-500 shadow-inner", className)}
      >
        <Smartphone size={size * 0.6} />
      </div>
    );
  }

  return (
    <div 
      style={{ width: size, height: size }}
      className={cn(
        "relative rounded-full overflow-hidden flex items-center justify-center shadow-md shrink-0",
        operator.color,
        className
      )}
    >
      <Image
        src={operator.logoUrl}
        alt={operator.name}
        fill
        className="object-contain z-10"
        sizes={`${size}px`}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
      
      {/* Fallback texte stylisé (Initiales en MAJUSCULES) */}
      <span className={cn(
        "font-black uppercase select-none absolute inset-0 flex items-center justify-center pointer-events-none",
        operator.textColor,
        size < 35 ? "text-[10px]" : "text-xs"
      )}>
        {operator.name.substring(0, 2).toUpperCase()}
      </span>
    </div>
  );
}
