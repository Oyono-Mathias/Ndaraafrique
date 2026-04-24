'use client';

import { useState, useEffect } from 'react';
import { getMeSombBalanceAction } from '@/actions/meSombActions';
import { useRole } from '@/context/RoleContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Carte de consultation du solde MeSomb pour le cockpit Admin.
 * ✅ DESIGN : Elite Fintech.
 */
export function MeSombBalanceCard() {
    const { currentUser } = useRole();
    const [balance, setBalance] = useState<number | null>(null);
    const [currency, setCurrency] = useState('XAF');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBalance = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await getMeSombBalanceAction(currentUser.uid);
            if (result.success) {
                setBalance(result.balance ?? 0);
                setCurrency(result.currency || 'XAF');
            } else {
                // On tronque si c'est du HTML d'erreur
                const msg = result.error?.includes('<!DOCTYPE') ? "Erreur serveur MeSomb (404/500)" : result.error;
                setError(msg || "Erreur de connexion.");
            }
        } catch (e: any) {
            setError("Erreur technique de communication.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [currentUser?.uid]);

    return (
        <Card className="bg-slate-900 border border-white/5 shadow-2xl rounded-3xl overflow-hidden relative group transition-all">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Solde MeSomb</p>
                            <h3 className="text-white font-black text-lg leading-none uppercase">Compte Marchand</h3>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={fetchBalance} 
                        disabled={isLoading}
                        className="h-8 w-8 rounded-full hover:bg-white/5 text-slate-500 hover:text-primary transition-colors"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                </div>

                <div className="min-h-[50px] flex flex-col justify-center">
                    {isLoading && (
                        <div className="flex items-center gap-2 text-slate-500 italic text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Synchronisation...</span>
                        </div>
                    )}

                    {!isLoading && error && (
                        <div className="flex items-start gap-2 text-red-400 bg-red-500/5 p-3 rounded-xl border border-red-500/20 animate-in fade-in zoom-in">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            <span className="text-[10px] font-bold uppercase leading-tight">{error}</span>
                        </div>
                    )}

                    {!isLoading && !error && balance !== null && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <p className="text-3xl font-black text-white tracking-tight">
                                {balance.toLocaleString('fr-FR')} 
                                <span className="text-sm font-bold text-slate-500 ml-2 uppercase">{currency}</span>
                            </p>
                            <div className="flex items-center gap-1.5 mt-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Moteur SDK v2.0.1</span>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
