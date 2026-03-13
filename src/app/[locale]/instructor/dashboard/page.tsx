
'use client';

/**
 * @fileOverview Dashboard Formateur Ndara Afrique - Version Analytique.
 * Identité visuelle : Orange / Ocre (Différent du Vert Étudiant).
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
  startOfMonth
} from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  DollarSign, 
  ClipboardCheck, 
  TrendingUp, 
  Landmark,
  Star,
  Loader2,
  PieChart,
  History,
  BookOpen
} from 'lucide-react';
import type { AssignmentSubmission, Payment, Course } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format, subMonths, isSameMonth } from 'date-fns';
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

        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('instructorId', '==', instructor.uid), where('status', '==', 'Completed')),
            (snap) => {
                setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
            }
        );

        const unsubCourses = onSnapshot(
            query(collection(db, 'courses'), where('instructorId', '==', instructor.uid)),
            (snap) => {
                setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
            }
        );

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

        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(now, i);
            const monthLabel = format(monthDate, 'MMM', { locale: fr });
            const revenue = payments
                .filter(p => isSameMonth((p.date as any)?.toDate?.() || new Date(0), monthDate))
                .reduce((acc, p) => acc + (p.amount || 0), 0);
            
            chartData.push({ name: monthLabel, total: revenue });
        }

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
            <div className="flex flex-col gap-8 p-4 bg-[#050505] min-h-screen">
                <Skeleton className="h-12 w-1/2 bg-slate-900 rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-[2rem] bg-slate-900" />)}
                </div>
                <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10 pb-24 bg-[#050505] min-h-screen bg-grainy animate-in fade-in duration-700">
            
            <header className="px-4 pt-8">
                <div className="flex items-center gap-2 text-[#F97316] mb-2">
                    <PieChart className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Centre de pilotage</span>
                </div>
                <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
                    Espace <br/><span className="text-[#F97316]">Formateur</span>
                </h1>
                <p className="text-slate-500 text-xs mt-2 font-medium italic">Bara ala, Expert Ndara.</p>
            </header>

            {/* Section: Le design HTML de Qwen viendra s'insérer ici */}
            <div id="qwen-dashboard-container">
                <section className="px-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard 
                        title="Chiffre d'Affaires" 
                        value={`${analytics.totalRevenue.toLocaleString('fr-FR')} XOF`} 
                        icon={Landmark} 
                        isLoading={false}
                        accentColor="border-[#F97316]/20"
                    />
                    <StatCard 
                        title="Ce Mois-ci" 
                        value={`${analytics.monthlyRevenue.toLocaleString('fr-FR')} XOF`} 
                        icon={TrendingUp} 
                        isLoading={false}
                        accentColor="border-[#F97316]/20"
                    />
                    <StatCard 
                        title="Mes Ndara" 
                        value={analytics.totalStudentsCount.toLocaleString('fr-FR')} 
                        icon={Users} 
                        isLoading={false}
                        accentColor="border-[#F97316]/20"
                    />
                </section>

                <section className="px-4 mt-8">
                    <Card className="bg-slate-900 border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Flux de Trésorerie</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.chartData}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
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
                                        itemStyle={{color: '#F97316', fontWeight: 'bold'}}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="total" 
                                        stroke="#F97316" 
                                        fillOpacity={1} 
                                        fill="url(#colorTotal)" 
                                        strokeWidth={4}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </section>

                <section className="px-4 mt-10 space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Urgences Pédagogiques
                    </h2>
                    
                    <div className="grid gap-3">
                        {pendingSubmissions.length > 0 ? (
                            pendingSubmissions.map(sub => (
                                <Card key={sub.id} className="bg-slate-900 border-white/5 rounded-2xl overflow-hidden active:scale-95 transition-all border-l-4 border-l-[#F97316] shadow-xl">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <p className="font-bold text-white text-sm truncate">{sub.studentName}</p>
                                            <p className="text-[10px] text-slate-500 truncate italic">"{sub.assignmentTitle}"</p>
                                        </div>
                                        <Button size="sm" asChild className="h-9 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#F97316] hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-500/20">
                                            <Link href="/instructor/devoirs">Noter</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="py-12 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-white/5">
                                <History className="h-8 w-8 mx-auto text-slate-800 mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Aucune correction en attente</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <div className="px-4 pt-4 text-center">
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Ndara Afrique Expert Hub v2.0</p>
            </div>
        </div>
    );
}
