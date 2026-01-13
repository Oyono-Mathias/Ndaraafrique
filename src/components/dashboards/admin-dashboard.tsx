
'use client';

import React, { useState, useEffect } from 'react';
import { Users, DollarSign, BookOpen, MessageSquare, TrendingUp, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRole } from '@/context/RoleContext';
import { collection, query, where, onSnapshot, getFirestore, Timestamp, orderBy, limit, getDocs, doc } from 'firebase/firestore';
import type { Course, Enrollment, FormaAfriqueUser } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, CartesianGrid, XAxis, Area, Tooltip, ResponsiveContainer } from 'recharts';

// --- TYPES ---
interface Stats {
  totalStudents: number | null;
  monthlyRevenue: number | null;
  publishedCourses: number | null;
  openSupportTickets: number | null;
}

interface RecentActivity {
  id: string;
  studentName: string;
  studentAvatar?: string;
  courseName: string;
  enrolledAt: Date;
}

// --- COMPOSANT DE CARTE STATISTIQUE ---
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  isLoading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, isLoading }) => (
  <Card className="bg-white dark:bg-card shadow-sm transition-transform hover:-translate-y-1">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-3/5" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </CardContent>
  </Card>
);

// --- COMPOSANT DU TABLEAU DE BORD PRINCIPAL ---
const AdminDashboard = () => {
  const { formaAfriqueUser, isUserLoading } = useRole();
  const db = getFirestore();

  const [stats, setStats] = useState<Stats>({
    totalStudents: null,
    monthlyRevenue: null,
    publishedCourses: null,
    openSupportTickets: null,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loadingState, setLoadingState] = useState({
    stats: true,
    activity: true,
  });
   const [revenueTrendData, setRevenueTrendData] = useState<any[]>([]);

  // --- FETCHING LOGIC ---
  useEffect(() => {
    if (!formaAfriqueUser || formaAfriqueUser.role !== 'admin') return;

    const unsubscribes: (() => void)[] = [];

    // --- Statistiques ---
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    unsubscribes.push(onSnapshot(studentsQuery, snapshot => {
      setStats(prev => ({ ...prev, totalStudents: snapshot.size }));
      setLoadingState(prev => ({...prev, stats: false}));
    }));

    const coursesQuery = query(collection(db, 'courses'), where('status', '==', 'Published'));
    unsubscribes.push(onSnapshot(coursesQuery, snapshot => {
      setStats(prev => ({ ...prev, publishedCourses: snapshot.size }));
    }));

    const ticketsQuery = query(collection(db, 'support_tickets'), where('status', '==', 'ouvert'));
    unsubscribes.push(onSnapshot(ticketsQuery, snapshot => {
      setStats(prev => ({ ...prev, openSupportTickets: snapshot.size }));
    }));

    const paymentsQuery = query(
      collection(db, 'payments'),
      where('status', '==', 'Completed'),
      orderBy('date', 'desc')
    );
    unsubscribes.push(onSnapshot(paymentsQuery, snapshot => {
        const now = new Date();
        const startOfMonthTimestamp = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1));
        
        let monthlyTotal = 0;
        const monthlyAggregates: Record<string, number> = {};

        snapshot.docs.forEach(doc => {
            const payment = doc.data();
            if (payment.date instanceof Timestamp) {
                const paymentDate = payment.date.toDate();
                if (paymentDate >= startOfMonthTimestamp.toDate()) {
                    monthlyTotal += (payment.amount || 0);
                }
                const monthKey = paymentDate.toLocaleString('default', { month: 'short', year: '2-digit' });
                monthlyAggregates[monthKey] = (monthlyAggregates[monthKey] || 0) + (payment.amount || 0);
            }
        });
        
        const trendData = Object.entries(monthlyAggregates)
            .map(([month, revenue]) => ({ month, revenue }))
            .reverse(); // To get recent months first

        setRevenueTrendData(trendData);
        setStats(prev => ({ ...prev, monthlyRevenue: monthlyTotal }));
    }));

    // --- Recent Activity ---
    const activityQuery = query(collection(db, 'enrollments'), orderBy('enrollmentDate', 'desc'), limit(5));
    unsubscribes.push(onSnapshot(activityQuery, async (snapshot) => {
        const enrollments = snapshot.docs.map(d => ({id: d.id, ...d.data()} as Enrollment));
        if (enrollments.length === 0) {
            setLoadingState(prev => ({...prev, activity: false}));
            setRecentActivities([]);
            return;
        }
        
        const userIds = [...new Set(enrollments.map(e => e.studentId))];
        const courseIds = [...new Set(enrollments.map(e => e.courseId))];

        const usersData: Record<string, FormaAfriqueUser> = {};
        if (userIds.length > 0) {
            const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', userIds.slice(0,10))));
            usersSnap.forEach(d => usersData[d.id] = d.data() as FormaAfriqueUser);
        }

        const coursesData: Record<string, Course> = {};
        if (courseIds.length > 0) {
            const coursesSnap = await getDocs(query(collection(db, 'courses'), where('__name__', 'in', courseIds.slice(0,10))));
            coursesSnap.forEach(d => coursesData[d.id] = d.data() as Course);
        }
        
        const activities = enrollments.map(enrollment => ({
            id: enrollment.id,
            studentName: usersData[enrollment.studentId]?.fullName || 'Un étudiant',
            studentAvatar: usersData[enrollment.studentId]?.profilePictureURL,
            courseName: coursesData[enrollment.courseId]?.title || 'un cours',
            enrolledAt: (enrollment.enrollmentDate as Timestamp)?.toDate() || new Date(),
        }));
        
        setRecentActivities(activities);
        setLoadingState(prev => ({...prev, activity: false}));
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [formaAfriqueUser, db]);


  // --- Authorization Check ---
  if (!isUserLoading && formaAfriqueUser?.role !== 'admin') {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
             <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Accès Interdit</h1>
            <p className="text-muted-foreground">Vous n'avez pas les autorisations nécessaires pour accéder à cette page.</p>
        </div>
    )
  }

  const isLoading = isUserLoading || loadingState.stats || loadingState.activity;
  
  const chartConfig = {
    revenue: {
      label: "Revenus",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Étudiants"
          value={stats.totalStudents?.toLocaleString('fr-FR') ?? '...'}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          title="Revenus (Mois en cours)"
          value={`${stats.monthlyRevenue?.toLocaleString('fr-FR') ?? '...'} XOF`}
          icon={DollarSign}
          isLoading={isLoading}
        />
        <StatCard
          title="Cours Publiés"
          value={stats.publishedCourses?.toLocaleString('fr-FR') ?? '...'}
          icon={BookOpen}
          isLoading={isLoading}
        />
        <StatCard
          title="Tickets Support Ouverts"
          value={stats.openSupportTickets?.toLocaleString('fr-FR') ?? '...'}
          icon={MessageSquare}
          isLoading={isLoading}
        />
      </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
             <Card className="xl:col-span-2 bg-white dark:bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>Évolution des revenus</CardTitle>
                    <CardDescription>Revenus bruts générés sur les derniers mois.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                     {isLoading ? <Skeleton className="h-72 w-full" /> : (
                        <ChartContainer config={chartConfig} className="h-72 w-full">
                          <ResponsiveContainer>
                            <AreaChart data={revenueTrendData}>
                               <defs>
                                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                                  </linearGradient>
                                </defs>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                              <XAxis
                                dataKey="month"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value) => value.slice(0, 3)}
                                className="fill-muted-foreground text-xs"
                              />
                              <Tooltip
                                content={<ChartTooltipContent
                                    formatter={(value) => `${(value as number).toLocaleString('fr-FR')} XOF`}
                                    className="bg-background/80 backdrop-blur-sm"
                                />}
                              />
                              <Area
                                dataKey="revenue"
                                type="natural"
                                fill="url(#fillRevenue)"
                                stroke="var(--color-revenue)"
                                stackId="a"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                     )}
                </CardContent>
            </Card>
             <Card className="bg-white dark:bg-card shadow-sm">
                <CardHeader>
                <CardTitle>Activité Récente</CardTitle>
                <CardDescription>Les dernières inscriptions sur la plateforme.</CardDescription>
                </CardHeader>
                <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : recentActivities.length > 0 ? (
                    <div className="space-y-4">
                    {recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-4">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={activity.studentAvatar} />
                            <AvatarFallback>{activity.studentName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="text-sm font-medium leading-none">
                            {activity.studentName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                            s'est inscrit à "{activity.courseName}"
                            </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(activity.enrolledAt, { locale: fr, addSuffix: true })}
                        </div>
                        </div>
                    ))}
                    </div>
                ) : (
                    <p className="text-sm text-center text-muted-foreground py-8">
                    Aucune activité récente.
                    </p>
                )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
};

export default AdminDashboard;
