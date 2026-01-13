
'use client';

import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, onSnapshot, Timestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, CartesianGrid, XAxis, YAxis, Area, Tooltip } from 'recharts';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Star, BookOpen, DollarSign, TrendingUp } from 'lucide-react';
import type { Course, Review, Enrollment } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

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
        setIsLoading(true);
        const unsubs: (()=>void)[] = [];

        // Listener for total users
        unsubs.push(onSnapshot(collection(db, 'users'), (snapshot) => {
            setStats(prev => ({ ...prev, userCount: snapshot.size }));
        }));

        // Listener for published courses
        unsubs.push(onSnapshot(query(collection(db, 'courses'), where('status', '==', 'Published')), (snapshot) => {
            const courseList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(courseList);
            setStats(prev => ({ ...prev, courseCount: courseList.length }));

            const courseIds = courseList.map(c => c.id);
            if (courseIds.length === 0) {
                 setEnrollments([]);
                 return;
            }
             const enrollmentsQuery = query(collection(db, 'enrollments'), where('courseId', 'in', courseIds.slice(0,30)));
             const unsubEnrollments = onSnapshot(enrollmentsQuery, (enrollmentSnapshot) => {
                 setEnrollments(enrollmentSnapshot.docs.map(doc => doc.data() as Enrollment));
             });
             unsubs.push(unsubEnrollments);
        }));

        // Listener for payments to calculate revenue
        unsubs.push(onSnapshot(query(collection(db, 'payments'), where('status', '==', 'Completed')), (snapshot) => {
            const now = new Date();
            const startOfCurrentMonth = startOfMonth(now);
            
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

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, [db, isLoading]);

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
                            <ChartContainer config={chartConfig} className="w-full h-full">
                                <AreaChart
                                    accessibilityLayer
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
                            </ChartContainer>
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

