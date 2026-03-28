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
 */
export function OperatorLogo({ operatorName, className, size = 32 }: OperatorLogoProps) {
  const code = normalizeOperator(operatorName);
  const operator = MOBILE_OPERATORS[code];

  if (!operator) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={cn("rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shadow-inner", className)}
      >
        <Smartphone size={size * 0.6} />
      </div>
    );
  }

  return (
    <div 
      style={{ width: size, height: size }}
      className={cn(
        "relative rounded-lg overflow-hidden flex items-center justify-center shadow-md",
        operator.color,
        className
      )}
    >
      <Image
        src={operator.logoUrl}
        alt={operator.name}
        fill
        className="object-contain p-1.5"
        sizes={`${size}px`}
        // Fallback technique si l'image distante échoue
        onError={(e) => {
          (e.target as any).style.display = 'none';
        }}
      />
      {/* Fallback texte si l'image ne charge pas */}
      <span className={cn("font-black text-[10px] uppercase select-none", operator.textColor)}>
        {operator.name.substring(0, 2)}
      </span>
    </div>
  );
}
