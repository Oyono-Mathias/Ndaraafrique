
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, BookOpen, DollarSign, Activity, ShoppingCart, MessageSquare } from "lucide-react";
import { getFirestore, collection, query, where, onSnapshot, Timestamp, orderBy, limit, getDocs } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import type { Course } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface ActivityItem {
    id: string;
    userName: string;
    userAvatar?: string;
    courseTitle: string;
    amount: number;
    date: Date;
}

interface RevenueDataPoint {
    month: string;
    revenue: number;
}


const StatCard = ({ title, value, icon: Icon, isLoading, change, accentColor }: { title: string, value: string, icon: React.ElementType, isLoading: boolean, change?: string, accentColor?: string }) => (
    <div className={cn("glassmorphism-card rounded-2xl p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10", accentColor)}>
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <p className="text-sm font-medium text-slate-400">{title}</p>
                 {isLoading ? (
                    <Skeleton className="h-9 w-32 bg-slate-700" />
                ) : (
                    <p className="text-3xl font-bold text-white">{value}</p>
                )}
            </div>
            <div className="p-2 bg-slate-900/50 rounded-lg border border-slate-700">
                <Icon className="h-5 w-5 text-slate-300" />
            </div>
        </div>
        {!isLoading && change && (
             <p className="text-xs text-green-400 mt-3 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {change}
            </p>
        )}
    </div>
);


