'use client';

/**
 * @fileOverview Dashboard Analytique Ndara Afrique.
 * Visualisation des KPIs Business : Revenus, Conversion et Acquisition.
 * Design Premium pour présentation investisseurs.
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, getDocs, Timestamp, limit } from 'firebase/firestore';
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

interface ChartData {
    name: string;
    value: number;
}

export default function AdminStatsPage() {
    const [stats, setStats] = useState({ totalRevenue: 0, totalUsers: 0, convRate: 0, activeUsers: 0 });
    const [revenueData, setRevenueData] = useState<ChartData[]>([]);
    const [userGrowthData, setRevenueGrowthData] = useState<ChartData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() });
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const db = getFirestore();

            const from = dateRange?.from || subDays(new Date(), 30);
            const to = dateRange?.to || new Date();

            try {
                // Récupération massive des données pour calcul local (plus flexible pour les KPIs complexes)
                const [usersSnap, paymentsSnap, trackingSnap] = await Promise.all([
                    getDocs(collection(db, 'users')),
                    getDocs(query(collection(db, 'payments'), where('status', '==', 'Completed'))),
                    getDocs(query(collection(db, 'tracking_events'), limit(5000)))
                ]);

                const allUsers = usersSnap.docs.map(doc => doc.data() as NdaraUser);
                const allPayments = paymentsSnap.docs.map(doc => doc.data() as Payment);
                const allTracking = trackingSnap.docs.map(doc => doc.data() as TrackingEvent);

                // 1. Filtrage par période
                const filteredPayments = allPayments.filter(p => {
                    const d = (p.date as Timestamp).toDate();
                    return isWithinInterval(d, { start: from, end: to });
                });

                const filteredUsers = allUsers.filter(u => {
                    const d = (u.createdAt as Timestamp).toDate();
                    return isWithinInterval(d, { start: from, end: to });
                });

                // 2. Calcul des KPIs Business
                const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
                
                // Calcul du taux de conversion (Inscriptions / Vues de la Landing Page)
                const landingViews = allTracking.filter(t => 
                    t.eventType === 'page_view' && 
                    t.pageUrl === '/' &&
                    isWithinInterval((t.timestamp as Timestamp).toDate(), { start: from, end: to })
                ).length;
                
                const convRate = landingViews > 0 ? Math.round((filteredUsers.length / landingViews) * 100) : 0;

                setStats({
                    totalRevenue,
                    totalUsers: allUsers.length,
                    convRate,
                    activeUsers: allUsers.filter(u => u.isOnline).length
                });

                // 3. Préparation données Graphique Revenus (Groupement par jour)
                const dailyRevenue: { [key: string]: number } = {};
                filteredPayments.forEach(p => {
                    const day = format((p.date as Timestamp).toDate(), 'dd MMM', { locale: fr });
                    dailyRevenue[day] = (dailyRevenue[day] || 0) + p.amount;
                });
                
                // Assurer un tri chronologique
                const sortedRevKeys = Object.keys(dailyRevenue).sort();
                setRevenueData(sortedRevKeys.map(day => ({ name: day, value: dailyRevenue[day] })));

                // 4. Préparation données Graphique Croissance
                const dailySignups: { [key: string]: number } = {};
                filteredUsers.forEach(u => {
                    const day = format((u.createdAt as Timestamp).toDate(), 'dd MMM', { locale: fr });
                    dailySignups[day] = (dailySignups[day] || 0) + 1;
                });
                
                const sortedUserKeys = Object.keys(dailySignups).sort();
                setRevenueGrowthData(sortedUserKeys.map(day => ({ name: day, value: dailySignups[day] })));

            } catch (error) {
                console.error("Error calculating KPIs:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [dateRange]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            <header className="flex flex-col md:flex-row justify-between md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Analyse Stratégique</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Indicateurs de Performance</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Données consolidées pour le pilotage et les investisseurs.</p>
                </div>
                <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-xl">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
            </header>

            {/* --- GRILLE DES KPIs VITAUX --- */}
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
                    description="Membres totaux Ndara"
                />
                <StatCard 
                    title="Utilisateurs Actifs" 
                    value={stats.activeUsers.toString()} 
                    icon={Zap} 
                    isLoading={isLoading} 
                    accentColor="bg-slate-900 border-slate-800"
                    description="Actuellement connectés"
                />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Graphique Flux Financier */}
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
                                <AreaChart data={revenueData}>
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
                                        contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'}} 
                                        itemStyle={{color: '#fff', fontWeight: 'bold'}}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" strokeWidth={4} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Graphique Croissance Utilisateurs */}
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
                                <BarChart data={userGrowthData}>
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

            {/* Note pédagogique pour l'admin */}
            <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-xl">
                    <Calendar className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    <b>Conseil CEO :</b> Utilisez le sélecteur de date en haut à droite pour comparer vos performances. Un taux de conversion élevé (supérieur à 5%) indique que votre proposition de valeur est forte. Surveillez les pics dans le rythme d'acquisition pour identifier vos sources de trafic les plus rentables.
                </p>
            </div>
        </div>
    );
}