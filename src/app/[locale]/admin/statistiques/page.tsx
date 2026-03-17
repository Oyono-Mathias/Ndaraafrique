'use client';

/**
 * @fileOverview Dashboard Analytique Ndara Afrique - Version Elite.
 * ✅ DESIGN : Graphiques Fintech (Area & Bar) haute-fidélité.
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { Users, DollarSign, MousePointer2, TrendingUp, Zap, BarChart3, Clock } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { subDays, format, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, NdaraUser, TrackingEvent } from '@/lib/types';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip 
} from 'recharts';

export default function AdminStatsPage() {
    const [allUsers, setAllUsers] = useState<NdaraUser[]>([]);
    const [allPayments, setAllPayments] = useState<Payment[]>([]);
    const [allTracking, setAllTracking] = useState<TrackingEvent[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [hasMounted, setHasMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 7), to: new Date() });
    
    const db = getFirestore();

    useEffect(() => {
        setHasMounted(true);
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            setAllUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as NdaraUser)));
            setIsLoading(false);
        });

        const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('status', '==', 'Completed')), (snap) => {
            setAllPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
        });

        const unsubTracking = onSnapshot(query(collection(db, 'tracking_events'), limit(1000)), (snap) => {
            setAllTracking(snap.docs.map(doc => doc.data() as TrackingEvent));
        });

        return () => { unsubUsers(); unsubPayments(); unsubTracking(); };
    }, [db]);

    const stats = useMemo(() => {
        const from = dateRange?.from || subDays(new Date(), 7);
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
        const activeUsers = allUsers.filter(u => u.isOnline === true).length;

        const dailyRevenue: { [key: string]: number } = {};
        filteredPayments.forEach(p => {
            const date = (p.date as any)?.toDate?.() || new Date();
            const day = format(date, 'EEE', { locale: fr });
            dailyRevenue[day] = (dailyRevenue[day] || 0) + p.amount;
        });
        const revenueData = Object.keys(dailyRevenue).map(day => ({ name: day.toUpperCase(), value: dailyRevenue[day] }));

        const dailySignups: { [key: string]: number } = {};
        filteredUsers.forEach(u => {
            const date = (u.createdAt as any)?.toDate?.() || new Date();
            const day = format(date, 'EEE', { locale: fr });
            dailySignups[day] = (dailySignups[day] || 0) + 1;
        });
        const growthData = Object.keys(dailySignups).map(day => ({ name: day.toUpperCase(), value: dailySignups[day] }));

        return { totalRevenue, totalUsers: allUsers.length, activeUsers, revenueData, growthData };
    }, [allUsers, allPayments, allTracking, dateRange]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] pointer-events-none" />

            <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Analyse Stratégique</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Performances</h1>
                </div>
                <div className="bg-slate-900 border border-white/5 p-1 rounded-2xl shadow-2xl">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                <StatCard title="Revenus" value={`${(stats.totalRevenue/1000).toFixed(0)}K`} unit="XOF" icon={DollarSign} isLoading={isLoading} trendType="up" trend="+12%" />
                <StatCard title="Membres" value={stats.totalUsers.toString()} icon={Users} isLoading={isLoading} trendType="up" trend="+8%" sparklineColor="#3B82F6" />
                <StatCard title="Connectés" value={stats.activeUsers.toString()} icon={Zap} isLoading={isLoading} trendType="neutral" trend="Live" sparklineColor="#A855F7" />
                <StatCard title="Conversion" value="3.8%" icon={MousePointer2} isLoading={isLoading} trendType="down" trend="-1%" sparklineColor="#CC7722" />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                <Card className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border-white/5 rounded-4xl overflow-hidden shadow-2xl">
                    <CardHeader className="p-8">
                        <CardTitle className="text-lg font-black text-white uppercase tracking-tight">Évolution des Revenus</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 h-80">
                        {!hasMounted || isLoading ? <Skeleton className="h-full w-full rounded-2xl bg-slate-800" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.revenueData}>
                                    <defs>
                                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.4}/>
                                            <stop offset="100%" stopColor="#10B981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px'}} />
                                    <Area type="monotone" dataKey="value" stroke="#10B981" fillOpacity={1} fill="url(#revGrad)" strokeWidth={4} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 backdrop-blur-xl border-white/5 rounded-4xl overflow-hidden shadow-2xl">
                    <CardHeader className="p-8">
                        <CardTitle className="text-lg font-black text-white uppercase tracking-tight">Inscriptions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 h-80">
                        {!hasMounted || isLoading ? <Skeleton className="h-full w-full rounded-2xl bg-slate-800" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.growthData}>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                                    <YAxis hide />
                                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px'}} />
                                    <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
