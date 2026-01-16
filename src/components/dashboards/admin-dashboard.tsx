
'use client';

import React, { useState, useEffect } from 'react';
import { Users, DollarSign, BookOpen, UserPlus, TrendingUp, ShieldAlert, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRole } from '@/context/RoleContext';
import { collection, query, where, onSnapshot, getFirestore, Timestamp, orderBy, limit, getDocs, doc } from 'firebase/firestore';
import type { Course, Enrollment, NdaraUser } from '@/lib/types';
import { format, startOfMonth, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, ResponsiveContainer } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { AdminQuickActions } from './AdminQuickActions';
import { AdminSecurityAlerts } from './AdminSecurityAlerts';

// --- TYPES ---
interface Stats {
  activeStudents: number | null;
  monthlyRevenue: number | null;
  avgCompletionRate: number | null;
  newInstructors: number | null;
}

interface TopCourse {
  id: string;
  title: string;
  enrollmentCount: number;
}

// --- COMPOSANT DE CARTE STATISTIQUE ---
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  isLoading: boolean;
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, isLoading, description }) => (
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
      {description && !isLoading && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

// --- COMPOSANT DU TABLEAU DE BORD PRINCIPAL ---
const AdminDashboard = () => {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();

  const [stats, setStats] = useState<Stats>({
    activeStudents: null,
    monthlyRevenue: null,
    avgCompletionRate: null,
    newInstructors: null,
  });
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [loadingState, setLoadingState] = useState({
    stats: true,
    activity: true,
  });
   const [revenueTrendData, setRevenueTrendData] = useState<any[]>([]);

  // --- FETCHING LOGIC ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;

    const thirtyDaysAgo = Timestamp.fromDate(subDays(new Date(), 30));
    const startOfCurrentMonth = Timestamp.fromDate(startOfMonth(new Date()));

    const unsubscribes: (() => void)[] = [];

    // --- KPIs ---
    const activeStudentsQuery = query(collection(db, 'users'), where('lastLogin', '>=', thirtyDaysAgo));
    unsubscribes.push(onSnapshot(activeStudentsQuery, snapshot => {
        setStats(prev => ({ ...prev, activeStudents: snapshot.size }));
        setLoadingState(prev => ({...prev, stats: false}));
    }, (error) => console.error("Error fetching active students:", error)));

    const newInstructorsQuery = query(collection(db, 'users'), where('role', '==', 'instructor'), where('createdAt', '>=', thirtyDaysAgo));
     unsubscribes.push(onSnapshot(newInstructorsQuery, snapshot => {
        setStats(prev => ({ ...prev, newInstructors: snapshot.size }));
    }, (error) => console.error("Error fetching new instructors:", error)));

    const enrollmentsQuery = query(collection(db, 'enrollments'));
    unsubscribes.push(onSnapshot(enrollmentsQuery, snapshot => {
        if(snapshot.empty) {
            setStats(prev => ({ ...prev, avgCompletionRate: 0 }));
            return;
        }
        const totalProgress = snapshot.docs.reduce((acc, doc) => acc + (doc.data().progress || 0), 0);
        setStats(prev => ({ ...prev, avgCompletionRate: totalProgress / snapshot.size }));
    }, (error) => console.error("Error fetching enrollments:", error)));

    const paymentsQuery = query(collection(db, 'payments'), where('status', '==', 'Completed'), orderBy('date', 'desc'));
    unsubscribes.push(onSnapshot(paymentsQuery, snapshot => {
        let monthlyTotal = 0;
        const monthlyAggregates: Record<string, number> = {};

        snapshot.docs.forEach(doc => {
            const payment = doc.data();
            if (payment.date instanceof Timestamp) {
                const paymentDate = payment.date.toDate();
                if (paymentDate >= startOfCurrentMonth.toDate()) {
                    monthlyTotal += (payment.amount || 0);
                }
                const monthKey = format(paymentDate, 'MMM yy', { locale: fr });
                monthlyAggregates[monthKey] = (monthlyAggregates[monthKey] || 0) + (payment.amount || 0);
            }
        });
        
        const trendData = Object.entries(monthlyAggregates)
            .map(([month, revenue]) => ({ month, revenue }))
            .sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

        setRevenueTrendData(trendData);
        setStats(prev => ({ ...prev, monthlyRevenue: monthlyTotal }));
    }, (error) => console.error("Error fetching payments:", error)));
    
    // --- Top Courses Activity ---
    const topCoursesQuery = query(collection(db, 'enrollments'), where('enrollmentDate', '>=', startOfCurrentMonth));
    unsubscribes.push(onSnapshot(topCoursesQuery, async (snapshot) => {
        if (snapshot.empty) {
            setLoadingState(prev => ({...prev, activity: false}));
            setTopCourses([]);
            return;
        }

        const enrollmentCounts: Record<string, number> = {};
        snapshot.docs.forEach(doc => {
            const courseId = doc.data().courseId;
            enrollmentCounts[courseId] = (enrollmentCounts[courseId] || 0) + 1;
        });
        
        const sortedCourseIds = Object.keys(enrollmentCounts).sort((a, b) => enrollmentCounts[b] - enrollmentCounts[a]).slice(0, 5);
        
        if (sortedCourseIds.length === 0) {
            setLoadingState(prev => ({...prev, activity: false}));
            setTopCourses([]);
            return;
        }

        const coursesSnap = await getDocs(query(collection(db, 'courses'), where('__name__', 'in', sortedCourseIds)));
        const coursesData: Record<string, string> = {};
        coursesSnap.forEach(d => coursesData[d.id] = d.data().title);

        const activities = sortedCourseIds.map(courseId => ({
            id: courseId,
            title: coursesData[courseId] || 'Cours inconnu',
            enrollmentCount: enrollmentCounts[courseId],
        }));
        
        setTopCourses(activities);
        setLoadingState(prev => ({...prev, activity: false}));
    }, (error) => {
        console.error("Error fetching top courses:", error);
        setLoadingState(prev => ({...prev, activity: false}));
    }));


    return () => unsubscribes.forEach(unsub => unsub());
  }, [currentUser, db]);


  // --- Authorization Check ---
  if (!isUserLoading && currentUser?.role !== 'admin') {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
             <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Accès Interdit</h1>
            <p className="text-muted-foreground">Vous n'avez pas les autorisations nécessaires pour accéder à cette page.</p>
        </div>
    )
  }

  const chartConfig = {
    revenue: {
      label: "Revenus",
      color: "hsl(var(--primary))",
    },
  };

  const statCards = [
    { title: "Revenus (Mois en cours)", value: `${stats.monthlyRevenue?.toLocaleString('fr-FR') ?? '...'} XOF`, icon: DollarSign },
    { title: "Étudiants Actifs (30j)", value: stats.activeStudents?.toLocaleString('fr-FR') ?? '...', icon: Users },
    { title: "Taux de Complétion Moyen", value: stats.avgCompletionRate !== null ? `${Math.round(stats.avgCompletionRate)}%` : '...', icon: CheckCircle },
    { title: "Nouveaux Instructeurs (30j)", value: stats.newInstructors?.toLocaleString('fr-FR') ?? '...', icon: UserPlus }
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold mb-4 text-white">Actions Rapides</h2>
        <AdminQuickActions />
      </section>

      <AdminSecurityAlerts />
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(card => (
            <StatCard
                key={card.title}
                title={card.title}
                value={card.value}
                icon={card.icon}
                isLoading={loadingState.stats}
            />
        ))}
      </div>
      
      <div className="grid lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3 bg-white dark:bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>Évolution des revenus</CardTitle>
                    <CardDescription>Revenus bruts générés sur les derniers mois.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ChartContainer config={chartConfig} className="h-80 w-full">
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
                          <YAxis 
                                  tickLine={false} 
                                  axisLine={false} 
                                  tickMargin={8} 
                                  tickFormatter={(value) => `${Number(value) / 1000}k`}
                                  className="fill-muted-foreground text-xs"
                              />
                          <Tooltip
                              cursor={false}
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
                </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-white dark:bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>Top des cours ce mois-ci</CardTitle>
                    <CardDescription>Les cours avec le plus de nouvelles inscriptions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cours</TableHead>
                                <TableHead className="text-right">Inscriptions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {loadingState.activity ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}><TableCell><Skeleton className="h-5 w-full" /></TableCell><TableCell><Skeleton className="h-5 w-10 ml-auto" /></TableCell></TableRow>
                            ))
                        ) : topCourses.length > 0 ? (
                            topCourses.map((course) => (
                                <TableRow key={course.id}>
                                <TableCell className="font-medium truncate max-w-xs">{course.title}</TableCell>
                                <TableCell className="text-right font-bold">{course.enrollmentCount}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={2} className="h-24 text-center text-muted-foreground">Aucune inscription ce mois-ci.</TableCell></TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
      </div>

    </div>
  );
};

export default AdminDashboard;
