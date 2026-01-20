
'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Star, DollarSign, CheckCircle, UserPlus, Calendar as CalendarIcon, Gift, ShieldAlert, Eye, MousePointerClick, Percent, BookOpen } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import {
  collection,
  query,
  where,
  getFirestore,
  Timestamp,
  getDocs,
  doc,
  orderBy,
  limit
} from 'firebase/firestore';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AreaChart, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, ResponsiveContainer, Bar } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Course, Enrollment, Payment } from '@/lib/types';
import { format, startOfMonth, subDays, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";

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

const StatsDashboard = () => {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();

  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const [stats, setStats] = useState({
    visits: 0,
    ctaClicks: 0,
    newUsers: 0,
    periodRevenue: 0,
    avgCompletionRate: 0,
    newInstructors: 0,
  });

  const [topCourses, setTopCourses] = useState<any[]>([]);
  const [acquisitionChartData, setAcquisitionChartData] = useState<any[]>([]);
  const [revenueTrendData, setRevenueTrendData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin' || !date?.from || !date?.to) {
        setIsLoading(isUserLoading);
        return;
    }
    
    const fetchData = async () => {
        setIsLoading(true);
        const startDate = Timestamp.fromDate(date.from!);
        const endDate = Timestamp.fromDate(date.to!);
        
        try {
            const [
                trackingSnap, 
                usersSnap,
                paymentsSnap,
                allTimePaymentsSnap,
                enrollmentsSnap,
                allEnrollmentsSnap
            ] = await Promise.all([
                getDocs(query(collection(db, 'tracking_events'), where('timestamp', '>=', startDate), where('timestamp', '<=', endDate))),
                getDocs(query(collection(db, 'users'), where('createdAt', '>=', startDate), where('createdAt', '<=', endDate))),
                getDocs(query(collection(db, 'payments'), where('status', '==', 'Completed'), where('date', '>=', startDate), where('date', '<=', endDate))),
                getDocs(query(collection(db, 'payments'), where('status', '==', 'Completed'), orderBy('date', 'desc'))),
                getDocs(query(collection(db, 'enrollments'), where('enrollmentDate', '>=', startDate), where('enrollmentDate', '<=', endDate))),
                getDocs(query(collection(db, 'enrollments'))),
            ]);
            
            // Process stats
            const events = trackingSnap.docs.map(d => d.data());
            const newUsers = usersSnap.size;
            const newInstructors = usersSnap.docs.filter(d => d.data().role === 'instructor').length;
            const periodRevenue = paymentsSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
            const totalProgress = allEnrollmentsSnap.docs.reduce((acc, doc) => acc + (doc.data().progress || 0), 0);
            setStats({
                visits: events.filter(e => e.eventType === 'page_view').length,
                ctaClicks: events.filter(e => e.eventType === 'cta_click').length,
                newUsers: newUsers,
                periodRevenue: periodRevenue,
                avgCompletionRate: allEnrollmentsSnap.empty ? 0 : totalProgress / allEnrollmentsSnap.size,
                newInstructors: newInstructors
            });
            
            // Process charts and tables
            // Revenue Trend
            const monthlyAggregates: Record<string, number> = {};
            allTimePaymentsSnap.docs.forEach(doc => {
                const p = doc.data();
                if (p.date instanceof Timestamp) {
                    const d = p.date.toDate();
                    const mKey = format(d, 'MMM yy', { locale: fr });
                    monthlyAggregates[mKey] = (monthlyAggregates[mKey] || 0) + (p.amount || 0);
                }
            });
            setRevenueTrendData(Object.entries(monthlyAggregates).map(([month, revenue]) => ({ month, revenue })).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime()));
            
            // Top Courses
            if (!enrollmentsSnap.empty) {
                const enrollmentCounts: Record<string, { total: number }> = {};
                enrollmentsSnap.docs.forEach(doc => {
                    const enrollment = doc.data() as Enrollment;
                    enrollmentCounts[enrollment.courseId] = { total: (enrollmentCounts[enrollment.courseId]?.total || 0) + 1 };
                });
                const sortedCourseIds = Object.keys(enrollmentCounts).sort((a, b) => enrollmentCounts[b].total - enrollmentCounts[a].total).slice(0, 5);
                if (sortedCourseIds.length > 0) {
                     const coursesSnap = await getDocs(query(collection(db, 'courses'), where('__name__', 'in', sortedCourseIds)));
                     const coursesData: Record<string, string> = {};
                     coursesSnap.forEach(d => coursesData[d.id] = d.data().title);
                     setTopCourses(sortedCourseIds.map(id => ({ id, title: coursesData[id] || 'Inconnu', totalCount: enrollmentCounts[id].total })));
                } else { setTopCourses([]); }
            } else { setTopCourses([]); }
            
            // Acquisition Chart
            const dailyData: { [key: string]: { visits: number, clicks: number, signups: number } } = {};
            const dateArray = eachDayOfInterval({ start: date.from!, end: date.to! });
            dateArray.forEach(d => {
                const dateKey = format(d, 'dd MMM', { locale: fr });
                dailyData[dateKey] = { visits: 0, clicks: 0, signups: 0 };
            });
            events.forEach(event => {
                const dateKey = format(event.timestamp.toDate(), 'dd MMM', { locale: fr });
                if (dailyData[dateKey]) {
                    if (event.eventType === 'page_view') dailyData[dateKey].visits++;
                    if (event.eventType === 'cta_click') dailyData[dateKey].clicks++;
                }
            });
            usersSnap.docs.forEach(d => {
                const dateKey = format(d.data().createdAt.toDate(), 'dd MMM', { locale: fr });
                if (dailyData[dateKey]) {
                    dailyData[dateKey].signups++;
                }
            });
            setAcquisitionChartData(Object.entries(dailyData).map(([date, data]) => ({ date, ...data })));

        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false);
        }
    }
    
    fetchData();
  }, [currentUser, db, date, isUserLoading]);

  const conversionRate = stats.visits > 0 ? ((stats.ctaClicks / stats.visits) * 100).toFixed(1) + '%' : '0%';
  const signupConversionRate = stats.ctaClicks > 0 ? ((stats.newUsers / stats.ctaClicks) * 100).toFixed(1) + '%' : '0%';

  const revenueChartConfig = { revenue: { label: "Revenus", color: "hsl(var(--primary))" } };
  const acquisitionChartConfig = {
    visits: { label: "Visites", color: "hsl(var(--primary))" },
    clicks: { label: "Clics CTA", color: "hsl(var(--secondary))" },
    signups: { label: "Inscriptions", color: "hsl(var(--destructive))" },
  };

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h2 className="text-xl font-semibold text-white">Performances de la Plateforme</h2>
            <DatePickerWithRange date={date} setDate={setDate} />
        </div>

        <section>
            <h3 className="text-lg font-semibold mb-4 text-white">Acquisition (Période)</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Visites de la page" value={stats.visits.toLocaleString()} icon={Eye} isLoading={isLoading} />
                <StatCard title="Clics sur CTA" value={stats.ctaClicks.toLocaleString()} icon={MousePointerClick} isLoading={isLoading} />
                <StatCard title="Taux de Conversion (Visite → Clic)" value={conversionRate} icon={Percent} isLoading={isLoading} />
                <StatCard title="Nouveaux Utilisateurs" value={stats.newUsers.toLocaleString()} icon={UserPlus} isLoading={isLoading} description={`Conv. (Clic → Inscription): ${signupConversionRate}`} />
            </div>
             <Card className="mt-6 bg-white dark:bg-card shadow-sm">
                <CardHeader><CardTitle>Tunnel d'acquisition par jour</CardTitle></CardHeader>
                <CardContent className="pl-2">
                    <ChartContainer config={acquisitionChartConfig} className="h-72 w-full">
                         <ResponsiveContainer>
                            <BarChart data={acquisitionChartData}>
                                <CartesianGrid vertical={false} className="dark:stroke-slate-700"/>
                                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} className="dark:fill-slate-400 text-xs" />
                                <YAxis allowDecimals={false} className="dark:fill-slate-400 text-xs"/>
                                <Tooltip content={<ChartTooltipContent className="dark:bg-slate-900 dark:border-slate-700" />} />
                                <Bar dataKey="visits" fill="var(--color-visits)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="clicks" fill="var(--color-clicks)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="signups" fill="var(--color-signups)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </section>

        <section>
            <h3 className="text-lg font-semibold mb-4 text-white">Revenus</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Revenus (Période)" value={`${stats.periodRevenue?.toLocaleString('fr-FR') ?? '...'} XOF`} icon={DollarSign} isLoading={isLoading} />
                 <StatCard title="Nouveaux Formateurs" value={stats.newInstructors?.toLocaleString('fr-FR') ?? '...'} icon={UserPlus} isLoading={isLoading} />
            </div>
             <Card className="mt-6 bg-white dark:bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>Évolution des revenus mensuels</CardTitle>
                    <CardDescription>Revenus bruts générés sur les derniers mois.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ChartContainer config={revenueChartConfig} className="h-80 w-full">
                      <ResponsiveContainer>
                          <AreaChart data={revenueTrendData}>
                          <defs><linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} /><stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} /></linearGradient></defs>
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
        </section>
        
        <section>
             <h3 className="text-lg font-semibold mb-4 text-white">Engagement</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Taux de Complétion Moyen" value={stats.avgCompletionRate !== null ? `${Math.round(stats.avgCompletionRate)}%` : '...'} icon={CheckCircle} isLoading={isLoading} description="Moyenne globale" />
            </div>
            <Card className="mt-6 bg-white dark:bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>Top des cours (période)</CardTitle>
                    <CardDescription>Les cours avec le plus d'inscriptions sur la période sélectionnée.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Cours</TableHead><TableHead className="text-right">Inscriptions</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => <TableRow key={i}><TableCell><Skeleton className="h-5 w-full" /></TableCell><TableCell><Skeleton className="h-5 w-10 ml-auto" /></TableCell></TableRow>)
                        ) : topCourses.length > 0 ? (
                            topCourses.map((course) => <TableRow key={course.id}><TableCell className="font-medium truncate max-w-[200px]">{course.title}</TableCell><TableCell className="text-right font-bold">{course.totalCount}</TableCell></TableRow>)
                        ) : <TableRow><TableCell colSpan={2} className="h-24 text-center text-muted-foreground">Aucune inscription sur cette période.</TableCell></TableRow> }
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </section>

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
