
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

interface ActivityItem {
    id: string;
    userName: string;
    userAvatar?: string;
    courseTitle: string;
    amount: number;
    date: Date;
}

const StatCard = ({ title, value, icon: Icon, isLoading, accentColor }: { title: string, value: string, icon: React.ElementType, isLoading: boolean, accentColor?: string }) => (
    <Card className={cn("border-l-4 dark:bg-[#1e293b] dark:border-slate-700", accentColor)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium dark:text-slate-400">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold dark:text-white">{value}</div>}
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
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    setIsLoading(true);
    
    const unsubs: (() => void)[] = [];

    // Listener for total users
    unsubs.push(onSnapshot(collection(db, 'users'), (snapshot) => {
        setStats(prev => ({ ...prev, userCount: snapshot.size }));
    }));

    // Listener for published courses
    unsubs.push(onSnapshot(query(collection(db, 'courses'), where('status', '==', 'Published')), (snapshot) => {
        setStats(prev => ({ ...prev, courseCount: snapshot.size }));
    }));
    
    // Listener for open support tickets
    unsubs.push(onSnapshot(query(collection(db, 'support_tickets'), where('status', '==', 'ouvert')), (snapshot) => {
        setStats(prev => ({ ...prev, openSupportTickets: snapshot.size }));
    }));

    // Listener for payments to calculate revenue
    unsubs.push(onSnapshot(query(collection(db, 'payments'), where('status', '==', 'Completed')), (snapshot) => {
        const startOfCurrentMonth = format(new Date(), 'yyyy-MM');
        let monthlyTotal = 0;
        
        snapshot.docs.forEach(doc => {
            const payment = doc.data();
            const paymentDate = payment.date?.toDate ? format(payment.date.toDate(), 'yyyy-MM') : null;
            if (paymentDate === startOfCurrentMonth) {
                monthlyTotal += (payment.amount || 0);
            }
        });
        
        setStats(prev => ({ ...prev, monthlyRevenue: monthlyTotal }));
        if(isLoading) setIsLoading(false); // Stop loading after first data fetch
    }));

    // Listener for recent activities (new payments)
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
                userName: user?.fullName || t('a_user'),
                userAvatar: user?.profilePictureURL,
                courseTitle: course?.title || t('a_course'),
                amount: payment.amount,
                date: payment.date.toDate(),
            };
        });
        setActivities(newActivities);
    }));

    return () => {
        unsubs.forEach(unsub => unsub());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);


  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title={t('total_students')}
            value={stats.userCount.toLocaleString('fr-FR')} 
            icon={Users} 
            isLoading={isLoading} 
            accentColor="border-blue-500"
        />
        <StatCard 
            title={t('monthly_revenue')} 
            value={formatCurrency(stats.monthlyRevenue)} 
            icon={DollarSign} 
            isLoading={isLoading} 
            accentColor="border-green-500"
        />
         <StatCard 
            title={t('active_courses')}
            value={stats.courseCount.toLocaleString('fr-FR')}
            icon={BookOpen} 
            isLoading={isLoading} 
            accentColor="border-purple-500"
        />
        <StatCard 
            title={t('support_tickets')}
            value={stats.openSupportTickets.toString()}
            icon={MessageSquare} 
            isLoading={isLoading}
            accentColor="border-orange-500"
        />
      </section>
      
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">{t('revenue_evolution')}</h2>
            <Card className="dark:bg-[#1e293b] dark:border-slate-700 h-80 flex items-center justify-center">
                <CardContent className="pt-6 text-center text-muted-foreground">
                    <Activity className="h-10 w-10 mx-auto mb-2"/>
                    <p>{t('chart_soon')}</p>
                </CardContent>
            </Card>
        </div>
        <div>
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">{t('revenue_repartition')}</h2>
            <Card className="dark:bg-[#1e293b] dark:border-slate-700 h-80 flex items-center justify-center">
                 <CardContent className="pt-6 text-center text-muted-foreground">
                    <DollarSign className="h-10 w-10 mx-auto mb-2"/>
                    <p>{t('chart_soon')}</p>
                </CardContent>
            </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4 dark:text-white">{t('recent_activity')}</h2>
        <Card className="dark:bg-[#1e293b] dark:border-slate-700">
            <CardContent className="pt-6">
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full dark:bg-slate-700" />)}
                    </div>
                ) : activities.length > 0 ? (
                    <div className="space-y-4">
                        {activities.map(activity => (
                            <div key={activity.id} className="flex items-center gap-4 p-2 rounded-md hover:bg-slate-800/50">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={activity.userAvatar} />
                                    <AvatarFallback>{activity.userName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none dark:text-slate-200">
                                        <span className="font-semibold">{activity.userName}</span> {t('has_purchased')} <span className="font-semibold">"{activity.courseTitle}"</span>.
                                    </p>
                                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                                        {format(activity.date, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                                    </p>
                                </div>
                                <div className="ml-auto font-medium text-sm dark:text-white">{formatCurrency(activity.amount)}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground dark:text-slate-500">
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
