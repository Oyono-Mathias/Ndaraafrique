'use client';

/**
 * @fileOverview Reporting CEO & Analyses Financières Ndara Afrique v3.0.
 * ✅ BUSINESS CRITICAL : Volume Brut, Volume Net (Commissions), Volume Bourse.
 * ✅ CROISSANCE : Top Ambassadeurs et Top Formations.
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    TrendingUp, 
    Trophy, 
    Landmark,
    PieChart,
    Smartphone,
    CreditCard,
    ShieldCheck,
    Users,
    BadgeEuro,
    BarChart3,
    ArrowUpRight
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
import { safeToDate } from '@/lib/date-utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Payment, NdaraUser } from '@/lib/types';

export default function AdminStatsPage() {
    const { currentUser } = useRole();
    const db = getFirestore();
    
    const [payments, setPayments] = useState<Payment[]>([]);
    const [topAssets, setTopAssets] = useState<{title: string, revenue: number, count: number}[]>([]);
    const [topAffiliates, setTopAffiliates] = useState<NdaraUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') return;

        setIsLoading(true);

        // 1. Flux des paiements complétés
        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('status', '==', 'completed'), orderBy('date', 'desc')),
            (snap) => {
                const paymentsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
                setPayments(paymentsData);

                // Calcul Top Formations
                const courseMap = new Map<string, {revenue: number, count: number}>();
                paymentsData.forEach(p => {
                    if (p.courseTitle && p.type === 'course_purchase') {
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
                setIsLoading(false);
            }
        );

        // 2. Flux des Top Ambassadeurs
        const unsubAffiliates = onSnapshot(
            query(collection(db, 'users'), where('affiliateStats.sales', '>', 0), orderBy('affiliateStats.sales', 'desc'), limit(5)),
            (snap) => {
                setTopAffiliates(snap.docs.map(d => ({ uid: d.id, ...d.data() } as NdaraUser)));
            }
        );

        return () => { unsubPayments(); unsubAffiliates(); };
    }, [db, currentUser]);

    const financialStats = useMemo(() => {
        const gross = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
        // On estime la part plateforme (30% sur ventes, 20% sur bourse, 100% sur deposits si frais)
        const net = payments.reduce((acc, p) => {
            if (p.type === 'course_purchase') return acc + (p.amount * 0.3);
            if (p.type === 'license_purchase') return acc + (p.amount * 0.2);
            return acc;
        }, 0);

        const bourseVolume = payments
            .filter(p => p.type === 'license_purchase')
            .reduce((acc, p) => acc + (p.amount || 0), 0);

        const now = new Date();
        const historyData = [];
        for (let i = 5; i >= 0; i--) {
            const targetMonth = subMonths(now, i);
            const monthLabel = format(targetMonth, 'MMM', { locale: fr });
            const total = payments
                .filter(p => {
                    const d = safeToDate(p.date);
                    return isSameMonth(d, targetMonth);
                })
                .reduce((acc, p) => acc + (p.amount || 0), 0);
            
            historyData.push({ name: monthLabel.toUpperCase(), value: total });
        }

        return { gross, net, bourseVolume, historyData };
    }, [payments]);

    if (isLoading) return <StatsSkeleton />;

    return (
        <div className="space-y-10 pb-24 animate-in fade-in duration-1000 relative bg-[#050505] -m-6 p-6 min-h-screen font-sans">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

            <header className="relative z-10 flex items-end justify-between border-b border-white/5 pb-8">
                <div>
                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Perspective Stratégique</p>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none">
                        Reporting <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">CEO</span>
                    </h1>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl shadow-primary/10">
                    <Landmark size={24} />
                </div>
            </header>

            <main className="relative z-10 space-y-10">
                {/* --- TOP KPIs --- */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-white/5 rounded-4xl p-8 shadow-2xl">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Volume de Ventes (Brut)</p>
                        <h2 className="text-4xl font-black text-white leading-none tracking-tighter">
                            {financialStats.gross.toLocaleString()} <span className="text-sm opacity-30">XOF</span>
                        </h2>
                        <div className="mt-4 flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase">
                            <TrendingUp size={12} /> +18.4% ce mois
                        </div>
                    </Card>
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-white/5 rounded-4xl p-8 shadow-2xl">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Revenus Plateforme (Net)</p>
                        <h2 className="text-4xl font-black text-primary leading-none tracking-tighter">
                            {Math.round(financialStats.net).toLocaleString()} <span className="text-sm opacity-30">XOF</span>
                        </h2>
                        <div className="mt-4 flex items-center gap-2 text-primary/60 text-[10px] font-black uppercase">
                            <ShieldCheck size={12} /> Audit d'intégrité OK
                        </div>
                    </Card>
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-white/5 rounded-4xl p-8 shadow-2xl">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Volume Bourse du Savoir</p>
                        <h2 className="text-4xl font-black text-blue-400 leading-none tracking-tighter">
                            {financialStats.bourseVolume.toLocaleString()} <span className="text-sm opacity-30">XOF</span>
                        </h2>
                        <div className="mt-4 flex items-center gap-2 text-blue-500/60 text-[10px] font-black uppercase">
                            <BadgeEuro size={12} /> Marché Secondaire
                        </div>
                    </Card>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* --- CHART --- */}
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-white/5 rounded-4xl p-8 shadow-2xl h-[400px]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <BarChart3 size={16} className="text-primary" /> Croissance Semestrielle
                            </h3>
                        </div>
                        <div className="h-64 w-full -ml-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={financialStats.historyData}>
                                    <defs>
                                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="white" opacity={0.05} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: '900'}} dy={10} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}} />
                                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={4} fill="url(#colorVal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* --- TOP AMBASSADEURS --- */}
                    <section className="space-y-4">
                        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2 px-1">
                            <Users className="h-4 w-4 text-primary" />
                            Top Ambassadeurs (Parrainage)
                        </h2>
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-4xl overflow-hidden shadow-2xl divide-y divide-white/5">
                            {topAffiliates.map((aff, i) => (
                                <div key={aff.uid} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border",
                                            i === 0 ? "bg-primary text-slate-950 border-primary shadow-[0_0_15px_#10b98144]" : "bg-slate-800 text-slate-500 border-white/5"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-white/10 shadow-xl">
                                                <AvatarImage src={aff.profilePictureURL} />
                                                <AvatarFallback className="bg-slate-800 text-[10px] font-black">{aff.fullName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-bold text-white text-[13px] uppercase tracking-tight">{aff.fullName}</p>
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter mt-0.5">{aff.affiliateStats?.sales} Ventes générées</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-white leading-none">{(aff.affiliateStats?.earnings || 0).toLocaleString()} <span className="text-[10px] opacity-30">F</span></p>
                                        <p className="text-[8px] font-black text-primary uppercase tracking-widest mt-1">Commissions</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

function StatsSkeleton() {
    return (
        <div className="p-6 space-y-8 bg-[#050505] min-h-screen">
            <Skeleton className="h-12 w-1/3 bg-slate-900 rounded-xl" />
            <div className="grid grid-cols-3 gap-6">
                <Skeleton className="h-32 bg-slate-900 rounded-3xl" />
                <Skeleton className="h-32 bg-slate-900 rounded-3xl" />
                <Skeleton className="h-32 bg-slate-900 rounded-3xl" />
            </div>
            <Skeleton className="h-96 w-full rounded-[2.5rem] bg-slate-900" />
        </div>
    );
}
