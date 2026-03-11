
'use client';

/**
 * @fileOverview Dashboard Instructeur Ndara Afrique - Version Analytique.
 * ✅ ANALYTICS : Revenus mensuels, totaux et graphique de croissance.
 * ✅ PÉDAGOGIE : File d'attente des corrections prioritaires.
 * ✅ PERFORMANCE : Audit détaillé par formation.
 */

import { useRole } from '@/context/RoleContext';
import { 
  collection, 
  query, 
  where, 
  getFirestore, 
  onSnapshot, 
  orderBy,
  limit,
  getDocs,
  documentId
} from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  DollarSign, 
  ClipboardCheck, 
  TrendingUp, 
  Landmark,
  Calendar,
  Star,
  ArrowRight,
  Loader2,
  PieChart,
  History,
  BookOpen
} from 'lucide-react';
import type { AssignmentSubmission, Payment, Course, Enrollment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format, subMonths, isSameMonth, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { StatCard } from '@/components/dashboard/StatCard';

export default function InstructorDashboard() {
    const { currentUser: instructor, isUserLoading } = useRole();
    const db = getFirestore();

    const [payments, setPayments] = useState<Payment[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [pendingSubmissions, setPendingSubmissions] = useState<AssignmentSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!instructor?.uid) return;

        setIsLoading(true);

        // 1. Écouter les paiements réussis
        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('instructorId', '==', instructor.uid), where('status', '==', 'Completed')),
            (snap) => {
                setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
            }
        );

        // 2. Écouter mes cours
        const unsubCourses = onSnapshot(
            query(collection(db, 'courses'), where('instructorId', '==', instructor.uid)),
            (snap) => {
                setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
            }
        );

        // 3. Écouter les devoirs en attente (Top 5 prioritaires)
        const unsubDevoirs = onSnapshot(
            query(
                collection(db, 'devoirs'), 
                where('instructorId', '==', instructor.uid), 
                where('status', '==', 'submitted'),
                orderBy('submittedAt', 'desc'),
                limit(5)
            ),
            (snap) => {
                setPendingSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignmentSubmission)));
                setIsLoading(false);
            },
            (err) => {
                console.error("Dashboard Fetch Error:", err);
                setIsLoading(false);
            }
        );

        return () => { unsubPayments(); unsubCourses(); unsubDevoirs(); };
    }, [instructor?.uid, db]);

    // --- CALCUL DES ANALYTICS ---
    const analytics = useMemo(() => {
        const now = new Date();
        const startOfThisMonth = startOfMonth(now);

        const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
        const monthlyRevenue = payments
            .filter(p => {
                const date = (p.date as any)?.toDate?.() || new Date(0);
                return date >= startOfThisMonth;
            })
            .reduce((acc, p) => acc + (p.amount || 0), 0);

        // Préparer les données du graphique (6 derniers mois)
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(now, i);
            const monthLabel = format(monthDate, 'MMM', { locale: fr });
            const revenue = payments
                .filter(p => isSameMonth((p.date as any)?.toDate?.() || new Date(0), monthDate))
                .reduce((acc, p) => acc + (p.amount || 0), 0);
            
            chartData.push({ name: monthLabel, total: revenue });
        }

        // Stats par cours
        const courseStats = courses.map(course => {
            const coursePayments = payments.filter(p => p.courseId === course.id);
            return {
                id: course.id,
                title: course.title,
                revenue: coursePayments.reduce((acc, p) => acc + p.amount, 0),
                students: course.participantsCount || 0,
                rating: course.rating || 0
            };
        }).sort((a, b) => b.revenue - a.revenue);

        return {
            totalRevenue,
            monthlyRevenue,
            chartData,
            courseStats,
            totalStudentsCount: Array.from(new Set(payments.map(p => p.userId))).length
        };
    }, [payments, courses]);

    if (isUserLoading || isLoading) {
        return (
            <div className="flex flex-col gap-8 p-4 bg-slate-950 min-h-screen">
                <Skeleton className="h-12 w-1/2 bg-slate-900 rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-[2rem] bg-slate-900" />)}
                </div>
                <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10 pb-24 bg-slate-950 min-h-screen bg-grainy animate-in fade-in duration-700">
            
            {/* --- HEADER --- */}
            <header className="px-4 pt-8">
                <div className="flex items-center gap-2 text-primary mb-2">
                    <PieChart className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Centre de pilotage</span>
                </div>
                <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
                    Analyse <br/><span className="text-primary">de l'Académie</span>
                </h1>
            </header>

            {/* --- CARTES STATS KPIs --- */}
            <section className="px-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard 
                    title="Chiffre d'Affaires" 
                    value={`${analytics.totalRevenue.toLocaleString('fr-FR')} XOF`} 
                    icon={Landmark} 
                    isLoading={false}
                    description="Gains cumulés historiques"
                />
                <StatCard 
                    title="Ce Mois-ci" 
                    value={`${analytics.monthlyRevenue.toLocaleString('fr-FR')} XOF`} 
                    icon={TrendingUp} 
                    isLoading={false}
                    description={`Progression sur ${format(new Date(), 'MMMM', { locale: fr })}`}
                />
                <StatCard 
                    title="Mes Ndara" 
                    value={analytics.totalStudentsCount.toLocaleString('fr-FR')} 
                    icon={Users} 
                    isLoading={false}
                    description="Apprenants uniques"
                />
            </section>

            {/* --- GRAPHIQUE DE CROISSANCE --- */}
            <section className="px-4">
                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Volume des encaissements</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.chartData}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-5" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}}
                                />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px'}}
                                    itemStyle={{color: 'hsl(var(--primary))', fontWeight: 'bold'}}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="total" 
                                    stroke="hsl(var(--primary))" 
                                    fillOpacity={1} 
                                    fill="url(#colorTotal)" 
                                    strokeWidth={4}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </section>

            {/* --- DEVOIRS EN ATTENTE --- */}
            <section className="px-4 space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Urgences pédagogiques
                    </h2>
                    {pendingSubmissions.length > 0 && (
                        <Badge className="bg-red-500 text-white border-none rounded-full h-5 min-w-[20px] px-1 shadow-lg shadow-red-500/20">
                            {pendingSubmissions.length}
                        </Badge>
                    )}
                </div>

                {pendingSubmissions.length > 0 ? (
                    <div className="grid gap-3">
                        {pendingSubmissions.map(sub => (
                            <Card key={sub.id} className="bg-slate-900 border-slate-800 rounded-2xl overflow-hidden active:scale-[0.98] transition-all border-l-4 border-l-primary shadow-xl">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <p className="font-bold text-white text-sm truncate">{sub.studentName}</p>
                                        <p className="text-[10px] text-slate-500 truncate italic">"{sub.assignmentTitle}"</p>
                                    </div>
                                    <Button size="sm" asChild className="h-9 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest bg-slate-800 hover:bg-primary text-white border-none transition-all">
                                        <Link href="/instructor/devoirs">Noter</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800/50">
                        <History className="h-8 w-8 mx-auto text-slate-800 mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Aucun travail en attente</p>
                    </div>
                )}
            </section>

            {/* --- PERFORMANCE DES COURS --- */}
            <section className="px-4 space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1">
                    <BookOpen className="h-4 w-4" />
                    Performance par formation
                </h2>
                
                <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 bg-slate-800/30">
                                <TableHead className="text-[9px] font-black uppercase tracking-widest py-4">Cours</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-center">Élèves</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Revenu</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-right pr-6">Note</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analytics.courseStats.length > 0 ? (
                                analytics.courseStats.map(course => (
                                    <TableRow key={course.id} className="border-slate-800 hover:bg-slate-800/20">
                                        <TableCell className="font-bold text-xs text-white truncate max-w-[120px]">{course.title}</TableCell>
                                        <TableCell className="text-center text-xs font-bold text-slate-400">{course.students}</TableCell>
                                        <TableCell className="text-right text-xs font-black text-emerald-400">{course.revenue.toLocaleString('fr-FR')} <span className="text-[8px] opacity-50">XOF</span></TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                                <span className="text-xs font-bold text-white">{course.rating || '4.8'}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-[10px] text-slate-600 font-bold uppercase">Aucune donnée disponible</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>

            <div className="px-4 pt-4 text-center">
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Ndara Afrique • Business Intelligence v2.0</p>
            </div>
        </div>
    );
}
