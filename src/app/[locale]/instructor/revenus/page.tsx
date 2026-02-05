
'use client';

/**
 * @fileOverview Gestion financière Formateur Android-First.
 * Intègre des graphiques Recharts pour une vision professionnelle des gains.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Wallet, DollarSign, TrendingUp, ArrowUpRight, History, Clock, CheckCircle2, XCircle, BarChart3 } from 'lucide-react';
import { requestPayout } from '@/actions/payoutActions';
import { useToast } from '@/hooks/use-toast';
import type { Payment, Payout } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function InstructorRevenueAndroid() {
    const { currentUser: instructor, isUserLoading } = useRole();
    const db = getFirestore();
    const { toast } = useToast();

    const [payments, setPayments] = useState<Payment[]>([]);
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!instructor?.uid) return;

        setIsLoading(true);
        const instructorId = instructor.uid;

        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('instructorId', '==', instructorId), where('status', '==', 'Completed')),
            (snap) => {
                setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
            }
        );

        const unsubPayouts = onSnapshot(
            query(collection(db, 'payouts'), where('instructorId', '==', instructorId)),
            (snap) => {
                setPayouts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payout)).sort((a, b) => (b.date as any)?.toDate() - (a.date as any)?.toDate()));
                setIsLoading(false);
            }
        );

        return () => {
            unsubPayments();
            unsubPayouts();
        };
    }, [instructor?.uid, db]);

    const stats = useMemo(() => {
        const totalEarned = payments.reduce((acc, p) => acc + p.amount, 0);
        const totalWithdrawn = payouts
            .filter(p => p.status === 'valide' || p.status === 'en_attente')
            .reduce((acc, p) => acc + p.amount, 0);
        
        // Données pour le graphique (groupées par mois)
        const chartMap = new Map();
        payments.forEach(p => {
            const date = (p.date as any)?.toDate() || new Date();
            const key = format(date, 'MMM', { locale: fr });
            chartMap.set(key, (chartMap.get(key) || 0) + p.amount);
        });

        const chartData = Array.from(chartMap.entries()).map(([name, amount]) => ({ name, amount }));

        return {
            totalEarned,
            balance: totalEarned - totalWithdrawn,
            chartData
        };
    }, [payments, payouts]);

    const handlePayout = async () => {
        if (stats.balance <= 5000) {
            toast({ variant: 'destructive', title: "Seuil non atteint", description: "Le montant minimum pour un retrait est de 5 000 XOF." });
            return;
        }

        setIsSubmitting(true);
        const result = await requestPayout({ instructorId: instructor!.uid, amount: stats.balance });
        
        if (result.success) {
            toast({ title: "Demande envoyée !", description: "Votre retrait sera traité sous 48h." });
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsSubmitting(false);
    };

    return (
        <div className="flex flex-col gap-8 p-4 pb-24 max-w-5xl mx-auto">
            <header className="pt-2">
                <h1 className="text-2xl font-black text-white">Gestion Financière</h1>
                <p className="text-slate-400 text-sm mt-1">Pilotez vos revenus et vos retraits.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* --- SOLDE & RETRAIT --- */}
                <section className="md:col-span-1 bg-primary border border-primary/20 rounded-3xl p-6 relative overflow-hidden shadow-2xl shadow-primary/20">
                    <Wallet className="absolute -right-4 -bottom-4 h-24 w-24 text-white opacity-10" />
                    <p className="text-[10px] uppercase font-black text-white/70 tracking-widest mb-1">Solde actuel</p>
                    <div className="flex items-baseline gap-2 text-white">
                        <h2 className="text-4xl font-black">{isLoading ? "..." : stats.balance.toLocaleString('fr-FR')}</h2>
                        <span className="text-sm font-bold opacity-70">XOF</span>
                    </div>
                    
                    <Button 
                        onClick={handlePayout}
                        disabled={isSubmitting || isLoading || stats.balance < 5000}
                        className="w-full h-12 mt-8 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white text-primary hover:bg-slate-100 transition-all active:scale-95"
                    >
                        {isSubmitting ? "En cours..." : "Retirer mes fonds"}
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-[9px] text-white/50 text-center mt-3 font-bold uppercase tracking-tighter">Seuil de retrait : 5 000 XOF</p>
                </section>

                {/* --- GRAPHIQUE --- */}
                <Card className="md:col-span-2 bg-slate-900 border-slate-800 rounded-3xl">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-primary">
                            <TrendingUp className="h-4 w-4" />
                            <CardTitle className="text-xs font-black uppercase tracking-widest">Évolution des gains</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="h-48 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.chartData.length > 0 ? stats.chartData : [{name: 'Jan', amount: 0}]}>
                                <defs>
                                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorAmt)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* --- HISTORIQUE DES RETRAITS --- */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Journal des opérations
                    </h3>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-3xl bg-slate-900" />)}
                    </div>
                ) : payouts.length > 0 ? (
                    <div className="grid gap-3">
                        {payouts.map(payout => (
                            <PayoutItem key={payout.id} payout={payout} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-slate-900/30 rounded-[2rem] border-2 border-dashed border-slate-800/50">
                        <DollarSign className="h-10 w-10 mx-auto text-slate-800 mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Aucune transaction enregistrée</p>
                    </div>
                )}
            </section>
        </div>
    );
}

function PayoutItem({ payout }: { payout: Payout }) {
    const statusIcon = payout.status === 'valide' ? <CheckCircle2 className="h-4 w-4" /> : payout.status === 'rejete' ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />;
    const statusText = payout.status === 'valide' ? 'Confirmé' : payout.status === 'rejete' ? 'Annulé' : 'Traitement';
    const statusClass = payout.status === 'valide' ? 'text-emerald-500 bg-emerald-500/10' : payout.status === 'rejete' ? 'text-red-500 bg-red-500/10' : 'text-amber-500 bg-amber-500/10';

    return (
        <Card className="bg-slate-900 border-slate-800 overflow-hidden rounded-2xl active:scale-[0.98] transition-all">
            <CardContent className="p-5 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-lg font-black text-white">{payout.amount.toLocaleString('fr-FR')}</p>
                        <span className="text-[10px] font-bold text-slate-500">XOF</span>
                    </div>
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-tighter mt-1">
                        Via {payout.method} • {payout.date ? format((payout.date as any).toDate(), "d MMM yyyy", { locale: fr }) : ""}
                    </p>
                </div>
                <div className={cn("flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-full", statusClass)}>
                    {statusIcon}
                    {statusText}
                </div>
            </CardContent>
        </Card>
    );
}
