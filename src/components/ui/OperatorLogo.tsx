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
 * Utilise next/image pour les logos locaux avec un fallback textuel si l'image échoue.
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
        "relative rounded-lg overflow-hidden flex items-center justify-center shadow-md shrink-0",
        operator.color,
        className
      )}
    >
      {/* 
          next/image pour les logos locaux. 
          Note: Les fichiers doivent être présents dans /public/images/operators/
      */}
      <Image
        src={operator.logoUrl}
        alt={operator.name}
        fill
        className="object-contain p-1.5 z-10"
        sizes={`${size}px`}
        // Fallback technique si le fichier local est manquant
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
      
      {/* Fallback texte stylisé toujours présent en arrière-plan */}
      <span className={cn(
        "font-black uppercase select-none absolute inset-0 flex items-center justify-center pointer-events-none",
        operator.textColor,
        size < 30 ? "text-[7px]" : "text-[10px]"
      )}>
        {operator.name.substring(0, 2)}
      </span>
    </div>
  );
}
