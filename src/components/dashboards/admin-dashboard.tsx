
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, BookOpen, DollarSign, Activity, ShoppingCart, MessageSquare } from "lucide-react";
import { getFirestore, collection, query, where, onSnapshot, Timestamp, orderBy, limit, getDocs } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { format } from 'date-fns';
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


const StatCard = ({ title, value, icon: Icon, isLoading, accentColor }: { title: string, value: string, icon: React.ElementType, isLoading: boolean, accentColor?: string }) => (
    <Card className={cn("border-t-4", accentColor)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4 bg-slate-700" /> : <div className="text-2xl font-bold text-white">{value}</div>}
        </CardContent>
    </Card>
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
    <div className="space-y-8">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title={t('statStudents')}
            value={stats.userCount.toLocaleString('fr-FR')} 
            icon={Users} 
            isLoading={isLoading} 
            accentColor="border-blue-500"
        />
        <StatCard 
            title={t('statRevenue')} 
            value={formatCurrency(stats.monthlyRevenue)} 
            icon={DollarSign} 
            isLoading={isLoading} 
            accentColor="border-green-500"
        />
         <StatCard 
            title={t('statCourses')}
            value={stats.courseCount.toLocaleString('fr-FR')}
            icon={BookOpen} 
            isLoading={isLoading} 
            accentColor="border-purple-500"
        />
        <StatCard 
            title={t('statTickets')}
            value={stats.openSupportTickets.toString()}
            icon={MessageSquare} 
            isLoading={isLoading}
            accentColor="border-orange-500"
        />
      </section>
      
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-white">{t('titleRevenue')}</h2>
        <Card>
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
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4 text-white">{t('recentActivity')}</h2>
        <Card>
            <CardContent className="pt-6">
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-slate-700" />)}
                    </div>
                ) : activities.length > 0 ? (
                    <div className="space-y-2">
                        {activities.map(activity => (
                            <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-800/50 border-b border-slate-800 last:border-b-0">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={activity.userAvatar} />
                                    <AvatarFallback>{activity.userName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none text-slate-200">
                                        <span className="font-semibold">{activity.userName}</span> a acheté <span className="font-semibold">"{activity.courseTitle}"</span>.
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {format(activity.date, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                                    </p>
                                </div>
                                <div className="ml-auto font-medium text-sm text-green-400 font-mono">+{formatCurrency(activity.amount)}</div>
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
      </section>
    </div>
  );
}
