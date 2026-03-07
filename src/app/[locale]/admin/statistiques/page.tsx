
'use client';

/**
 * @fileOverview Dashboard Analytique Ndara Afrique - Version Optimisée.
 * ✅ PERFORMANCE : Rendu conditionnel après montage pour éviter les conflits SSR.
 * ✅ MÉMOÏSATION : Calculs de stats isolés pour réduire la charge CPU.
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { Users, DollarSign, MousePointer2, TrendingUp, Calendar, Zap } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { subDays, format, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, NdaraUser, TrackingEvent } from '@/lib/types';

// Importations standards pour éviter les erreurs de type avec dynamic()
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
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() });
    
    const db = getFirestore();

    useEffect(() => {
        setHasMounted(true);
        // Écouteurs Firestore optimisés
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

        return () => {
            unsubUsers();
            unsubPayments();
            unsubTracking();
        };
    }, [db]);

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
        
        const landingViews = allTracking.filter(t => 
            t.eventType === 'page_view' && 
            t.pageUrl === '/' &&
            isWithinInterval((t.timestamp as any)?.toDate?.() || new Date(0), { start: from, end: to })
        ).length;
        
        const convRate = landingViews > 0 ? Math.round((filteredUsers.length / landingViews) * 100) : 0;

        const dailyRevenue: { [key: string]: number } = {};
        filteredPayments.forEach(p => {
            const date = (p.date as any)?.toDate?.() || new Date();
            const day = format(date, 'dd MMM', { locale: fr });
            dailyRevenue[day] = (dailyRevenue[day] || 0) + p.amount;
        });
        const revenueData = Object.keys(dailyRevenue).sort().map(day => ({ name: day, value: dailyRevenue[day] }));

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
        <div className="space-y-8 animate-in fade-in duration-700 pb-20 bg-background min-h-screen">
            <header className="flex flex-col md:flex-row justify-between md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Analyse Stratégique</span>
                    </div>
                    <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">Performances</h1>
                </div>
                <div className="bg-card p-1.5 rounded-2xl border shadow-xl">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Revenus" value={`${stats.totalRevenue.toLocaleString('fr-FR')} XOF`} icon={DollarSign} isLoading={isLoading} />
                <StatCard title="Conversion" value={`${stats.convRate}%`} icon={MousePointer2} isLoading={isLoading} />
                <StatCard title="Membres" value={stats.totalUsers.toLocaleString('fr-FR')} icon={Users} isLoading={isLoading} />
                <StatCard title="Connectés" value={stats.activeUsers.toString()} icon={Zap} isLoading={isLoading} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="p-8 pb-0">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Trésorerie (XOF)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-10 h-80">
                        {!hasMounted || isLoading ? <Skeleton className="h-full w-full rounded-2xl" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.revenueData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'currentColor', fontSize: 10, fontWeight: 'bold', opacity: 0.5}} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px'}} />
                                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" strokeWidth={4} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="p-8 pb-0">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Acquisition Membres</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-10 h-80">
                        {!hasMounted || isLoading ? <Skeleton className="h-full w-full rounded-2xl" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.growthData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'currentColor', fontSize: 10, fontWeight: 'bold', opacity: 0.5}} />
                                    <YAxis hide />
                                    <Tooltip cursor={{fill: 'currentColor', opacity: 0.1}} contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px'}} />
                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
