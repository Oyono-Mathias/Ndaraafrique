
'use client';

/**
 * @fileOverview Dashboard Formateur Ndara Afrique V2.
 * Palette : Fond Bleu Sombre (#0f172a), Accents Vert (#10b981) et Blanc.
 * Design : Android-first tactile.
 */

import { useRole } from '@/context/RoleContext';
import { 
  collection, 
  query, 
  where, 
  getFirestore, 
  onSnapshot, 
  orderBy,
  limit
} from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Landmark,
  TrendingUp, 
  ClipboardCheck, 
  PieChart,
  History,
  Loader2
} from 'lucide-react';
import type { AssignmentSubmission, Payment, Course } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
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
        const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
        const totalStudentsCount = Array.from(new Set(payments.map(p => p.userId))).length;

        const now = new Date();
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(now, i);
            const monthLabel = format(monthDate, 'MMM', { locale: fr });
            const revenue = payments
                .filter(p => isSameMonth((p.date as any)?.toDate?.() || new Date(0), monthDate))
                .reduce((acc, p) => acc + (p.amount || 0), 0);
            
            chartData.push({ name: monthLabel, total: revenue });
        }

        return {
            totalRevenue,
            chartData,
            totalStudentsCount
        };
    }, [payments]);

    if (isUserLoading || isLoading) {
        return (
            <div className="flex flex-col gap-8 p-4 bg-[#0f172a] min-h-screen">
                <Skeleton className="h-12 w-1/2 bg-slate-900 rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-[2rem] bg-slate-900" />)}
                </div>
                <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10 pb-24 bg-[#0f172a] min-h-screen relative overflow-hidden bg-grainy animate-in fade-in duration-700">
            <div className="grain-overlay opacity-[0.03]" />
            
            <header className="px-6 pt-8">
                <div className="flex items-center gap-2 text-[#10b981] mb-2">
                    <PieChart className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Tableau de Pilotage</span>
                </div>
                <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
                    Espace <br/><span className="text-[#10b981]">Formateur</span>
                </h1>
                <p className="text-slate-400 text-xs mt-2 font-medium italic">Bara ala, Expert Ndara.</p>
            </header>

            {/* Section dynamique alimentée par le code de Qwen */}
            <div id="qwen-instructor-dashboard">
                <section className="px-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard 
                        title="Chiffre d'Affaires" 
                        value={`${analytics.totalRevenue.toLocaleString('fr-FR')} XOF`} 
                        icon={Landmark} 
                        isLoading={false}
                        accentColor="border-[#10b981]/20"
                    />
                    <StatCard 
                        title="Inscriptions" 
                        value={analytics.totalStudentsCount.toString()} 
                        icon={Users} 
                        isLoading={false}
                        accentColor="border-[#10b981]/20"
                    />
                    <StatCard 
                        title="Réussite" 
                        value="94%" 
                        icon={TrendingUp} 
                        isLoading={false}
                        accentColor="border-[#10b981]/20"
                    />
                </section>

                <section className="px-6 mt-8">
                    <Card className="bg-slate-900/50 backdrop-blur-sm border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Croissance Mensuelle</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.chartData}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-5" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px'}} itemStyle={{color: '#10b981', fontWeight: 'bold'}} />
                                    <Area type="monotone" dataKey="total" stroke="#10b981" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={4} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </section>

                <section className="px-6 mt-10 space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Urgences Pédagogiques
                    </h2>
                    
                    <div className="grid gap-3">
                        {pendingSubmissions.length > 0 ? (
                            pendingSubmissions.map(sub => (
                                <Card key={sub.id} className="bg-slate-900 border-white/5 rounded-2xl overflow-hidden active:scale-95 transition-all border-l-4 border-l-[#10b981] shadow-xl">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <p className="font-bold text-white text-sm truncate uppercase tracking-tight">{sub.studentName}</p>
                                            <p className="text-[10px] text-slate-500 truncate italic">"{sub.assignmentTitle}"</p>
                                        </div>
                                        <Button size="sm" asChild className="h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#10b981] hover:bg-emerald-600 text-slate-950 border-none shadow-lg">
                                            <Link href="/instructor/devoirs">Noter</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="py-12 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-white/5 opacity-30">
                                <History className="h-8 w-8 mx-auto text-slate-700 mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Aucun devoir en attente</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <div className="px-6 pt-4 text-center">
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Ndara Afrique Expert Hub • Edition Forest</p>
            </div>
        </div>
    );
}
