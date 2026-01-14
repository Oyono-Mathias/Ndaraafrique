
'use client';

import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, onSnapshot, Timestamp, getDocs } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, CartesianGrid, XAxis, YAxis, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Star, BookOpen, DollarSign, TrendingUp, ShieldAlert } from 'lucide-react';
import type { Course, Review, Enrollment } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface RevenueDataPoint {
    month: string;
    revenue: number;
}

const StatCard = ({ title, value, icon: Icon, isLoading, change, accentColor }: { title: string, value: string, icon: React.ElementType, isLoading: boolean, change?: string, accentColor?: string }) => (
    <div className={cn("bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 group", accentColor)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
            <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
            <Icon className="h-5 w-5 text-slate-500" />
        </CardHeader>
        <CardContent className="p-0">
            {isLoading ? (
                <Skeleton className="h-10 w-3/4 mt-2 bg-slate-700" />
            ) : (
                <>
                    <div className="text-3xl font-bold text-white mt-1">{value}</div>
                    {change && <p className="text-xs text-muted-foreground pt-1">{change}</p>}
                </>
            )}
        </CardContent>
    </div>
);


export default function AdminStatisticsPage() {
    const { t } = useTranslation();
    const { formaAfriqueUser, isUserLoading } = useRole();
    const db = getFirestore();

    const [stats, setStats] = useState({
        userCount: 0,
        courseCount: 0,
        monthlyRevenue: 0,
    });
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [revenueTrendData, setRevenueTrendData] = useState<RevenueDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isUserLoading || formaAfriqueUser?.role !== 'admin') {
            if (!isUserLoading) setIsLoading(false);
            return;
        };

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
                const coursesQuery = query(collection(db, 'courses'), where('status', '==', 'Published'));
                const startOfMonthTimestamp = Timestamp.fromDate(startOfMonth(new Date()));
                const paymentsQuery = query(collection(db, 'payments'), where('status', '==', 'Completed'));
                
                const [studentsSnap, coursesSnap, paymentsSnap] = await Promise.all([
                    getDocs(studentsQuery),
                    getDocs(coursesQuery),
                    getDocs(paymentsQuery)
                ]);

                // User Count
                setStats(prev => ({ ...prev, userCount: studentsSnap.size }));

                // Course Data
                const courseList = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
                setCourses(courseList);
                setStats(prev => ({ ...prev, courseCount: courseList.length }));

                // Enrollments for top courses
                const courseIds = courseList.map(c => c.id);
                if (courseIds.length > 0) {
                     const enrollmentsQuery = query(collection(db, 'enrollments'), where('courseId', 'in', courseIds.slice(0,30)));
                     const enrollmentSnapshot = await getDocs(enrollmentsQuery);
                     setEnrollments(enrollmentSnapshot.docs.map(doc => doc.data() as Enrollment));
                }

                // Revenue Data
                let monthlyTotal = 0;
                const monthlyAggregates: Record<string, number> = {};

                paymentsSnap.docs.forEach(doc => {
                    const payment = doc.data();
                    if (payment.date instanceof Timestamp) {
                        const paymentDate = payment.date.toDate();
                        if (paymentDate >= startOfMonthTimestamp.toDate()) {
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

            } catch (e) {
                console.error("Error fetching admin stats", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [db, isUserLoading, formaAfriqueUser]);

    const topCourses = useMemo(() => {
        const courseEnrollmentCounts = enrollments.reduce((acc, enrollment) => {
            acc[enrollment.courseId] = (acc[enrollment.courseId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return courses
            .map(course => ({
                ...course,
                enrollmentCount: courseEnrollmentCounts[course.id] || 0,
            }))
            .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
            .slice(0, 5);
    }, [courses, enrollments]);

    const chartConfig = {
        revenue: { label: 'Revenus', color: 'hsl(var(--primary))' },
    };
    
    if (isUserLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (formaAfriqueUser?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
                <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">Accès Interdit</h1>
                <p className="text-muted-foreground">Vous n'avez pas les autorisations nécessaires pour accéder à cette page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <header>
                <h1 className="text-3xl font-bold dark:text-white">{t('navStatistics')}</h1>
                <p className="text-muted-foreground dark:text-slate-400">{t('stats_description')}</p>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title={t('total_students')} value={stats.userCount.toLocaleString('fr-FR')} icon={Users} isLoading={isLoading} />
                <StatCard title={t('monthly_revenue')} value={`${stats.monthlyRevenue.toLocaleString('fr-FR')} XOF`} icon={DollarSign} isLoading={isLoading} />
                <StatCard title={t('active_courses')} value={stats.courseCount.toLocaleString('fr-FR')} icon={BookOpen} isLoading={isLoading} />
            </section>

            <section className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                     <h2 className="text-2xl font-bold text-white mb-4">Évolution des revenus</h2>
                     <div className="h-[450px] bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4">
                        {isLoading ? <Skeleton className="h-full w-full bg-slate-800" /> : (
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={revenueTrendData}
                                    margin={{ left: 12, right: 12, top: 10, bottom: 10 }}
                                >
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-700/60" />
                                    <XAxis
                                        dataKey="month"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => value.slice(0, 3)}
                                        className="fill-slate-500 text-xs"
                                    />
                                    <YAxis 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickMargin={8} 
                                        tickFormatter={(value) => `${Number(value) / 1000}k`}
                                        className="fill-slate-500 text-xs"
                                    />
                                    <Tooltip
                                        cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        content={<ChartTooltipContent 
                                            formatter={(value) => `${(value as number).toLocaleString('fr-FR')} XOF`}
                                            className="bg-slate-900/80 backdrop-blur-sm border-slate-700 text-white" 
                                        />}
                                    />
                                    <defs>
                                        <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        dataKey="revenue"
                                        type="natural"
                                        fill="url(#fillRevenue)"
                                        stroke="hsl(var(--primary))"
                                        stackId="a"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
                <div className="space-y-6">
                     <h2 className="text-2xl font-bold text-white mb-4">Top des cours</h2>
                      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-slate-800">
                                    <TableHead className="w-12 text-slate-400">Rang</TableHead>
                                    <TableHead className="text-slate-400">Titre du cours</TableHead>
                                    <TableHead className="text-right text-slate-400">Ventes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? [...Array(5)].map((_, i) => (
                                    <TableRow key={i} className="border-0">
                                        <TableCell><Skeleton className="h-5 w-5 rounded-full bg-slate-700" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-full bg-slate-700" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-10 bg-slate-700" /></TableCell>
                                    </TableRow>
                                )) : topCourses.map((course, index) => (
                                    <TableRow key={course.id} className="border-b-slate-800/50 font-medium hover:bg-slate-800/40">
                                        <TableCell className="font-bold text-slate-500">{index + 1}</TableCell>
                                        <TableCell className="text-slate-200">{course.title}</TableCell>
                                        <TableCell className="text-right font-mono text-white">{course.enrollmentCount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                      </div>
                </div>
            </section>
        </div>
    );
}
