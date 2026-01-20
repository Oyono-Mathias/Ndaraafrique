
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
import { TrendingUp, BookOpen, AlertCircle } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import {
  collection,
  query,
  where,
  getFirestore,
  onSnapshot,
  Timestamp,
  getDocs,
  orderBy
} from 'firebase/firestore';
import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Course, Enrollment } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TopCourse {
  id: string;
  title: string;
  enrollmentCount: number;
}

interface RevenueDataPoint {
  month: string;
  revenue: number;
}

const StatsPageSkeleton = () => (
    <div className="space-y-8">
        <header>
            <h1 className="text-3xl font-bold text-white">Statistiques & Revenus</h1>
            <p className="text-muted-foreground">Analyse financière en temps réel de la plateforme.</p>
        </header>

        <div className="grid lg:grid-cols-5 gap-6">
            {/* Main Chart */}
            <Card className="lg:col-span-3 bg-white dark:bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>Revenus Mensuels</CardTitle>
                    <CardDescription>Évolution des revenus bruts générés chaque mois.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <Skeleton className="h-80 w-full" />
                </CardContent>
            </Card>

            {/* Top Courses */}
            <Card className="lg:col-span-2 bg-white dark:bg-card shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Cours les plus populaires
                    </CardTitle>
                    <CardDescription>Classement des cours par nombre d'inscriptions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/12">#</TableHead>
                                <TableHead className="w-8/12">Cours</TableHead>
                                <TableHead className="text-right w-3/12">Inscriptions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
);


export default function StatisticsPage() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
    const [revenueTrendData, setRevenueTrendData] = useState<RevenueDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') {
            if (!isUserLoading) setIsLoading(false);
            return;
        }
        setIsLoading(true);

        const paymentsQuery = query(collection(db, 'payments'), where('status', '==', 'Completed'));
        const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
            const monthlyAggregates: Record<string, number> = {};
            snapshot.docs.forEach(doc => {
                const payment = doc.data();
                if (payment.date instanceof Timestamp) {
                    const date = payment.date.toDate();
                    const monthKey = format(date, 'MMM yy', { locale: fr });
                    monthlyAggregates[monthKey] = (monthlyAggregates[monthKey] || 0) + (payment.amount || 0);
                }
            });

            const monthOrder = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
            const trendData = Object.entries(monthlyAggregates)
                .map(([month, revenue]) => {
                    const [monthStr, yearStr] = month.split(' ');
                    const monthIndex = monthOrder.indexOf(monthStr.toLowerCase());
                    return { month, revenue, date: new Date(`20${yearStr}`, monthIndex) };
                })
                .sort((a,b) => a.date.getTime() - b.date.getTime())
                .map(({ month, revenue }) => ({ month, revenue }));

            setRevenueTrendData(trendData);
        }, (err) => {
            console.error("Error fetching payments:", err);
            setError("Impossible de charger les données de revenus.");
        });

        const enrollmentsQuery = query(collection(db, 'enrollments'));
        const unsubEnrollments = onSnapshot(enrollmentsQuery, async (snapshot) => {
             const enrollmentCounts: Record<string, number> = {};
             snapshot.docs.forEach(doc => {
                const enrollment = doc.data() as Enrollment;
                enrollmentCounts[enrollment.courseId] = (enrollmentCounts[enrollment.courseId] || 0) + 1;
             });

             const sortedCourseIds = Object.keys(enrollmentCounts)
                .sort((a,b) => enrollmentCounts[b] - enrollmentCounts[a])
                .slice(0, 5);

             if (sortedCourseIds.length > 0) {
                 const coursesSnap = await getDocs(query(collection(db, 'courses'), where('__name__', 'in', sortedCourseIds)));
                 const coursesData: Record<string, string> = {};
                 coursesSnap.forEach(d => coursesData[d.id] = d.data().title);
                 
                 setTopCourses(sortedCourseIds.map(id => ({
                     id,
                     title: coursesData[id] || 'Cours inconnu',
                     enrollmentCount: enrollmentCounts[id]
                 })));
             } else {
                 setTopCourses([]);
             }
        }, (err) => {
            console.error("Error fetching enrollments:", err);
            setError("Impossible de charger les données d'inscription.");
        });
        
        const timer = setTimeout(() => setIsLoading(false), 2500);

        return () => {
            unsubPayments();
            unsubEnrollments();
            clearTimeout(timer);
        }

    }, [currentUser, isUserLoading, db]);

    const chartConfig = {
        revenue: { label: "Revenus", color: 'hsl(var(--primary))' },
    };

    if (isLoading) {
        return <StatsPageSkeleton />;
    }
    
    if (error) {
        return (
             <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4 bg-red-900/10 border border-red-700/50 rounded-lg">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-white">Erreur de chargement</h1>
                <p className="text-red-300 mt-2">{error}</p>
                <p className="text-slate-400 mt-1 text-sm">Un index Firestore est peut-être manquant. Vérifiez la console pour plus de détails.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-white">Statistiques & Revenus</h1>
                <p className="text-muted-foreground">Analyse financière en temps réel de la plateforme.</p>
            </header>

            <div className="grid lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3 bg-white dark:bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle>Revenus Mensuels</CardTitle>
                        <CardDescription>Évolution des revenus bruts générés chaque mois.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        {revenueTrendData.length > 0 ? (
                             <ChartContainer config={chartConfig} className="h-80 w-full">
                                <ResponsiveContainer>
                                    <BarChart data={revenueTrendData}>
                                        <CartesianGrid vertical={false} className="dark:stroke-slate-700"/>
                                        <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} className="dark:fill-slate-400 text-xs"/>
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
                            <div className="h-80 flex items-center justify-center text-muted-foreground">Aucune donnée de revenus à afficher.</div>
                        )}
                    </CardContent>
                </Card>
                
                <Card className="lg:col-span-2 bg-white dark:bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Cours les plus populaires
                        </CardTitle>
                        <CardDescription>Classement des cours par nombre d'inscriptions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/12">#</TableHead>
                                    <TableHead className="w-8/12">Cours</TableHead>
                                    <TableHead className="text-right w-3/12">Inscriptions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topCourses.length > 0 ? (
                                    topCourses.map((course, index) => (
                                        <TableRow key={course.id}>
                                            <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                            <TableCell className="font-semibold truncate">{course.title}</TableCell>
                                            <TableCell className="text-right font-bold">{course.enrollmentCount}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Aucune inscription enregistrée.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    