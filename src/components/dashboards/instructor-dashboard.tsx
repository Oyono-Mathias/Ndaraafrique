
'use client';

/**
 * @fileOverview Dashboard Formateur Android-First Vintage.
 * Connecté à Firestore pour les revenus, les étudiants et les devoirs.
 */

import { useRole } from '@/context/RoleContext';
import { 
  collection, 
  query, 
  where, 
  getFirestore, 
  onSnapshot, 
  getCountFromServer,
  orderBy,
  limit
} from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  DollarSign, 
  ClipboardCheck, 
  TrendingUp, 
  BookOpen, 
  ChevronRight,
  Zap,
  Clock
} from 'lucide-react';
import type { Payment, AssignmentSubmission, Course } from '@/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function InstructorDashboard() {
    const { currentUser: instructor, isUserLoading } = useRole();
    const db = getFirestore();

    const [stats, setStats] = useState({ totalRevenue: 0, studentCount: 0 });
    const [pendingSubmissions, setPendingSubmissions] = useState<AssignmentSubmission[]>([]);
    const [coursePerformance, setCoursePerformance] = useState<{title: string, revenue: number}[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!instructor?.uid) return;

        setIsLoading(true);

        // 1. Revenus totaux (Collection payments)
        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('instructorId', '==', instructor.uid), where('status', '==', 'Completed')),
            (snap) => {
                const total = snap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
                
                // Calcul performance par cours
                const performanceMap = new Map<string, number>();
                snap.docs.forEach(d => {
                    const data = d.data();
                    const title = data.courseTitle || 'Formation';
                    performanceMap.set(title, (performanceMap.get(title) || 0) + data.amount);
                });
                
                const perfArray = Array.from(performanceMap.entries())
                    .map(([title, revenue]) => ({ title, revenue }))
                    .sort((a, b) => b.revenue - a.revenue);

                setStats(prev => ({ ...prev, totalRevenue: total }));
                setCoursePerformance(perfArray);
            }
        );

        // 2. Nombre total d'étudiants (Collection users avec rôle student)
        const fetchStudents = async () => {
            const q = query(collection(db, 'users'), where('role', '==', 'student'));
            const snap = await getCountFromServer(q);
            setStats(prev => ({ ...prev, studentCount: snap.data().count }));
        };
        fetchStudents();

        // 3. Devoirs en attente (Collection devoirs, status submitted)
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
            }
        );

        return () => {
            unsubPayments();
            unsubDevoirs();
        };
    }, [instructor?.uid, db]);

    if (isUserLoading || isLoading) {
        return (
            <div className="flex flex-col gap-6 p-4 bg-slate-950 min-h-screen">
                <Skeleton className="h-10 w-3/4 bg-slate-900 rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-32 rounded-3xl bg-slate-900" />
                    <Skeleton className="h-32 rounded-3xl bg-slate-900" />
                </div>
                <Skeleton className="h-64 w-full rounded-3xl bg-slate-900" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
            
            {/* --- HEADER --- */}
            <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
                <h1 className="text-3xl font-black text-white leading-tight">
                    Espace <br/>
                    <span className="text-primary">Formateur</span>
                </h1>
                <p className="text-slate-500 text-sm mt-2 font-medium">Gérez votre académie avec Ndara.</p>
            </header>

            {/* --- CARTES STATS VINTAGE --- */}
            <section className="px-4 grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] shadow-xl active:scale-95 transition-all">
                    <div className="p-2 bg-primary/10 rounded-xl inline-block mb-3">
                        <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Revenus Totaux</p>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-black text-white">{stats.totalRevenue.toLocaleString('fr-FR')}</span>
                        <span className="text-[10px] font-bold text-slate-600 uppercase">XOF</span>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] shadow-xl active:scale-95 transition-all">
                    <div className="p-2 bg-blue-500/10 rounded-xl inline-block mb-3">
                        <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Inscriptions</p>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-black text-white">{stats.studentCount}</span>
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Ndara</span>
                    </div>
                </div>
            </section>

            {/* --- GESTION DES DEVOIRS --- */}
            <section className="px-4 space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        À corriger
                    </h2>
                    {pendingSubmissions.length > 0 && <Badge className="bg-primary text-white border-none">{pendingSubmissions.length}</Badge>}
                </div>

                {pendingSubmissions.length > 0 ? (
                    <div className="grid gap-3">
                        {pendingSubmissions.map(sub => (
                            <Card key={sub.id} className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden active:scale-95 transition-all">
                                <CardContent className="p-5 flex items-center justify-between">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <p className="text-sm font-bold text-white truncate">{sub.studentName}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-[8px] border-slate-700 text-slate-500 px-1.5 h-4 uppercase">Devoir</Badge>
                                            <p className="text-[10px] text-slate-500 truncate">{sub.assignmentTitle}</p>
                                        </div>
                                    </div>
                                    <Button size="sm" asChild className="rounded-xl h-10 px-4 font-bold bg-slate-800 hover:bg-primary text-slate-300 hover:text-white border-none">
                                        <Link href="/instructor/devoirs">Noter</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800/50">
                        <Zap className="h-8 w-8 mx-auto text-slate-800 mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Tout est à jour !</p>
                    </div>
                )}
            </section>

            {/* --- PERFORMANCE DES COURS --- */}
            <section className="px-4 space-y-4">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1">
                    <TrendingUp className="h-4 w-4" />
                    Top Performances
                </h2>
                
                <div className="grid gap-3">
                    {coursePerformance.slice(0, 3).map((course, idx) => (
                        <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 font-black text-xs text-primary">
                                    #{idx + 1}
                                </div>
                                <span className="text-xs font-bold text-slate-300 truncate">{course.title}</span>
                            </div>
                            <span className="text-sm font-black text-white shrink-0 ml-4">
                                {course.revenue.toLocaleString('fr-FR')} <span className="text-[9px] text-slate-600">XOF</span>
                            </span>
                        </div>
                    ))}
                    {coursePerformance.length === 0 && (
                        <p className="text-center py-4 text-[10px] text-slate-600 uppercase font-bold">Aucune donnée disponible</p>
                    )}
                </div>
            </section>

            {/* --- NAVIGATION RAPIDE --- */}
            <section className="px-4 grid grid-cols-1 gap-3">
                <Button variant="outline" asChild className="h-16 justify-between bg-slate-900 border-slate-800 rounded-[1.5rem] group active:scale-95 transition-all">
                    <span className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary transition-colors">
                            <BookOpen className="h-5 w-5 text-primary group-hover:text-white" />
                        </div>
                        <span className="font-bold text-slate-200">Gérer mes formations</span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-slate-700" />
                </Button>

                <Button variant="outline" asChild className="h-16 justify-between bg-slate-900 border-slate-800 rounded-[1.5rem] group active:scale-95 transition-all">
                    <span className="flex items-center gap-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500 transition-colors">
                            <Users className="h-5 w-5 text-blue-400 group-hover:text-white" />
                        </div>
                        <span className="font-bold text-slate-200">Annuaire des étudiants</span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-slate-700" />
                </Button>
            </section>

        </div>
    );
}
