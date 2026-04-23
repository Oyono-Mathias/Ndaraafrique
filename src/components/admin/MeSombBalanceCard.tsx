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
 * ✅ DESIGN : Affichage précis des erreurs pour faciliter le debug.
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
                setError(result.error || "Erreur de connexion MeSomb.");
            }
        } catch (e: any) {
            setError(e.message || "Erreur technique fatale.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [currentUser?.uid]);

    return (
        <Card className="bg-white border-none shadow-md rounded-2xl overflow-hidden relative group transition-all hover:shadow-lg">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Solde MeSomb</p>
                            <h3 className="text-slate-900 font-black text-xl leading-none">Compte Marchand</h3>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={fetchBalance} 
                        disabled={isLoading}
                        className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                </div>

                <div className="min-h-[60px] flex flex-col justify-center">
                    {isLoading && (
                        <div className="flex items-center gap-2 text-slate-400 italic text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Interrogation MeSomb...</span>
                        </div>
                    )}

                    {!isLoading && error && (
                        <div className="flex items-start gap-2 text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 animate-in fade-in zoom-in">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            <span className="text-[10px] font-bold uppercase leading-tight">{error}</span>
                        </div>
                    )}

                    {!isLoading && !error && balance !== null && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <p className="text-3xl font-black text-slate-900 tracking-tight">
                                {balance.toLocaleString('fr-FR')} 
                                <span className="text-sm font-bold text-slate-400 ml-2 uppercase">{currency}</span>
                            </p>
                            <div className="flex items-center gap-1.5 mt-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Pipeline Connecté</span>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
