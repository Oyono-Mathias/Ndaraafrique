'use client';

import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, Timestamp, getDocs } from 'firebase/firestore';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, ResponsiveContainer, Tooltip } from 'recharts';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Star, BookOpen, DollarSign, TrendingUp, Book, AlertCircle } from 'lucide-react';
import type { Course, Review, Enrollment, Payment } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { StatCard } from '@/components/dashboard/StatCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface RevenueDataPoint {
  month: string;
  revenue: number;
}

export function InstructorDashboard() {
    const { currentUser: instructor, isUserLoading: roleLoading } = useRole();
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
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const instructorId = instructor.uid;

            try {
                const coursesQuery = query(collection(db, 'courses'), where('instructorId', '==', instructorId));
                const coursesSnapshot = await getDocs(coursesQuery);
                const courseList = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
                setCourses(courseList);

                const courseIds = courseList.map(c => c.id);
                if (courseIds.length === 0) {
                    setStats({ totalStudents: 0, averageRating: 0, totalReviews: 0, publishedCourses: 0, monthlyRevenue: 0 });
                    setEnrollments([]);
                    setRevenueTrendData([]);
                    setIsLoading(false);
                    return;
                }

                const courseIdChunks: string[][] = [];
                for (let i = 0; i < courseIds.length; i += 30) {
                    courseIdChunks.push(courseIds.slice(i, i + 30));
                }

                const reviewPromises = courseIdChunks.map(chunk => getDocs(query(collection(db, 'reviews'), where('courseId', 'in', chunk))));
                const enrollmentPromises = courseIdChunks.map(chunk => getDocs(query(collection(db, 'enrollments'), where('courseId', 'in', chunk))));
                
                const paymentsQuery = query(collection(db, 'payments'), where('instructorId', '==', instructorId));
                const paymentPromise = getDocs(paymentsQuery);

                const [reviewSnapshots, enrollmentSnapshots, paymentSnapshot] = await Promise.all([
                    Promise.all(reviewPromises),
                    Promise.all(enrollmentPromises),
                    paymentPromise
                ]);

                const allReviews = reviewSnapshots.flatMap(snap => snap.docs.map(doc => doc.data() as Review));
                const totalRating = allReviews.reduce((acc, r) => acc + r.rating, 0);
                
                const allEnrollments = enrollmentSnapshots.flatMap(snap => snap.docs.map(doc => doc.data() as Enrollment));
                setEnrollments(allEnrollments);
                const uniqueStudents = new Set(allEnrollments.map(e => e.studentId));
                
                const now = new Date();
                const startOfCurrentMonth = startOfMonth(now);
                
                const monthlyRev = paymentSnapshot.docs
                    .map(d => d.data() as Payment)
                    .filter(p => {
                        const pDate = (p.date as any)?.toDate?.() || null;
                        return pDate && p.status === 'Completed' && pDate >= startOfCurrentMonth;
                    })
                    .reduce((sum, p) => sum + (p.amount || 0), 0);
                
                const monthlyAggregates: Record<string, number> = {};
                paymentSnapshot.docs.forEach(docSnap => {
                    const payment = docSnap.data() as Payment;
                    const pDate = (payment.date as any)?.toDate?.() || null;
                    if (pDate && payment.status === 'Completed') {
                        const monthKey = format(pDate, 'MMM yy', { locale: fr });
                        monthlyAggregates[monthKey] = (monthlyAggregates[monthKey] || 0) + (payment.amount || 0);
                    }
                });
                const trendData = Object.entries(monthlyAggregates)
                    .map(([month, revenue]) => ({ month, revenue }))
                    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

                setStats({
                    totalStudents: uniqueStudents.size,
                    totalReviews: allReviews.length,
                    averageRating: allReviews.length > 0 ? totalRating / allReviews.length : 0,
                    monthlyRevenue: monthlyRev,
                    publishedCourses: courseList.filter(c => c.status === 'Published').length
                });
                setRevenueTrendData(trendData);

            } catch (err: any) {
                console.error("Error fetching instructor dashboard data:", err);
                setError("Une erreur est survenue lors de la récupération des statistiques.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
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
        revenue: { label: "Revenus", color: 'hsl(var(--primary))' },
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700/50 rounded-lg">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Erreur de chargement</h1>
                <p className="text-red-600 dark:text-red-300 mt-2">{error}</p>
            </div>
        )
    }

    return (
      <div className="space-y-8 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
        <header>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tableau de bord</h1>
            <p className="text-slate-500 dark:text-muted-foreground">Bienvenue, {instructor?.fullName?.split(' ')[0] || 'Instructeur'} !</p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard title="Étudiants au total" value={stats.totalStudents.toLocaleString('fr-FR')} icon={Users} isLoading={isLoading} />
            <StatCard title="Note moyenne" value={stats.totalReviews > 0 ? stats.averageRating.toFixed(1) : "N/A"} icon={Star} isLoading={isLoading} description={stats.totalReviews > 0 ? `Basé sur ${stats.totalReviews} avis` : "En attente d'avis"} />
            <StatCard title="Cours publiés" value={stats.publishedCourses.toString()} icon={BookOpen} isLoading={isLoading} />
            <StatCard title="Revenus (ce mois-ci)" value={`${stats.monthlyRevenue.toLocaleString('fr-FR')} XOF`} icon={DollarSign} isLoading={isLoading} />
        </section>

        <section className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
                <SectionHeader title="Évolution des revenus" className="mb-4" />
                <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 shadow-sm">
                    <CardContent className="pt-6">
                        {isLoading ? <Skeleton className="h-72 w-full bg-slate-200 dark:bg-slate-700" /> : revenueTrendData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-72 w-full">
                                <ResponsiveContainer>
                                    <BarChart data={revenueTrendData}>
                                        <CartesianGrid vertical={false} className="stroke-slate-200 dark:stroke-slate-700"/>
                                        <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} className="fill-slate-500 dark:fill-slate-400 text-xs" />
                                        <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} className="fill-slate-500 dark:fill-slate-400 text-xs"/>
                                        <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" formatter={(value) => `${(value as number).toLocaleString('fr-FR')} XOF`} />} />
                                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={4} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        ) : (
                            <EmptyState icon={TrendingUp} title="Graphique Indisponible" description="Les données sur vos revenus apparaîtront ici dès que vous réaliserez des ventes." />
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                 <SectionHeader title="Vos cours populaires" className="mb-4" />
                  <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-100 dark:border-slate-700">
                                    <TableHead className="text-slate-500 dark:text-slate-400">Cours</TableHead>
                                    <TableHead className="text-right text-slate-500 dark:text-slate-400">Inscriptions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? [...Array(5)].map((_, i) => (
                                    <TableRow key={i} className="border-slate-100 dark:border-slate-700">
                                        <TableCell><Skeleton className="h-5 w-full bg-slate-200 dark:bg-slate-700" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-10 bg-slate-200 dark:bg-slate-700" /></TableCell>
                                    </TableRow>
                                )) : topCourses.length > 0 ? (
                                  topCourses.map(course => (
                                    <TableRow key={course.id} className="border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <TableCell className="font-medium truncate max-w-[200px] text-sm text-slate-700 dark:text-slate-200">{course.title}</TableCell>
                                        <TableCell className="text-right font-bold text-base text-slate-900 dark:text-white">{course.enrollmentCount}</TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2}>
                                            <EmptyState icon={Book} title="Aucun cours populaire" description="Vos cours les plus populaires apparaîtront ici." />
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