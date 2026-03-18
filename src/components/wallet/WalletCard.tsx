
'use client';

/**
 * @fileOverview Composant Fintech Premium pour le solde Ndara.
 * ✅ DESIGN : Indigo Fintech avec texture et puce holographique.
 */

import React from 'react';
import { Wallet, Wifi, CreditCard, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalletCardProps {
    balance: number;
    userName: string;
    onClick?: () => void;
    className?: string;
    variant?: 'indigo' | 'emerald';
}

export function WalletCard({ balance, userName, onClick, className, variant = 'indigo' }: WalletCardProps) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl group transition-all duration-700 border border-white/10",
                onClick && "active:scale-[0.98] cursor-pointer",
                variant === 'indigo' 
                    ? "bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900" 
                    : "bg-gradient-to-br from-[#10b981] via-[#047857] to-[#065f46]",
                className
            )}
        >
            {/* Ambient Lighting */}
            <div className="absolute -right-6 -top-6 h-40 w-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute -left-6 -bottom-6 h-32 w-32 bg-black/20 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.25em] mb-1">Solde Disponible</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-white font-black text-5xl tracking-tighter">
                                {balance.toLocaleString('fr-FR')}
                            </h2>
                            <span className="text-sm font-bold text-white/70 uppercase">XOF</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="w-12 h-10 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-lg border border-white/20 shadow-xl overflow-hidden relative mb-2">
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]" />
                        </div>
                        <Wifi className="text-white/40 h-6 w-6 ml-auto rotate-90" />
                    </div>
                </div>

                <div className="mt-auto flex items-end justify-between">
                    <div className="space-y-1">
                        <p className="text-white/40 text-[9px] font-bold uppercase mb-1 tracking-wider">Titulaire Ndara</p>
                        <p className="text-white font-black text-sm uppercase tracking-[0.1em]">{userName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                            <Landmark className="text-white/80 h-5 w-5" />
                        </div>
                        <CreditCard className="text-white/60 h-8 w-8 opacity-90" />
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
