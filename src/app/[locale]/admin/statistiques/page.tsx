'use client';

/**
 * @fileOverview Reporting CEO & Analyses Ndara Afrique.
 * ✅ DESIGN : Elite Fintech (#050505).
 * ✅ RÉEL : Business Critical KPIs (CA, Top Courses, Sources).
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    TrendingUp, 
    ArrowUpRight, 
    BrainCircuit, 
    Trophy, 
    Sparkles, 
    Lightbulb, 
    Landmark,
    Loader2,
    PieChart,
    Smartphone,
    CreditCard,
    ShieldCheck
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    Tooltip, 
    CartesianGrid 
} from 'recharts';
import { format, subMonths, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
// ❌ Supprimé pour le build : import type { Payment, Course } from '@/lib/types';

/**
 * ✅ RÉSOLU : Interfaces locales pour bypasser les restrictions de build
 */
interface Payment {
    id: string;
    amount: number;
    platformFee?: number;
    courseTitle?: string;
    provider?: string;
    date: any; // Timestamp Firestore ou string date
    metadata?: {
        type?: string;
    };
    status: string;
}

export default function AdminStatsPage() {
    const { currentUser } = useRole();
    const db = getFirestore();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [topAssets, setTopAssets] = useState<{title: string, revenue: number, count: number}[]>([]);
    const [sourceData, setSourceData] = useState<{provider: string, total: number}[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') return;

        setIsLoading(true);

        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('status', '==', 'Completed'), orderBy('date', 'desc')),
            (snap) => {
                const paymentsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
                setPayments(paymentsData);

                // Calcul Top Cours par Revenu
                const courseMap = new Map<string, {revenue: number, count: number}>();
                paymentsData.forEach(p => {
                    if (p.courseTitle) {
                        const current = courseMap.get(p.courseTitle) || { revenue: 0, count: 0 };
                        courseMap.set(p.courseTitle, {
                            revenue: current.revenue + (p.amount || 0),
                            count: current.count + 1
                        });
                    }
                });
                
                const sortedCourses = Array.from(courseMap.entries())
                    .map(([title, stats]) => ({ title, ...stats }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5);
                setTopAssets(sortedCourses);

                // Calcul Revenus par Source
                const providerMap = new Map<string, number>();
                paymentsData.forEach(p => {
                    const provider = p.provider || 'Inconnu';
                    providerMap.set(provider, (providerMap.get(provider) || 0) + (p.amount || 0));
                });
                setSourceData(Array.from(providerMap.entries()).map(([provider, total]) => ({ provider, total })));

                setIsLoading(false);
            }
        );

        return () => unsubPayments();
    }, [db, currentUser]);

    const stats = useMemo(() => {
        const gross = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
        const net = payments.reduce((acc, p) => acc + (p.platformFee || 0), 0);
        const marketVolume = payments
            .filter(p => p.metadata?.type === 'license_purchase')
            .reduce((acc, p) => acc + (p.amount || 0), 0);

        const now = new Date();
        const historyData = [];
        for (let i = 5; i >= 0; i--) {
            const targetMonth = subMonths(now, i);
            const monthLabel = format(targetMonth, 'MMM', { locale: fr });
            const total = payments
                .filter(p => {
                    const d = (p.date as any)?.toDate?.() || new Date(p.date as any);
                    return isSameMonth(d, targetMonth);
                })
                .reduce((acc, p) => acc + (p.amount || 0), 0);
            
            historyData.push({ name: monthLabel.toUpperCase(), value: total });
        }

        return { gross, net, marketVolume, historyData };
    }, [payments]);

    if (isLoading) {
        return (
            <div className="p-6 space-y-8 bg-[#050505] min-h-screen">
                <Skeleton className="h-12 w-1/3 bg-slate-900" />
                <Skeleton className="h-48 w-full rounded-[2.5rem] bg-slate-900" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-32 rounded-3xl bg-slate-900" />
                    <Skeleton className="h-32 rounded-3xl bg-slate-900" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-24 animate-in fade-in duration-1000 relative bg-[#050505] -m-6 p-6 min-h-screen font-sans">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-ndara-gold/5 rounded-full blur-[120px] pointer-events-none" />

            <header className="relative z-10 flex items-end justify-between border-b border-white/5 pb-8">
                <div>
                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Perspective Stratégique</p>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none">
                        Reporting <span className="text-transparent bg-clip-text bg-gradient-to-r from-ndara-gold to-ndara-goldLight">CEO</span>
                    </h1>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-ndara-gold/10 border border-ndara-gold/20 flex items-center justify-center text-ndara-gold shadow-2xl">
                    <Landmark size={24} />
                </div>
            </header>

            <main className="relative z-10 space-y-10">
                <section className="grid grid-cols-1 gap-4">
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-white/5 rounded-4xl overflow-hidden shadow-2xl group relative">
                        <CardContent className="p-8">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="h-4 w-4 text-ndara-gold" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Volume de Ventes Total (Brut)</span>
                            </div>
                            <h2 className="text-5xl md:text-6xl font-black text-white leading-none tracking-tighter">
                                {stats.gross.toLocaleString('fr-FR')} <span className="text-lg font-sans text-slate-600 font-bold ml-2">XOF</span>
                            </h2>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl shadow-xl">
                            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-3">Revenus Platforme Ndara</p>
                            <h3 className="text-3xl font-black text-ndara-gold">
                                {stats.net.toLocaleString('fr-FR')}
                            </h3>
                        </div>
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl shadow-xl">
                            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-3">Bourse des Licences</p>
                            <h3 className="text-3xl font-black text-blue-400">
                                {stats.marketVolume.toLocaleString('fr-FR')}
                            </h3>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
                            <BrainCircuit className="h-4 w-4 text-ndara-gold" />
                            Historique des Flux Financiers
                        </h2>
                        <Badge className="bg-ndara-gold/10 text-ndara-gold border-none font-black text-[8px] uppercase px-2 py-1 rounded-full animate-pulse">Temps Réel</Badge>
                    </div>

                    <Card className="bg-slate-900/40 backdrop-blur-xl border-white/5 rounded-4xl overflow-hidden shadow-2xl p-8">
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.historyData}>
                                    <defs>
                                        <linearGradient id="fluxGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3}/>
                                            <stop offset="100%" stopColor="#F59E0B" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px'}}
                                        itemStyle={{color: '#F59E0B', fontWeight: '900', fontSize: '12px'}}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#F59E0B" fillOpacity={1} fill="url(#fluxGrad)" strokeWidth={4} dot={{ r: 4, fill: '#050505', stroke: '#F59E0B', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* TOP COURSES */}
                    <section className="space-y-4">
                        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2 px-1">
                            <Trophy className="h-4 w-4 text-ndara-gold" />
                            Top Formations (Revenus)
                        </h2>
                        
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-4xl overflow-hidden shadow-2xl divide-y divide-white/5">
                            {topAssets.map((asset, i) => (
                                <div key={i} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border transition-all",
                                            i === 0 ? "bg-ndara-gold/20 text-ndara-gold border-ndara-gold/30 shadow-[0_0_15px_#f59e0b33]" : "bg-slate-800 text-slate-500 border-white/5"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-white text-[13px] uppercase truncate max-w-[180px] group-hover:text-ndara-gold transition-colors">{asset.title}</p>
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter mt-0.5">{asset.count} Ventes enregistrées</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-white leading-none">{asset.revenue.toLocaleString()} F</p>
                                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">Revenu Brut</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* REVENUE SOURCES */}
                    <section className="space-y-4">
                        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2 px-1">
                            <PieChart className="h-4 w-4 text-primary" />
                            Canaux de Paiement
                        </h2>
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-4xl p-8 shadow-2xl h-[360px] flex flex-col justify-center gap-6">
                            {sourceData.map((source, i) => {
                                const percentage = stats.gross > 0 ? Math.round((source.total / stats.gross) * 100) : 0;
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <div className="flex items-center gap-2">
                                                {source.provider.toLowerCase().includes('momo') || source.provider.toLowerCase().includes('orange') ? <Smartphone size={12}/> : <CreditCard size={12}/>}
                                                <span className="text-slate-300">{source.provider}</span>
                                            </div>
                                            <span className="text-white">{percentage}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                            <div 
                                                className="h-full bg-primary rounded-full shadow-[0_0_10px_#10b981]" 
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                            {sourceData.length === 0 && <p className="text-center text-xs text-slate-600 uppercase font-black">Aucune donnée source</p>}
                        </div>
                    </section>
                </div>

                <section className="space-y-4 pb-12">
                    <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2 px-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Garantie de Sécurité
                    </h2>
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-emerald-500/20 rounded-4xl overflow-hidden shadow-2xl relative group">
                        <CardContent className="p-8 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner shrink-0">
                                    <ShieldCheck size={24} />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <h3 className="font-black text-white text-base uppercase tracking-tight">Audit Financier Ndara</h3>
                                    <p className="text-slate-400 text-xs leading-relaxed font-medium italic">
                                        "Toutes les données affichées ici sont issues du registre immuable de la collection <span className="text-primary font-black">payments</span>. Elles sont synchronisées en temps réel pour garantir une transparence totale au CEO."
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    );
}
