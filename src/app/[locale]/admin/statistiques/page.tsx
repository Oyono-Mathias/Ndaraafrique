
'use client';

/**
 * @fileOverview Dashboard Analytique Ndara Afrique.
 * Visualisation des KPIs Business en TEMPS RÉEL INDÉPENDANT.
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { StatCard } from '@/components/dashboard/StatCard';
import { Users, DollarSign, MousePointer2, TrendingUp, Calendar, Zap } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { subDays, format, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, NdaraUser, TrackingEvent } from '@/lib/types';

export default function AdminStatsPage() {
    const [allUsers, setAllUsers] = useState<NdaraUser[]>([]);
    const [allPayments, setAllPayments] = useState<Payment[]>([]);
    const [allTracking, setAllTracking] = useState<TrackingEvent[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() });
    
    const db = getFirestore();

    // 1. ÉCOUTEURS TEMPS RÉEL INDÉPENDANTS (Anti-blocage)
    useEffect(() => {
        // Flux Utilisateurs
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            setAllUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as NdaraUser)));
            setIsLoading(false);
        });

        // Flux Paiements
        const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('status', '==', 'Completed')), (snap) => {
            setAllPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
        });

        // Flux Tracking (Limité aux 2000 derniers événements pour la perf)
        const unsubTracking = onSnapshot(query(collection(db, 'tracking_events'), limit(2000)), (snap) => {
            setAllTracking(snap.docs.map(doc => doc.data() as TrackingEvent));
        });

        return () => {
            unsubUsers();
            unsubPayments();
            unsubTracking();
        };
    }, [db]);

    // 2. CALCULS DYNAMIQUES BASÉS SUR LES DONNÉES REÇUES
    const stats = useMemo(() => {
        const from = dateRange?.from || subDays(new Date(), 30);
        const to = dateRange?.to || new Date();

        const filteredPayments = allPayments.filter(p => {
            const d = (p.date as any)?.toDate?.() || new Date(0);
            return isWithinInterval(d, { start: from, end: to });
        });

        const filteredUsers = allUsers.filter(u => {
            const d = (u.createdAt as any)?.toDate?.() || new Date(0);
            return isWithinInterval(d, { start: from, end: to });
        });

        const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
        
        // Calcul du taux de conversion (Vues Landing vs Inscriptions)
        const landingViews = allTracking.filter(t => 
            t.eventType === 'page_view' && 
            t.pageUrl === '/' &&
            isWithinInterval((t.timestamp as any)?.toDate?.() || new Date(0), { start: from, end: to })
        ).length;
        
        const convRate = landingViews > 0 ? Math.round((filteredUsers.length / landingViews) * 100) : 0;

        // Données graphiques Revenus
        const dailyRevenue: { [key: string]: number } = {};
        filteredPayments.forEach(p => {
            const date = (p.date as any)?.toDate?.() || new Date();
            const day = format(date, 'dd MMM', { locale: fr });
            dailyRevenue[day] = (dailyRevenue[day] || 0) + p.amount;
        });
        const revenueData = Object.keys(dailyRevenue).sort().map(day => ({ name: day, value: dailyRevenue[day] }));

        // Données graphiques Croissance
        const dailySignups: { [key: string]: number } = {};
        filteredUsers.forEach(u => {
            const date = (u.createdAt as any)?.toDate?.() || new Date();
            const day = format(date, 'dd MMM', { locale: fr });
            dailySignups[day] = (dailySignups[day] || 0) + 1;
        });
        const growthData = Object.keys(dailySignups).sort().map(day => ({ name: day, value: dailySignups[day] }));

        return {
            totalRevenue,
            totalUsers: allUsers.length,
            convRate,
            activeUsers: allUsers.filter(u => u.isOnline === true).length,
            revenueData,
            growthData
        };
    }, [allUsers, allPayments, allTracking, dateRange]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            <header className="flex flex-col md:flex-row justify-between md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Analyse Stratégique</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Indicateurs de Performance</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Données consolidées en temps réel.</p>
                </div>
                <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-xl">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Chiffre d'Affaires" 
                    value={`${stats.totalRevenue.toLocaleString('fr-FR')} XOF`} 
                    icon={DollarSign} 
                    isLoading={isLoading} 
                    accentColor="bg-slate-900 border-slate-800"
                    description="Période sélectionnée"
                />
                <StatCard 
                    title="Taux de Conversion" 
                    value={`${stats.convRate}%`} 
                    icon={MousePointer2} 
                    isLoading={isLoading} 
                    accentColor="bg-slate-900 border-slate-800 border-l-primary border-l-4"
                    description="Visiteurs -> Membres"
                />
                <StatCard 
                    title="Base Utilisateurs" 
                    value={stats.totalUsers.toLocaleString('fr-FR')} 
                    icon={Users} 
                    isLoading={isLoading} 
                    accentColor="bg-slate-900 border-slate-800"
                    description="Membres totaux"
                />
                <StatCard 
                    title="Utilisateurs Actifs" 
                    value={stats.activeUsers.toString()} 
                    icon={Zap} 
                    isLoading={isLoading} 
                    accentColor="bg-slate-900 border-slate-800"
                    description="Actuellement en ligne"
                />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="p-8 pb-0">
                        <div className="flex items-center gap-2 text-primary">
                            <DollarSign className="h-4 w-4" />
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Flux de Trésorerie (XOF)</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-10 h-80">
                        {isLoading ? <Skeleton className="h-full w-full bg-slate-800/50 rounded-2xl" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.revenueData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px'}} 
                                        itemStyle={{color: '#fff', fontWeight: 'bold'}}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" strokeWidth={4} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="p-8 pb-0">
                        <div className="flex items-center gap-2 text-emerald-500">
                            <Users className="h-4 w-4" />
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Rythme d'Acquisition (Membres)</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-10 h-80">
                        {isLoading ? <Skeleton className="h-full w-full bg-slate-800/50 rounded-2xl" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.growthData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                                    <YAxis hide />
                                    <Tooltip 
                                        cursor={{fill: '#1e293b', opacity: 0.4}} 
                                        contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px'}}
                                        itemStyle={{color: '#10b981', fontWeight: 'bold'}}
                                    />
                                    <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-xl">
                    <Calendar className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    <b>Conseil CEO :</b> Si vous voyez peu de membres, utilisez l'outil de synchronisation dans <b>Configuration &gt; Outils</b> pour importer tous les comptes Firebase Auth vers Firestore.
                </p>
            </div>
        </div>
    );
}
