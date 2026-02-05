'use client';

/**
 * @fileOverview Gestion financière Formateur Android-First.
 * Interface de suivi des gains, historique Moneroo et demandes de retrait.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Wallet, DollarSign, TrendingUp, ArrowUpRight, History, Clock, CheckCircle2, XCircle, BarChart3, Landmark } from 'lucide-react';
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

        // Écouter les paiements réussis
        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('instructorId', '==', instructorId), where('status', '==', 'Completed')),
            (snap) => {
                setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
            }
        );

        // Écouter les demandes de retrait
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
        // On déduit les retraits validés ou en attente
        const totalWithdrawn = payouts
            .filter(p => p.status === 'valide' || p.status === 'en_attente')
            .reduce((acc, p) => acc + p.amount, 0);
        
        const balance = totalEarned - totalWithdrawn;

        // Préparer les données du graphique par mois
        const chartMap = new Map();
        payments.forEach(p => {
            const date = (p.date as any)?.toDate() || new Date();
            const key = format(date, 'MMM', { locale: fr });
            chartMap.set(key, (chartMap.get(key) || 0) + p.amount);
        });

        const chartData = Array.from(chartMap.entries()).map(([name, amount]) => ({ name, amount }));

        return {
            totalEarned,
            balance: Math.max(0, balance),
            chartData: chartData.length > 0 ? chartData : [{ name: format(new Date(), 'MMM', { locale: fr }), amount: 0 }]
        };
    }, [payments, payouts]);

    const handlePayout = async () => {
        if (stats.balance < 5000) {
            toast({ variant: 'destructive', title: "Seuil insuffisant", description: "Le montant minimum pour un retrait est de 5 000 XOF." });
            return;
        }

        setIsSubmitting(true);
        const result = await requestPayout({ instructorId: instructor!.uid, amount: stats.balance });
        
        if (result.success) {
            toast({ title: "Demande envoyée !", description: "Votre retrait sera traité sous 48h par notre équipe finance." });
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsSubmitting(false);
    };

    if (isUserLoading) return <div className="p-6"><Skeleton className="h-64 w-full rounded-3xl bg-slate-900" /></div>;

    return (
        <div className="flex flex-col gap-8 p-4 max-w-6xl mx-auto pb-24 animate-in fade-in duration-700">
            <header className="space-y-1">
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Espace Financier</h1>
                <p className="text-slate-500 text-sm font-medium">Suivez vos revenus et gérez vos demandes de retrait.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* --- CARTE SOLDE (ACTION) --- */}
                <section className="lg:col-span-1 bg-primary p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-primary/20 flex flex-col justify-between">
                    <div className="absolute -right-6 -top-6 h-32 w-32 bg-white/10 rounded-full blur-3xl" />
                    <Landmark className="absolute -right-4 -bottom-4 h-24 w-24 text-black/10" />
                    
                    <div className="relative z-10 space-y-1">
                        <p className="text-[10px] font-black uppercase text-white/60 tracking-[0.2em]">Solde Retirable</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-5xl font-black text-white">{isLoading ? "..." : stats.balance.toLocaleString('fr-FR')}</h2>
                            <span className="text-xs font-bold text-white/70 uppercase">XOF</span>
                        </div>
                    </div>
                    
                    <div className="relative z-10 pt-10">
                        <Button 
                            onClick={handlePayout}
                            disabled={isSubmitting || isLoading || stats.balance < 5000}
                            className="w-full h-14 rounded-2xl bg-white text-primary hover:bg-slate-100 font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                        >
                            {isSubmitting ? "Envoi..." : "Demander un retrait"}
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                        <p className="text-[9px] text-white/50 text-center mt-4 font-bold uppercase tracking-tighter">
                            Retrait via Mobile Money (MTN, Orange, Wave)
                        </p>
                    </div>
                </section>

                {/* --- GRAPHIQUE ÉVOLUTION --- */}
                <Card className="lg:col-span-2 bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                    <CardHeader className="pb-0 pt-8 px-8">
                        <div className="flex items-center gap-2 text-primary">
                            <TrendingUp className="h-4 w-4" />
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Performance Mensuelle</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="h-56 p-4 pt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.chartData}>
                                <defs>
                                    <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    formatter={(val: number) => [`${val.toLocaleString('fr-FR')} XOF`, 'Gains']}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="amount" 
                                    stroke="hsl(var(--primary))" 
                                    fillOpacity={1} 
                                    fill="url(#colorPrimary)" 
                                    strokeWidth={4} 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* --- HISTORIQUE DES TRANSACTIONS --- */}
            <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Journal des activités financières
                </h3>

                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-3xl bg-slate-900" />)}
                    </div>
                ) : payouts.length > 0 || payments.length > 0 ? (
                    <div className="grid gap-3">
                        {payouts.map(payout => <PayoutItem key={payout.id} payout={payout} />)}
                        {payments.slice(0, 10).map(payment => <PaymentItem key={payment.id} payment={payment} />)}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-800/50">
                        <DollarSign className="h-12 w-12 mx-auto text-slate-800 mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-600">Aucun flux financier détecté</p>
                    </div>
                )}
            </section>
        </div>
    );
}

function PayoutItem({ payout }: { payout: Payout }) {
    const isSuccess = payout.status === 'valide';
    const isPending = payout.status === 'en_attente';
    
    return (
        <Card className="bg-slate-900 border-slate-800 rounded-2xl active:scale-[0.98] transition-all">
            <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center",
                        isSuccess ? "bg-emerald-500/10 text-emerald-500" : isPending ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                    )}>
                        <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-bold text-white text-sm">Demande de retrait</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5">
                            {payout.date ? format((payout.date as any).toDate(), "d MMM yyyy à HH:mm", { locale: fr }) : ""}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-white">-{payout.amount.toLocaleString('fr-FR')}</p>
                    <Badge className={cn(
                        "text-[8px] font-black uppercase border-none px-2",
                        isSuccess ? "bg-emerald-500/10 text-emerald-500" : isPending ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                    )}>
                        {payout.status === 'valide' ? 'Transféré' : payout.status === 'en_attente' ? 'En cours' : 'Rejeté'}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}

function PaymentItem({ payment }: { payment: Payment }) {
    return (
        <Card className="bg-slate-900/40 border-slate-800/50 rounded-2xl">
            <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{payment.courseTitle || 'Vente formation'}</p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter mt-0.5">
                            Vente directe • {payment.date ? format((payment.date as any).toDate(), "d MMM yyyy", { locale: fr }) : ""}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-emerald-500">+{payment.amount.toLocaleString('fr-FR')}</p>
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Commission déduite</p>
                </div>
            </CardContent>
        </Card>
    );
}
