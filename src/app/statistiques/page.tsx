

'use client';

import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, onSnapshot, Timestamp, getDocs, doc, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, ResponsiveContainer, Bar } from 'recharts';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Star, BookOpen, DollarSign, TrendingUp, ShieldAlert, CheckCircle, UserPlus, Calendar as CalendarIcon, Gift } from 'lucide-react';
import type { Course, Review, Enrollment } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfMonth, subDays, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from '@/components/ui/button';


function DatePickerWithRange({
  className,
  date,
  setDate
}: {
  className?: string
  date: DateRange | undefined,
  setDate: (date: DateRange | undefined) => void
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal dark:bg-slate-800 dark:border-slate-700",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd LLL y", { locale: fr })} -{" "}
                  {format(date.to, "dd LLL y", { locale: fr })}
                </>
              ) : (
                format(date.from, "dd LLL y", { locale: fr })
              )
            ) : (
              <span>Choisissez une période</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

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
const StatsDashboard = () => {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();

  interface Stats {
    newStudents: number | null;
    periodRevenue: number | null;
    avgCompletionRate: number | null; // This will remain global
    newInstructors: number | null;
    publishedCourses: number | null; // This will remain global
  }
  
  interface TopCourse {
    id: string;
    title: string;
    paidCount: number;
    grantedCount: number;
    totalCount: number;
  }

  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const [stats, setStats] = useState<Stats>({
    newStudents: null,
    periodRevenue: null,
    avgCompletionRate: null,
    newInstructors: null,
    publishedCourses: null,
  });
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revenueTrendData, setRevenueTrendData] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);


  // --- FETCHING LOGIC ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin' || !date?.from || !date?.to) {
        setIsLoading(isUserLoading);
        return;
    }

    setIsLoading(true);

    const startDate = Timestamp.fromDate(date.from);
    const endDate = Timestamp.fromDate(date.to);

    const unsubscribes: (() => void)[] = [];

    // --- Dynamic KPIs based on date range ---
    const newInstructorsQuery = query(collection(db, 'users'), where('role', '==', 'instructor'), where('createdAt', '>=', startDate), where('createdAt', '<=', endDate));
    unsubscribes.push(onSnapshot(newInstructorsQuery, s => setStats(p => ({ ...p, newInstructors: s.size }))));
    
    const newStudentsQuery = query(collection(db, 'users'), where('role', '==', 'student'), where('createdAt', '>=', startDate), where('createdAt', '<=', endDate));
    unsubscribes.push(onSnapshot(newStudentsQuery, s => setStats(p => ({ ...p, newStudents: s.size }))));
    
    const paymentsQuery = query(collection(db, 'payments'), where('status', '==', 'Completed'), where('date', '>=', startDate), where('date', '<=', endDate));
    unsubscribes.push(onSnapshot(paymentsQuery, s => {
        const periodTotal = s.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        setStats(p => ({ ...p, periodRevenue: periodTotal }));
    }));

    // --- Global KPIs (not date-dependent) ---
    const publishedCoursesQuery = query(collection(db, 'courses'), where('status', '==', 'Published'));
    unsubscribes.push(onSnapshot(publishedCoursesQuery, s => setStats(p => ({ ...p, publishedCourses: s.size }))));
    
    const enrollmentsQuery = query(collection(db, 'enrollments'));
    unsubscribes.push(onSnapshot(enrollmentsQuery, s => {
        if(s.empty) { setStats(prev => ({ ...prev, avgCompletionRate: 0 })); return; }
        const totalProgress = s.docs.reduce((acc, doc) => acc + (doc.data().progress || 0), 0);
        setStats(prev => ({ ...prev, avgCompletionRate: totalProgress / s.size }));
    }));


    // --- Charts & Tables Data ---

    // Revenue Trend (still monthly, but data is from all time to show context)
    const allTimePaymentsQuery = query(collection(db, 'payments'), where('status', '==', 'Completed'), orderBy('date', 'desc'));
    unsubscribes.push(onSnapshot(allTimePaymentsQuery, s => {
        const monthlyAggregates: Record<string, number> = {};
        s.docs.forEach(doc => {
            const p = doc.data();
            if (p.date instanceof Timestamp) {
                const d = p.date.toDate();
                const mKey = format(d, 'MMM yy', { locale: fr });
                monthlyAggregates[mKey] = (monthlyAggregates[mKey] || 0) + (p.amount || 0);
            }
        });
        const trendData = Object.entries(monthlyAggregates).map(([month, revenue]) => ({ month, revenue })).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());
        setRevenueTrendData(trendData);
    }));

    // Top Courses within date range
    const topCoursesEnrollmentsQuery = query(collection(db, 'enrollments'), where('enrollmentDate', '>=', startDate), where('enrollmentDate', '<=', endDate));
    unsubscribes.push(onSnapshot(topCoursesEnrollmentsQuery, async (snapshot) => {
        if (snapshot.empty) { setTopCourses([]); return; }
        const enrollmentCounts: Record<string, { paid: number, granted: number, total: number }> = {};
        snapshot.docs.forEach(doc => {
            const enrollment = doc.data() as Enrollment;
            const courseId = enrollment.courseId;
            if (!enrollmentCounts[courseId]) {
                enrollmentCounts[courseId] = { paid: 0, granted: 0, total: 0 };
            }
            if (enrollment.enrollmentType === 'admin_grant') {
                enrollmentCounts[courseId].granted++;
            } else {
                enrollmentCounts[courseId].paid++;
            }
            enrollmentCounts[courseId].total++;
        });

        const sortedCourseIds = Object.keys(enrollmentCounts).sort((a, b) => enrollmentCounts[b].total - enrollmentCounts[a].total).slice(0, 5);
        
        if (sortedCourseIds.length > 0) {
             const coursesSnap = await getDocs(query(collection(db, 'courses'), where('__name__', 'in', sortedCourseIds)));
             const coursesData: Record<string, string> = {};
             coursesSnap.forEach(d => coursesData[d.id] = d.data().title);
             setTopCourses(sortedCourseIds.map(id => ({ 
                id, 
                title: coursesData[id] || 'Inconnu', 
                paidCount: enrollmentCounts[id].paid,
                grantedCount: enrollmentCounts[id].granted,
                totalCount: enrollmentCounts[id].total,
             })));
        } else {
            setTopCourses([]);
        }
    }));
    
    // User growth chart data for the selected period
    const allNewUsersQuery = query(collection(db, 'users'), where('createdAt', '>=', startDate), where('createdAt', '<=', endDate));
    unsubscribes.push(onSnapshot(allNewUsersQuery, snapshot => {
        const dailyCounts: Record<string, { etudiants: number, formateurs: number }> = {};
        const dateArray = eachDayOfInterval({ start: startDate.toDate(), end: endDate.toDate() });
        dateArray.forEach(d => { dailyCounts[format(d, 'dd MMM', { locale: fr })] = { etudiants: 0, formateurs: 0 }});

        snapshot.docs.forEach(doc => {
            const user = doc.data();
            if (user.createdAt instanceof Timestamp) {
                const dateKey = format(user.createdAt.toDate(), 'dd MMM', { locale: fr });
                if (dailyCounts[dateKey]) {
                    if (user.role === 'instructor') dailyCounts[dateKey].formateurs++;
                    else dailyCounts[dateKey].etudiants++;
                }
            }
        });
        const growthData = Object.entries(dailyCounts).map(([date, counts]) => ({ date, ...counts }));
        setUserGrowthData(growthData);
        setIsLoading(false);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [currentUser, db, date]);


  if (!isUserLoading && currentUser?.role !== 'admin') {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
             <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Accès Interdit</h1>
            <p className="text-muted-foreground">Vous n'avez pas les autorisations nécessaires.</p>
        </div>
    )
  }

  const chartConfig = { revenue: { label: "Revenus", color: "hsl(var(--primary))" } };
  const userChartConfig = {
    etudiants: { label: "Étudiants", color: "hsl(var(--primary))" },
    formateurs: { label: "Formateurs", color: "hsl(var(--muted-foreground))" },
  }

  const statCards = [
    { title: "Revenus (Période)", value: `${stats.periodRevenue?.toLocaleString('fr-FR') ?? '...'} XOF`, icon: DollarSign },
    { title: "Nouveaux Étudiants", value: stats.newStudents?.toLocaleString('fr-FR') ?? '...', icon: UserPlus },
    { title: "Nouveaux Formateurs", value: stats.newInstructors?.toLocaleString('fr-FR') ?? '...', icon: UserPlus },
    { title: "Taux de Complétion Moyen", value: stats.avgCompletionRate !== null ? `${Math.round(stats.avgCompletionRate)}%` : '...', icon: CheckCircle },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Vue d'ensemble</h2>
        <DatePickerWithRange date={date} setDate={setDate} />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(card => (
            <StatCard key={card.title} title={card.title} value={card.value} icon={card.icon} isLoading={isLoading} />
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
                          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.slice(0, 3)} className="fill-muted-foreground text-xs" />
                          <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${Number(value) / 1000}k`} className="fill-muted-foreground text-xs" />
                          <Tooltip cursor={false} content={<ChartTooltipContent formatter={(value) => `${(value as number).toLocaleString('fr-FR')} XOF`} className="bg-background/80 backdrop-blur-sm" />} />
                          <Area dataKey="revenue" type="natural" fill="url(#fillRevenue)" stroke="var(--color-revenue)" stackId="a" />
                          </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-white dark:bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>Top des cours (période)</CardTitle>
                    <CardDescription>Les cours avec le plus d'inscriptions sur la période sélectionnée.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Cours</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Payées</TableHead><TableHead className="text-right">Offertes</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => <TableRow key={i}><TableCell><Skeleton className="h-5 w-full" /></TableCell><TableCell><Skeleton className="h-5 w-10 ml-auto" /></TableCell><TableCell><Skeleton className="h-5 w-10 ml-auto" /></TableCell><TableCell><Skeleton className="h-5 w-10 ml-auto" /></TableCell></TableRow>)
                        ) : topCourses.length > 0 ? (
                            topCourses.map((course) => <TableRow key={course.id}><TableCell className="font-medium truncate max-w-[200px]">{course.title}</TableCell><TableCell className="text-right font-bold">{course.totalCount}</TableCell><TableCell className="text-right text-green-400">{course.paidCount}</TableCell><TableCell className="text-right text-amber-400">{course.grantedCount}</TableCell></TableRow>)
                        ) : <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Aucune inscription sur cette période.</TableCell></TableRow> }
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
      </div>

       <Card className="lg:col-span-3 bg-white dark:bg-card shadow-sm">
            <CardHeader>
                <CardTitle>Nouveaux utilisateurs (période)</CardTitle>
                <CardDescription>Évolution journalière des inscriptions sur la période sélectionnée.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ChartContainer config={userChartConfig} className="h-80 w-full">
                    <ResponsiveContainer>
                        <BarChart data={userGrowthData}>
                            <CartesianGrid vertical={false} className="stroke-border/50" />
                            <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} className="fill-muted-foreground text-xs" interval={Math.max(0, Math.floor(userGrowthData.length / 7) - 1)} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} className="fill-muted-foreground text-xs" />
                            <Tooltip cursor={false} content={<ChartTooltipContent className="bg-background/80 backdrop-blur-sm" />} />
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
    return (
         <div className="space-y-8 max-w-7xl mx-auto">
              <header>
                <h1 className="text-3xl font-bold dark:text-white">Statistiques</h1>
                <p className="text-muted-foreground dark:text-slate-400">Analyse de la performance de la plateforme.</p>
            </header>
            <StatsDashboard />
        </div>
    )
}
