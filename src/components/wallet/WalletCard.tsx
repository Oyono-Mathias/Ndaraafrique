
'use client';

import React from 'react';
import { Wallet, Wifi, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalletCardProps {
    balance: number;
    userName: string;
    onClick?: () => void;
    className?: string;
    variant?: 'indigo' | 'emerald';
}

/**
 * @fileOverview Composant partagé pour l'affichage du solde (Style Fintech).
 */
export function WalletCard({ balance, userName, onClick, className, variant = 'indigo' }: WalletCardProps) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl group transition-all duration-500",
                onClick && "active:scale-[0.98] cursor-pointer",
                variant === 'indigo' ? "bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900" : "bg-gradient-to-br from-[#10b981] via-[#047857] to-[#065f46]",
                className
            )}
        >
            <div className="absolute -right-6 -top-6 h-40 w-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000" />
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
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
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Ndara Elite</p>
                        <Wifi className="text-white/40 h-8 w-8 mt-2 rotate-90" />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white/40 text-[9px] font-bold uppercase mb-1 tracking-wider">Titulaire du compte</p>
                        <p className="text-white font-black text-sm uppercase tracking-widest">{userName}</p>
                    </div>
                    <CreditCard className="text-white/60 h-8 w-8" />
                </div>
            </div>
        </div>
    );
}
