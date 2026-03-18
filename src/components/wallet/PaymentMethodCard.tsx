
'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface PaymentMethodCardProps {
    active: boolean;
    onClick: () => void;
    label: string;
    logo: string;
    className?: string;
}

/**
 * @fileOverview Composant partagé pour le choix d'un moyen de paiement.
 */
export function PaymentMethodCard({ active, onClick, label, logo, className }: PaymentMethodCardProps) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-[0.97] min-h-[110px] group shadow-sm",
                active 
                    ? "bg-slate-50 border-indigo-600 scale-105 shadow-lg shadow-indigo-100" 
                    : "bg-white border-slate-100 grayscale opacity-60 hover:border-indigo-200",
                className
            )}
        >
            <div className="relative h-12 w-full">
                {logo ? (
                    <Image src={logo} alt={label} fill className="object-contain transition-transform group-hover:scale-110" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-slate-300 text-xs">{label}</div>
                )}
            </div>
            <span className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                active ? "text-indigo-600" : "text-slate-400"
            )}>{label}</span>
        </button>
    );
}
