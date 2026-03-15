'use client';

/**
 * @fileOverview Ndara Wallet - Espace de Gestion Financière.
 * ✅ DESIGN : Esthétique Fintech Neo-Banque (Neo-card, stat-pills, grain).
 * ✅ ACTIONS : Rechargement via MoMo et historique des flux.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Wallet, 
    ArrowUpRight, 
    History, 
    Smartphone, 
    CheckCircle2, 
    Plus, 
    ArrowLeft,
    TrendingUp,
    CreditCard,
    BadgeEuro,
    Landmark,
    ShieldCheck,
    Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Payment } from '@/lib/types';

export default function NdaraWalletPage() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const [transactions, setTransactions] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const q = query(
            collection(db, 'payments'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc'),
            limit(20)
        );

        const unsub = onSnapshot(q, (snap) => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
            setIsLoading(false);
        }, (err) => {
            console.error("Wallet history error:", err);
            setIsLoading(false);
        });

        return () => unsub();
    }, [currentUser?.uid, db]);

    if (isUserLoading) return <WalletSkeleton />;

    return (
        <div className="flex flex-col gap-8 pb-32 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
            <div className="grain-overlay opacity-[0.04]" />

            <header className="fixed top-0 w-full z-50 bg-slate-950/95 backdrop-blur-md safe-area-pt border-b border-white/5">
                <div className="px-6 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="font-black text-xl text-white uppercase tracking-tight">Mon Wallet</h1>
                    </div>
                    <BadgeEuro className="text-primary h-6 w-6" />
                </div>
            </header>

            <main className="flex-1 px-6 pt-32 space-y-8 animate-in fade-in duration-700">
                
                {/* --- ELITE NEO-CARD --- */}
                <div className="bg-gradient-to-br from-primary via-[#047857] to-[#065f46] rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-primary/20 group">
                    <div className="absolute -right-6 -top-6 h-40 w-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000" />
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.25em] mb-1">Solde Disponible</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-5xl font-black text-white leading-none">{(currentUser?.balance || 0).toLocaleString('fr-FR')}</h2>
                                    <span className="text-sm font-bold text-white/70 uppercase">XOF</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                                <Wallet size={24} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-200 text-[9px] font-bold uppercase mb-1 tracking-wider">Membre Ndara</p>
                                <p className="text-white text-sm font-black uppercase tracking-widest">{currentUser?.fullName?.split(' ')[0]}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center text-white/80">
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- QUICK ACTIONS --- */}
                <div className="grid grid-cols-2 gap-4">
                    <Button onClick={() => toast({ title: "Module de recharge", description: "Bientôt disponible via MoMo." })} className="h-16 rounded-[2rem] bg-white text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all border-none">
                        <Plus className="mr-2 h-4 w-4" /> Recharger
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/student/ambassadeur')} className="h-16 rounded-[2rem] border-white/5 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95">
                        <TrendingUp className="mr-2 h-4 w-4 text-primary" /> Affiliation
                    </Button>
                </div>

                {/* --- HISTORY --- */}
                <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-white text-[10px] uppercase tracking-widest flex items-center gap-2">
                            <History size={14} className="text-primary" />
                            Flux financiers
                        </h3>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">30 JOURS</span>
                    </div>

                    <div className="space-y-4">
                        {isLoading ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-800" />)
                        ) : transactions.length > 0 ? transactions.map(txn => {
                            const date = (txn.date as any)?.toDate?.() || new Date();
                            const isIncoming = txn.metadata?.type === 'wallet_topup' || txn.metadata?.type === 'commission';
                            
                            return (
                                <div key={txn.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-inner",
                                            isIncoming ? "bg-emerald-500/10 text-primary" : "bg-blue-500/10 text-blue-400"
                                        )}>
                                            {isIncoming ? <ArrowUpRight size={20} /> : <CreditCard size={20} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-white text-sm truncate uppercase tracking-tight">
                                                {txn.courseTitle || txn.metadata?.type || 'Transaction'}
                                            </p>
                                            <p className="text-slate-600 text-[9px] font-black uppercase tracking-tighter mt-0.5">
                                                {format(date, 'dd MMM à HH:mm', { locale: fr })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={cn(
                                            "font-black text-sm",
                                            isIncoming ? "text-primary" : "text-white"
                                        )}>
                                            {isIncoming ? '+' : '-'}{txn.amount.toLocaleString()} F
                                        </p>
                                        <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">{txn.provider}</p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-12 text-center opacity-20">
                                <Landmark size={40} className="mx-auto mb-3 text-slate-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aucun mouvement</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- SECURITY BANNER --- */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] p-6 flex items-start gap-4">
                    <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
                    <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight mb-1">Fonds Sécurisés</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">"Vos avoirs Ndara sont protégés par notre infrastructure bancaire certifiée et audités en temps réel."</p>
                    </div>
                </div>

            </main>
        </div>
    );
}

function WalletSkeleton() {
    return (
        <div className="p-6 space-y-8 pt-32 bg-[#0f172a] min-h-screen">
            <Skeleton className="h-56 w-full rounded-[2.5rem] bg-slate-900" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-16 rounded-[2rem] bg-slate-900" />
                <Skeleton className="h-16 rounded-[2rem] bg-slate-900" />
            </div>
            <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" />
        </div>
    );
}