const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('fr-FR')} XOF`;
};

export function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    userCount: 0,
    courseCount: 0,
    monthlyRevenue: 0,
    openSupportTickets: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [revenueTrendData, setRevenueTrendData] = useState<RevenueDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    setIsLoading(true);
    
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(collection(db, 'users'), (snapshot) => {
        setStats(prev => ({ ...prev, userCount: snapshot.size }));
    }));

    unsubs.push(onSnapshot(query(collection(db, 'courses'), where('status', '==', 'Published')), (snapshot) => {
        setStats(prev => ({ ...prev, courseCount: snapshot.size }));
    }));
    
    unsubs.push(onSnapshot(query(collection(db, 'support_tickets'), where('status', '==', 'ouvert')), (snapshot) => {
        setStats(prev => ({ ...prev, openSupportTickets: snapshot.size }));
    }));

    const paymentsQuery = query(collection(db, 'payments'), where('status', '==', 'Completed'));
    unsubs.push(onSnapshot(paymentsQuery, (snapshot) => {
        const startOfCurrentMonth = new Date();
        startOfCurrentMonth.setDate(1);
        startOfCurrentMonth.setHours(0,0,0,0);

        let monthlyTotal = 0;
        const monthlyAggregates: Record<string, number> = {};

        snapshot.docs.forEach(doc => {
            const payment = doc.data();
            if (payment.date instanceof Timestamp) {
                const paymentDate = payment.date.toDate();
                if (paymentDate >= startOfCurrentMonth) {
                    monthlyTotal += (payment.amount || 0);
                }
                const monthKey = format(paymentDate, 'MMM yy', { locale: fr });
                monthlyAggregates[monthKey] = (monthlyAggregates[monthKey] || 0) + (payment.amount || 0);
            }
        });
        
        const trendData = Object.entries(monthlyAggregates)
            .map(([month, revenue]) => ({ month, revenue }))
            .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

        setRevenueTrendData(trendData);
        setStats(prev => ({ ...prev, monthlyRevenue: monthlyTotal }));
        if(isLoading) setIsLoading(false);
    }));

    const recentPaymentsQuery = query(collection(db, 'payments'), where('status', '==', 'Completed'), orderBy('date', 'desc'), limit(5));
    unsubs.push(onSnapshot(recentPaymentsQuery, async (snapshot) => {
        const paymentDocs = snapshot.docs;
        if(paymentDocs.length === 0) {
            setActivities([]);
            return;
        }

        const userIds = [...new Set(paymentDocs.map(doc => doc.data().userId))].filter(Boolean);
        const courseIds = [...new Set(paymentDocs.map(doc => doc.data().courseId))].filter(Boolean);

        const usersMap = new Map<string, FormaAfriqueUser>();
        if (userIds.length > 0) {
            const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', userIds.slice(0,30))));
            usersSnap.forEach(doc => usersMap.set(doc.data().uid, doc.data() as FormaAfriqueUser));
        }
        
        const coursesMap = new Map<string, Course>();
        if (courseIds.length > 0) {
            const coursesSnap = await getDocs(query(collection(db, 'courses'), where('__name__', 'in', courseIds.slice(0,30))));
            coursesSnap.forEach(doc => coursesMap.set(doc.id, doc.data() as Course));
        }

        const newActivities = paymentDocs.map(doc => {
            const payment = doc.data();
            const user = usersMap.get(payment.userId);
            const course = coursesMap.get(payment.courseId);
            return {
                id: doc.id,
                userName: user?.fullName || 'Un utilisateur',
                userAvatar: user?.profilePictureURL,
                courseTitle: course?.title || 'un cours',
                amount: payment.amount,
                date: payment.date.toDate(),
            };
        });
        setActivities(newActivities);
    }));

    return () => {
        unsubs.forEach(unsub => unsub());
    };
  }, [db]);

  const chartConfig = { revenue: { label: t('statRevenue'), color: 'hsl(var(--primary))' }};

  return (
    <div className="space-y-8 animate-in fade-in-50">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title={t('statStudents')}
            value={stats.userCount.toLocaleString('fr-FR')} 
            icon={Users} 
            isLoading={isLoading} 
            change="+12% ce mois-ci"
        />
        <StatCard 
            title={t('statRevenue')} 
            value={formatCurrency(stats.monthlyRevenue)} 
            icon={DollarSign} 
            isLoading={isLoading}
            change="+23% vs mois dernier"
        />
         <StatCard 
            title={t('statCourses')}
            value={stats.courseCount.toLocaleString('fr-FR')}
            icon={BookOpen} 
            isLoading={isLoading}
            change="+5 nouveaux cours"
        />
        <StatCard 
            title={t('statTickets')}
            value={stats.openSupportTickets.toString()}
            icon={MessageSquare} 
            isLoading={isLoading}
            change="2 nouveaux aujourd'hui"
        />
      </section>
      
      <section className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-4 text-white">{t('titleRevenue')}</h2>
            <Card className="glassmorphism-card rounded-2xl">
                <CardContent className="pt-6">
                    {isLoading ? <Skeleton className="h-80 w-full bg-slate-700" /> : (
                        <ChartContainer config={chartConfig} className="h-80 w-full">
                            <ResponsiveContainer>
                                <BarChart data={revenueTrendData}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-700" />
                                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                    <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} className="bg-slate-900 border-slate-700" />} />
                                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={8} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </div>
        <div>
            <h2 className="text-2xl font-semibold mb-4 text-white">{t('recentActivity')}</h2>
            <Card className="glassmorphism-card rounded-2xl">
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-slate-700" />)}
                        </div>
                    ) : activities.length > 0 ? (
                        <div className="space-y-2">
                            {activities.map(activity => (
                                <div key={activity.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-slate-800/50">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={activity.userAvatar} />
                                        <AvatarFallback>{activity.userName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none text-slate-200">
                                            <span className="font-semibold">{activity.userName}</span> a acheté <span className="font-semibold">"{activity.courseTitle}"</span>.
                                        </p>
                                    </div>
                                    <p className="text-xs text-blue-400 whitespace-nowrap">
                                        {formatDistanceToNow(activity.date, { locale: fr, addSuffix: true })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <ShoppingCart className="h-10 w-10 mx-auto mb-2"/>
                            <p>{t('no_recent_activity')}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </section>
    </div>
  );
}

    