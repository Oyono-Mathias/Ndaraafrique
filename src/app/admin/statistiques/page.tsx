
'use client';

import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, onSnapshot, Timestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, ResponsiveContainer } from 'recharts';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Star, BookOpen, DollarSign } from 'lucide-react';
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
    <Card className={cn("border-t-4 bg-slate-800/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10", accentColor)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-3/4 bg-slate-700" />
            ) : (
                <>
                    <div className="text-2xl font-bold text-white">{value}</div>
                    {change && <p className="text-xs text-muted-foreground dark:text-slate-500">{change}</p>}
                </>
            )}
        </CardContent>
    </Card>
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
                <StatCard title={t('total_students')} value={stats.userCount.toLocaleString('fr-FR')} icon={Users} isLoading={isLoading} accentColor="border-blue-500" />
                <StatCard title={t('monthly_revenue')} value={`${stats.monthlyRevenue.toLocaleString('fr-FR')} XOF`} icon={DollarSign} isLoading={isLoading} accentColor="border-green-500" />
                <StatCard title={t('active_courses')} value={stats.courseCount.toLocaleString('fr-FR')} icon={BookOpen} isLoading={isLoading} accentColor="border-purple-500" />
            </section>

            <section className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-semibold mb-4 dark:text-white">{t('revenue_trend')}</h2>
                    <Card className="dark:bg-[#1e293b] dark:border-slate-700">
                        <CardContent className="pt-6">
                            {isLoading ? <Skeleton className="h-72 w-full dark:bg-slate-700" /> : (
                                <ChartContainer config={chartConfig} className="h-72 w-full">
                                    <ResponsiveContainer>
                                        <BarChart data={revenueTrendData}>
                                            <CartesianGrid vertical={false} className="dark:stroke-slate-700" />
                                            <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} className="dark:fill-slate-400" />
                                            <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} className="dark:fill-slate-400" />
                                            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toLocaleString('fr-FR')} XOF`} className="dark:bg-slate-900 dark:border-slate-700" />} />
                                            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={8} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div>
                     <h2 className="text-2xl font-semibold mb-4 dark:text-white">{t('top_courses')}</h2>
                      <Card className="dark:bg-[#1e293b] dark:border-slate-700">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="dark:border-slate-700">
                                        <TableHead className="dark:text-slate-400">Cours</TableHead>
                                        <TableHead className="text-right dark:text-slate-400">Inscriptions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? [...Array(5)].map((_, i) => (
                                        <TableRow key={i} className="dark:border-slate-700">
                                            <TableCell><Skeleton className="h-5 w-32 dark:bg-slate-700" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-10 dark:bg-slate-700" /></TableCell>
                                        </TableRow>
                                    )) : topCourses.map(course => (
                                        <TableRow key={course.id} className="dark:border-slate-700 dark:hover:bg-slate-700/50">
                                            <TableCell className="font-medium truncate max-w-xs dark:text-slate-200">{course.title}</TableCell>
                                            <TableCell className="text-right font-bold dark:text-white">{course.enrollmentCount}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                      </Card>
                </div>
            </section>
        </div>
    );
}
