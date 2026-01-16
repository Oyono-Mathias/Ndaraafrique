

'use client';

import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, onSnapshot, Timestamp, getDocs, doc, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, ResponsiveContainer, Bar } from 'recharts';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Star, BookOpen, DollarSign, TrendingUp, ShieldAlert, CheckCircle, UserPlus } from 'lucide-react';
import type { Course, Review, Enrollment } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfMonth, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';


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

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  isLoading: boolean;
  description?: string;
}

// --- COMPOSANT DU TABLEAU DE BORD PRINCIPAL ---
const AdminDashboard = () => {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();

  interface Stats {
    activeStudents: number | null;
    monthlyRevenue: number | null;
    avgCompletionRate: number | null;
    newInstructors: number | null;
    newStudents: number | null;
    publishedCourses: number | null;
  }
  
  interface TopCourse {
    id: string;
    title: string;
    enrollmentCount: number;
  }

  const [stats, setStats] = useState<Stats>({
    activeStudents: null,
    monthlyRevenue: null,
    avgCompletionRate: null,
    newInstructors: null,
    newStudents: null,
    publishedCourses: null,
  });
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revenueTrendData, setRevenueTrendData] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);


  // --- FETCHING LOGIC ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
        setIsLoading(false);
        return;
    }

    setIsLoading(true);

    const unsubscribes: (() => void)[] = [];
    const thirtyDaysAgo = Timestamp.fromDate(subDays(new Date(), 30));
    const startOfCurrentMonth = Timestamp.fromDate(startOfMonth(new Date()));

    // Active Students
    const activeStudentsQuery = query(collection(db, 'users'), where('lastLogin', '>=', thirtyDaysAgo));
    unsubscribes.push(onSnapshot(activeStudentsQuery, s => setStats(p => ({ ...p, activeStudents: s.size }))));

    // New Instructors
    const newInstructorsQuery = query(collection(db, 'users'), where('role', '==', 'instructor'), where('createdAt', '>=', thirtyDaysAgo));
    unsubscribes.push(onSnapshot(newInstructorsQuery, s => setStats(p => ({ ...p, newInstructors: s.size }))));
    
    // New Students
    const newStudentsQuery = query(collection(db, 'users'), where('role', '==', 'student'), where('createdAt', '>=', thirtyDaysAgo));
    unsubscribes.push(onSnapshot(newStudentsQuery, s => setStats(p => ({ ...p, newStudents: s.size }))));

    // Published Courses
    const publishedCoursesQuery = query(collection(db, 'courses'), where('status', '==', 'Published'));
    unsubscribes.push(onSnapshot(publishedCoursesQuery, s => setStats(p => ({ ...p, publishedCourses: s.size }))));

    // Enrollments for completion rate
    const enrollmentsQuery = query(collection(db, 'enrollments'));
    unsubscribes.push(onSnapshot(enrollmentsQuery, s => {
        if(s.empty) {
            setStats(prev => ({ ...prev, avgCompletionRate: 0 }));
            return;
        }
        const totalProgress = s.docs.reduce((acc, doc) => acc + (doc.data().progress || 0), 0);
        setStats(prev => ({ ...prev, avgCompletionRate: totalProgress / s.size }));
    }));

    // Payments for revenue
    const paymentsQuery = query(collection(db, 'payments'), where('status', '==', 'Completed'), orderBy('date', 'desc'));
    unsubscribes.push(onSnapshot(paymentsQuery, s => {
        let monthlyTotal = 0;
        const monthlyAggregates: Record<string, number> = {};
        s.docs.forEach(doc => {
            const p = doc.data();
            if (p.date instanceof Timestamp) {
                const d = p.date.toDate();
                if (d >= startOfCurrentMonth.toDate()) monthlyTotal += (p.amount || 0);
                const mKey = format(d, 'MMM yy', { locale: fr });
                monthlyAggregates[mKey] = (monthlyAggregates[mKey] || 0) + (p.amount || 0);
            }
        });
        const trendData = Object.entries(monthlyAggregates).map(([month, revenue]) => ({ month, revenue })).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());
        setRevenueTrendData(trendData);
        setStats(prev => ({ ...prev, monthlyRevenue: monthlyTotal }));
    }));

    // Enrollments for top courses
    const topCoursesEnrollmentsQuery = query(collection(db, 'enrollments'), where('enrollmentDate', '>=', startOfCurrentMonth));
    unsubscribes.push(onSnapshot(topCoursesEnrollmentsQuery, async (snapshot) => {
        if (snapshot.empty) {
            setTopCourses([]); return;
        }
        const enrollmentCounts: Record<string, number> = {};
        snapshot.docs.forEach(doc => {
            const courseId = doc.data().courseId;
            enrollmentCounts[courseId] = (enrollmentCounts[courseId] || 0) + 1;
        });
        const sortedCourseIds = Object.keys(enrollmentCounts).sort((a, b) => enrollmentCounts[b] - enrollmentCounts[a]).slice(0, 5);
        if (sortedCourseIds.length > 0) {
             const coursesSnap = await getDocs(query(collection(db, 'courses'), where('__name__', 'in', sortedCourseIds)));
             const coursesData: Record<string, string> = {};
             coursesSnap.forEach(d => coursesData[d.id] = d.data().title);
             const activities = sortedCourseIds.map(courseId => ({
                 id: courseId, title: coursesData[courseId] || 'Cours inconnu', enrollmentCount: enrollmentCounts[courseId],
             }));
             setTopCourses(activities);
        } else {
            setTopCourses([]);
        }
    }));
    
    // User growth chart data
    const allNewUsersQuery = query(collection(db, 'users'), where('createdAt', '>=', thirtyDaysAgo));
    unsubscribes.push(onSnapshot(allNewUsersQuery, snapshot => {
        const dailyCounts: Record<string, { etudiants: number, formateurs: number }> = {};
        const dateArray = Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), i), 'dd MMM', { locale: fr })).reverse();
        
        dateArray.forEach(d => { dailyCounts[d] = { etudiants: 0, formateurs: 0 }});

        snapshot.docs.forEach(doc => {
            const user = doc.data();
            if (user.createdAt instanceof Timestamp) {
                const dateKey = format(user.createdAt.toDate(), 'dd MMM', { locale: fr });
                if (dailyCounts[dateKey]) {
                    if (user.role === 'instructor') {
                        dailyCounts[dateKey].formateurs++;
                    } else {
                        dailyCounts[dateKey].etudiants++;
                    }
                }
            }
        });
        const growthData = Object.entries(dailyCounts).map(([date, counts]) => ({ date, ...counts }));
        setUserGrowthData(growthData);
        setIsLoading(false);
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
    revenue: { label: "Revenus", color: "hsl(var(--primary))" },
  };
  
  const userChartConfig = {
    etudiants: { label: "Étudiants", color: "hsl(var(--primary))" },
    formateurs: { label: "Formateurs", color: "hsl(var(--muted-foreground))" },
  }

  const statCards = [
    { title: "Revenus (Mois)", value: `${stats.monthlyRevenue?.toLocaleString('fr-FR') ?? '...'} XOF`, icon: DollarSign },
    { title: "Étudiants Actifs (30j)", value: stats.activeStudents?.toLocaleString('fr-FR') ?? '...', icon: Users },
    { title: "Nouveaux Étudiants (30j)", value: stats.newStudents?.toLocaleString('fr-FR') ?? '...', icon: UserPlus },
    { title: "Nouveaux Formateurs (30j)", value: stats.newInstructors?.toLocaleString('fr-FR') ?? '...', icon: UserPlus },
    { title: "Cours Publiés", value: stats.publishedCourses?.toLocaleString('fr-FR') ?? '...', icon: BookOpen },
    { title: "Taux de Complétion Moyen", value: stats.avgCompletionRate !== null ? `${Math.round(stats.avgCompletionRate)}%` : '...', icon: CheckCircle },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map(card => (
            <StatCard
                key={card.title}
                title={card.title}
                value={card.value}
                icon={card.icon}
                isLoading={isLoading}
            />
        ))}
      </div>
      
      <div className="grid lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3 bg-white dark:bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>Évolution des revenus (nets)</CardTitle>
                    <CardDescription>Revenus nets (après commission) générés sur les derniers mois.</CardDescription>
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
                        {isLoading ? (
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

       <Card className="lg:col-span-3 bg-white dark:bg-card shadow-sm">
            <CardHeader>
                <CardTitle>Nouveaux utilisateurs (30 derniers jours)</CardTitle>
                <CardDescription>Évolution journalière des inscriptions.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ChartContainer config={userChartConfig} className="h-80 w-full">
                    <ResponsiveContainer>
                        <BarChart data={userGrowthData}>
                            <CartesianGrid vertical={false} className="stroke-border/50" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                className="fill-muted-foreground text-xs"
                                interval={6}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                allowDecimals={false}
                                className="fill-muted-foreground text-xs"
                            />
                            <Tooltip
                                cursor={false}
                                content={<ChartTooltipContent
                                    className="bg-background/80 backdrop-blur-sm"
                                />}
                            />
                            <Bar dataKey="etudiants" stackId="a" fill="var(--color-etudiants)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="formateurs" stackId="a" fill="var(--color-formateurs)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

    </div>
  );
};

export default function StatisticsPage() {
    const { t } = useTranslation();
    return (
         <div className="space-y-8 max-w-7xl mx-auto px-4">
              <header>
                <h1 className="text-3xl font-bold dark:text-white">{t('navStatistics')}</h1>
                <p className="text-muted-foreground dark:text-slate-400">Analyse de la performance de vos cours.</p>
            </header>
            <AdminDashboard />
        </div>
    )
}
