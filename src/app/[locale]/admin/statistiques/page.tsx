'use client';

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { StatCard } from '@/components/dashboard/StatCard';
import { Users, BookOpen, DollarSign, Briefcase, TrendingUp, MousePointer2 } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { subDays, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, NdaraUser, Course, Enrollment, TrackingEvent } from '@/lib/types';
import { EmptyState } from '@/components/dashboard/EmptyState';

const COLORS = ["#10b981", "#3b82f6", "#f97316", "#ec4899", "#8b5cf6", "#f59e0b"];

interface ChartData {
    name: string;
    value: number;
}

export default function AdminStatsPage() {
    const [stats, setStats] = useState({ totalRevenue: 0, totalUsers: 0, convRate: 0, activeUsers: 0 });
    const [revenueData, setRevenueData] = useState<ChartData[]>([]);
    const [userGrowthData, setUserGrowthData] = useState<ChartData[]>([]);
    const [conversionData, setConversionData] = useState<ChartData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() });
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const db = getFirestore();

            const from = dateRange?.from || subDays(new Date(), 30);
            const to = dateRange?.to || new Date();

            const [usersSnap, paymentsSnap, enrollmentsSnap, trackingSnap] = await Promise.all([
                getDocs(collection(db, 'users')),
                getDocs(query(collection(db, 'payments'), where('status', '==', 'Completed'))),
                getDocs(collection(db, 'enrollments')),
                getDocs(query(collection(db, 'tracking_events'), limit(1000)))
            ]);

            const allUsers = usersSnap.docs.map(doc => doc.data() as NdaraUser);
            const allPayments = paymentsSnap.docs.map(doc => doc.data() as Payment);
            const allTracking = trackingSnap.docs.map(doc => doc.data() as TrackingEvent);

            const filteredPayments = allPayments.filter(p => {
                const d = (p.date as Timestamp).toDate();
                return isWithinInterval(d, { start: from, end: to });
            });

            // 1. Calcul des KPIs Business
            const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
            const visitors = allTracking.filter(t => t.eventType === 'page_view' && t.pageUrl === '/').length;
            const signups = allUsers.filter(u => {
                const d = (u.createdAt as Timestamp).toDate();
                return isWithinInterval(d, { start: from, end: to });
            }).length;
            
            const convRate = visitors > 0 ? Math.round((signups / visitors) * 100) : 0;

            setStats({
                totalRevenue,
                totalUsers: allUsers.length,
                convRate,
                activeUsers: allUsers.filter(u => u.isOnline).length
            });

            // 2. Revenus (Groupement par jour pour plus de précision sur 30 jours)
            const dailyRevenue: { [key: string]: number } = {};
            filteredPayments.forEach(p => {
                const day = format((p.date as Timestamp).toDate(), 'dd MMM', { locale: fr });
                dailyRevenue[day] = (dailyRevenue[day] || 0) + p.amount;
            });
            setRevenueData(Object.keys(dailyRevenue).map(day => ({ name: day, value: dailyRevenue[day] })));

            // 3. Croissance Utilisateurs
            const dailySignups: { [key: string]: number } = {};
            allUsers.forEach(u => {
                const d = (u.createdAt as Timestamp).toDate();
                if (isWithinInterval(d, { start: from, end: to })) {
                    const day = format(d, 'dd MMM', { locale: fr });
                    dailySignups[day] = (dailySignups[day] || 0) + 1;
                }
            });
            setUserGrowthData(Object.keys(dailySignups).map(day => ({ name: day, value: dailySignups[day] })));

            setIsLoading(false);
        };
        fetchData();
    }, [dateRange]);
    
    const chartConfig = { value: { label: 'Valeur', color: 'hsl(var(--primary))' } };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Analyse des KPIs</h1>
                    <p className="text-slate-500 text-sm font-medium">Pilotage de la croissance et de la conversion Ndara.</p>
                </div>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Revenus Période" value={`${stats.totalRevenue.toLocaleString('fr-FR')} XOF`} icon={DollarSign} isLoading={isLoading} />
                <StatCard title="Taux de Conversion" value={`${stats.convRate}%`} icon={MousePointer2} isLoading={isLoading} description="Visiteurs -> Inscrits" />
                <StatCard title="Total Membres" value={stats.totalUsers.toLocaleString('fr-FR')} icon={Users} isLoading={isLoading} />
                <StatCard title="En Ligne" value={stats.activeUsers.toString()} icon={TrendingUp} isLoading={isLoading} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Graphique Revenus */}
                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                    <CardHeader className="p-8 pb-0">
                        <CardTitle className="text-xs font-black uppercase text-primary tracking-[0.2em]">Flux Financier (XOF)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-10 h-80">
                        {isLoading ? <Skeleton className="h-full w-full bg-slate-800" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b'}} />
                                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Graphique Croissance */}
                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                    <CardHeader className="p-8 pb-0">
                        <CardTitle className="text-xs font-black uppercase text-emerald-500 tracking-[0.2em]">Acquisition Nouveaux Membres</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-10 h-80">
                        {isLoading ? <Skeleton className="h-full w-full bg-slate-800" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={userGrowthData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                                    <YAxis hide />
                                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b'}} />
                                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
