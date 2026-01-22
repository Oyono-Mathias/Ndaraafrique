
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { StatCard } from '@/components/dashboard/StatCard';
import { Users, BookOpen, DollarSign, Briefcase, TrendingUp } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { subDays, format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, NdaraUser, Course, Enrollment } from '@/lib/types';
import { EmptyState } from '@/components/dashboard/EmptyState';

// Define a color palette for charts
const COLORS = ["#10b981", "#3b82f6", "#f97316", "#ec4899", "#8b5cf6", "#f59e0b"];

interface ChartData {
    name: string;
    value: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {label}
            </span>
            <span className="font-bold text-muted-foreground">
              {payload[0].name}
            </span>
          </div>
          <div className="flex flex-col space-y-1">
             <span className="text-[0.70rem] uppercase text-muted-foreground">
              Valeur
            </span>
            <span className="font-bold">
              {payload[0].value.toLocaleString('fr-FR')}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};


export default function AdminStatsPage() {
    const [stats, setStats] = useState({ totalRevenue: 0, totalUsers: 0, totalInstructors: 0, totalCourses: 0 });
    const [revenueData, setRevenueData] = useState<ChartData[]>([]);
    const [userGrowthData, setUserGrowthData] = useState<ChartData[]>([]);
    const [topCoursesData, setTopCoursesData] = useState<ChartData[]>([]);
    const [categoryData, setCategoryData] = useState<ChartData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 89), to: new Date() });
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const db = getFirestore();

            const from = dateRange?.from || new Date(0);
            const to = dateRange?.to || new Date();

            const usersSnap = await getDocs(collection(db, 'users'));
            const coursesSnap = await getDocs(collection(db, 'courses'));
            const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('status', '==', 'Completed')));
            const enrollmentsSnap = await getDocs(collection(db, 'enrollments'));

            const allUsers = usersSnap.docs.map(doc => doc.data() as NdaraUser);
            const allCourses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            const allPayments = paymentsSnap.docs.map(doc => doc.data() as Payment);
            const allEnrollments = enrollmentsSnap.docs.map(doc => doc.data() as Enrollment);
            
            const coursesMap = new Map(allCourses.map(c => [c.id, c]));

            const filteredPayments = allPayments.filter(p => {
                const paymentDate = (p.date as Timestamp).toDate();
                return paymentDate >= from && paymentDate <= to;
            });

            // 1. Calculate Key Stats
            const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
            setStats({
                totalRevenue: totalRevenue,
                totalUsers: allUsers.length,
                totalInstructors: allUsers.filter(u => u.role === 'instructor').length,
                totalCourses: allCourses.length
            });

            // 2. Process Revenue Chart Data (group by month)
            const monthlyRevenue: { [key: string]: number } = {};
            filteredPayments.forEach(p => {
                const month = format((p.date as Timestamp).toDate(), 'MMM yy', { locale: fr });
                monthlyRevenue[month] = (monthlyRevenue[month] || 0) + p.amount;
            });
            const revenueChartData = Object.keys(monthlyRevenue).map(month => ({ name: month, value: monthlyRevenue[month] }));
            setRevenueData(revenueChartData);

            // 3. Process User Growth Chart Data
            const monthlySignups: { [key: string]: number } = {};
            allUsers.filter(u => u.createdAt).forEach(u => {
                const month = format((u.createdAt as Timestamp).toDate(), 'yyyy-MM');
                monthlySignups[month] = (monthlySignups[month] || 0) + 1;
            });
            
            let cumulativeUsers = 0;
            const userGrowthChartData = Object.keys(monthlySignups).sort().map(month => {
                cumulativeUsers += monthlySignups[month];
                return { name: format(new Date(month), 'MMM yy', { locale: fr }), value: cumulativeUsers };
            });
            setUserGrowthData(userGrowthChartData);
            
            // 4. Process Top Courses by Revenue
            const courseRevenue: { [key: string]: number } = {};
            filteredPayments.forEach(p => {
                const course = coursesMap.get(p.courseId);
                if (course) {
                    courseRevenue[course.title] = (courseRevenue[course.title] || 0) + p.amount;
                }
            });
            const topCourses = Object.entries(courseRevenue)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, value]) => ({ name, value }));
            setTopCoursesData(topCourses);

            // 5. Process Enrollments by Category
            const enrollmentsByCategory: { [key: string]: number } = {};
            allEnrollments.forEach(e => {
                const course = coursesMap.get(e.courseId);
                if (course) {
                    const category = course.category || 'Non classé';
                    enrollmentsByCategory[category] = (enrollmentsByCategory[category] || 0) + 1;
                }
            });
            const categoryChartData = Object.entries(enrollmentsByCategory).map(([name, value]) => ({ name, value }));
            setCategoryData(categoryChartData);

            setIsLoading(false);
        };
        fetchData().catch(console.error);
    }, [dateRange]);
    
    const chartConfig = { value: { label: 'Valeur', color: 'hsl(var(--primary))' } };

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Statistiques</h1>
                    <p className="text-muted-foreground">Analyse des performances de la plateforme.</p>
                </div>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard title="Chiffre d'affaires total" value={`${stats.totalRevenue.toLocaleString('fr-FR')} XOF`} icon={DollarSign} isLoading={isLoading} description="Sur la période sélectionnée" />
                <StatCard title="Utilisateurs" value={stats.totalUsers.toLocaleString('fr-FR')} icon={Users} isLoading={isLoading} />
                <StatCard title="Instructeurs" value={stats.totalInstructors.toLocaleString('fr-FR')} icon={Briefcase} isLoading={isLoading} />
                <StatCard title="Cours" value={stats.totalCourses.toLocaleString('fr-FR')} icon={BookOpen} isLoading={isLoading} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                    <CardHeader><CardTitle>Évolution des revenus</CardTitle></CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-72 w-full" /> : revenueData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-72 w-full">
                                <BarChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="dark:stroke-slate-700" />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} className="text-xs dark:fill-slate-400" />
                                    <YAxis tickFormatter={(v) => `${Number(v) / 1000}k`} className="text-xs dark:fill-slate-400" />
                                    <Tooltip content={<ChartTooltipContent formatter={(v) => `${(v as number).toLocaleString('fr-FR')} XOF`} />} cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}/>
                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        ) : <EmptyState icon={TrendingUp} title="Aucune donnée de revenus" description="Les ventes apparaîtront ici." />}
                    </CardContent>
                </Card>
                 <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                    <CardHeader><CardTitle>Croissance des utilisateurs</CardTitle></CardHeader>
                    <CardContent>
                         {isLoading ? <Skeleton className="h-72 w-full" /> : userGrowthData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-72 w-full">
                                <LineChart data={userGrowthData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="dark:stroke-slate-700" />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} className="text-xs dark:fill-slate-400" />
                                    <YAxis className="text-xs dark:fill-slate-400"/>
                                    <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}/>
                                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ChartContainer>
                        ) : <EmptyState icon={Users} title="Aucun utilisateur" description="Les nouveaux inscrits apparaîtront ici." />}
                    </CardContent>
                </Card>
                 <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                    <CardHeader><CardTitle>Top 5 des cours par revenus</CardTitle><CardDescription>Sur la période sélectionnée</CardDescription></CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-72 w-full" /> : topCoursesData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-72 w-full">
                                <BarChart data={topCoursesData} layout="vertical" margin={{ left: 50 }}>
                                    <CartesianGrid horizontal={false} className="dark:stroke-slate-700" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={10} className="text-xs dark:fill-slate-400 w-20 truncate" width={120} />
                                    <Tooltip content={<ChartTooltipContent formatter={(v) => `${(v as number).toLocaleString('fr-FR')} XOF`} />} cursor={{ fill: 'hsl(var(--accent) / 0.2)' }} />
                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} layout="vertical" />
                                </BarChart>
                            </ChartContainer>
                        ) : <EmptyState icon={DollarSign} title="Aucun revenu de cours" description="Les cours les plus rentables apparaîtront ici."/>}
                    </CardContent>
                </Card>
                 <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                    <CardHeader><CardTitle>Inscriptions par catégorie</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-center">
                        {isLoading ? <Skeleton className="h-72 w-full" /> : categoryData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-72 w-full aspect-square">
                                <PieChart>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ChartContainer>
                        ) : <EmptyState icon={BookOpen} title="Aucune inscription" description="La répartition des cours par catégorie apparaîtra ici."/>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

