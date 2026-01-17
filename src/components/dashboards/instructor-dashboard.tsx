

'use client';

import { useRole } from '@/context/RoleContext';
import { useTranslations } from 'next-intl';
import { collection, query, where, getFirestore, onSnapshot, Timestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, ResponsiveContainer, Tooltip } from 'recharts';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { Users, Star, BookOpen, DollarSign, TrendingUp, Book, AlertCircle } from 'lucide-react';
import type { Course, Review, Enrollment } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { StatCard } from '@/components/dashboard/StatCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface RevenueDataPoint {
    month: string;
    revenue: number;
}

function InstructorDashboardContent() {
    const { currentUser: instructor, isUserLoading: roleLoading } = useRole();
    const t = useTranslations();
    const db = getFirestore();

    const [stats, setStats] = useState({
        totalStudents: 0,
        averageRating: 0,
        totalReviews: 0,
        publishedCourses: 0,
        monthlyRevenue: 0,
    });
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [revenueTrendData, setRevenueTrendData] = useState<RevenueDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!instructor?.uid || roleLoading) {
            if (!roleLoading) setIsLoading(false);
            return () => {};
        }

        setIsLoading(true);
        const instructorId = instructor.uid;
        const unsubs: (()=>void)[] = [];

        const coursesQuery = query(collection(db, 'courses'), where('instructorId', '==', instructorId));
        const unsubCourses = onSnapshot(coursesQuery, (coursesSnapshot) => {
            const courseList = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(courseList);
            setStats(prev => ({ ...prev, publishedCourses: courseList.filter(c => c.status === 'Published').length }));

            const courseIds = courseList.map(c => c.id);
            if (courseIds.length === 0) {
                 setIsLoading(false);
                 setEnrollments([]);
                 setStats(prev => ({ ...prev, totalStudents: 0, totalReviews: 0, averageRating: 0, monthlyRevenue: 0 }));
                 setRevenueTrendData([]);
                 return;
            }

            const courseIdChunks: string[][] = [];
            for (let i = 0; i < courseIds.length; i += 30) {
                courseIdChunks.push(courseIds.slice(i, i + 30));
            }

            courseIdChunks.forEach(chunk => {
                const reviewsQuery = query(collection(db, 'reviews'), where('courseId', 'in', chunk));
                const unsubReviews = onSnapshot(reviewsQuery, (reviewSnapshot) => {
                    const reviewList = reviewSnapshot.docs.map(doc => doc.data() as Review);
                    const totalRating = reviewList.reduce((acc, r) => acc + r.rating, 0);
                    setStats(prev => ({
                        ...prev,
                        totalReviews: reviewList.length,
                        averageRating: reviewList.length > 0 ? totalRating / reviewList.length : 0,
                    }));
                }, (e) => { setError("Impossible de charger les avis."); console.error(e); });
                unsubs.push(unsubReviews);

                const enrollmentsQuery = query(collection(db, 'enrollments'), where('courseId', 'in', chunk));
                const unsubEnrollments = onSnapshot(enrollmentsQuery, (enrollmentSnapshot) => {
                    const enrollmentList = enrollmentSnapshot.docs.map(doc => doc.data() as Enrollment);
                    setEnrollments(prev => [...prev.filter(e => !chunk.includes(e.courseId)), ...enrollmentList]);
                    const uniqueStudents = new Set(enrollmentList.map(e => e.studentId));
                    setStats(prev => ({ ...prev, totalStudents: uniqueStudents.size }));
                }, (e) => { setError("Impossible de charger les inscriptions."); console.error(e); });
                unsubs.push(unsubEnrollments);
            });


            const paymentsQuery = query(collection(db, 'payments'), where('instructorId', '==', instructorId));
            const unsubPayments = onSnapshot(paymentsQuery, (paymentSnapshot) => {
                const now = new Date();
                const startOfCurrentMonth = startOfMonth(now);
                
                const monthlyRev = paymentSnapshot.docs
                    .map(d => d.data())
                    .filter(p => p.date && p.date.toDate() >= startOfCurrentMonth)
                    .reduce((sum, p) => sum + (p.amount || 0), 0);

                const monthlyAggregates: Record<string, number> = {};
                paymentSnapshot.docs.forEach(doc => {
                    const payment = doc.data();
                    if (payment.date instanceof Timestamp) {
                        const date = payment.date.toDate();
                        const monthKey = format(date, 'MMM yy', { locale: fr });
                        monthlyAggregates[monthKey] = (monthlyAggregates[monthKey] || 0) + (payment.amount || 0);
                    }
                });

                const trendData = Object.entries(monthlyAggregates)
                    .map(([month, revenue]) => ({ month, revenue }))
                    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

                setRevenueTrendData(trendData);
                setStats(prev => ({ ...prev, monthlyRevenue: monthlyRev }));
                setIsLoading(false);
            }, (e) => { setError("Impossible de charger les données financières."); console.error(e); });
            unsubs.push(unsubPayments);

        }, (error) => {
            console.error("Error fetching courses:", error);
            setError("Impossible de charger les cours.");
            setIsLoading(false);
        });
        
        unsubs.push(unsubCourses);

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, [instructor?.uid, db, roleLoading]);

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
        revenue: { label: t('navFinance'), color: 'hsl(var(--primary))' },
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4 bg-red-900/10 border border-red-700/50 rounded-lg">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-white">Erreur de chargement</h1>
                <p className="text-red-300 mt-2">{error}</p>
                <p className="text-slate-400 mt-1 text-sm">Vérifiez les index Firestore ou contactez le support.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 md:space-y-12">
            <header>
                <h1 className="text-3xl font-bold text-white">{t('dashboard_title')}</h1>
                <p className="text-muted-foreground">{t('welcome_message', { name: instructor?.fullName?.split(' ')[0] || 'Instructeur' })}</p>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard 
                    title="Étudiants au total"
                    value={stats.totalStudents.toLocaleString('fr-FR')} 
                    icon={Users} 
                    isLoading={isLoading} 
                />
                <StatCard 
                    title="Note moyenne" 
                    value={stats.totalReviews > 0 ? stats.averageRating.toFixed(1) : "N/A"} 
                    icon={Star} 
                    isLoading={isLoading} 
                    description={stats.totalReviews > 0 ? `Basé sur ${stats.totalReviews} avis` : "En attente d'avis"}
                />
                <StatCard 
                    title="Cours publiés"
                    value={stats.publishedCourses.toString()} 
                    icon={BookOpen} 
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Revenus (ce mois-ci)"
                    value={`${stats.monthlyRevenue.toLocaleString('fr-FR')} XOF`} 
                    icon={DollarSign} 
                    isLoading={isLoading}
                />
            </section>

            <section className="grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <SectionHeader title={t('revenue_evolution_title')} className="mb-4" />
                    <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                        <CardContent className="pt-6">
                            {isLoading ? <Skeleton className="h-72 w-full bg-slate-700" /> : revenueTrendData.length > 0 ? (
                                <ChartContainer config={chartConfig} className="h-72 w-full">
                                    <ResponsiveContainer>
                                        <BarChart data={revenueTrendData}>
                                            <CartesianGrid vertical={false} className="dark:stroke-slate-700"/>
                                            <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} className="dark:fill-slate-400 text-xs" />
                                            <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} className="dark:fill-slate-400 text-xs"/>
                                            <Tooltip
                                                cursor={false}
                                                content={<ChartTooltipContent
                                                    indicator="dot"
                                                    className="dark:bg-slate-900 dark:border-slate-700"
                                                    formatter={(value) => `${(value as number).toLocaleString('fr-FR')} XOF`}
                                                />}
                                            />
                                            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={4} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            ) : (
                                <EmptyState 
                                    icon={TrendingUp}
                                    title="Graphique Indisponible"
                                    description="Les données sur vos revenus apparaîtront ici dès que vous réaliserez des ventes."
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                     <SectionHeader title={t('top_courses_title')} className="mb-4" />
                      <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
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
                                            <TableCell><Skeleton className="h-5 w-full dark:bg-slate-700" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-10 dark:bg-slate-700" /></TableCell>
                                        </TableRow>
                                    )) : topCourses.length > 0 ? (
                                      topCourses.map(course => (
                                        <TableRow key={course.id} className="dark:border-slate-700 dark:hover:bg-slate-700/50">
                                            <TableCell className="font-medium truncate max-w-[200px] text-sm text-slate-200">{course.title}</TableCell>
                                            <TableCell className="text-right font-bold text-base text-white">{course.enrollmentCount}</TableCell>
                                        </TableRow>
                                      ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2}>
                                                <EmptyState
                                                    icon={Book}
                                                    title="Aucun cours populaire"
                                                    description="Vos cours les plus populaires apparaîtront ici."
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                      </Card>
                </div>
            </section>
        </div>
    );
}

export function InstructorDashboard() {
    return <InstructorDashboardContent />;
}
