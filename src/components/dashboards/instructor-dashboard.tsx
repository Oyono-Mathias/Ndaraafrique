
'use client';

/**
 * @fileOverview Dashboard Formateur optimisé Android.
 * Fokus sur la productivité (devoirs à corriger) et la santé financière.
 */

import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, onSnapshot, getDocs } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Star, BookOpen, DollarSign, Zap, ArrowRight, MessageSquare, ClipboardCheck } from 'lucide-react';
import type { Course, Review, Enrollment, Payment, AssignmentSubmission } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from '@/components/dashboard/StatCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function InstructorDashboard() {
    const { currentUser: instructor, isUserLoading } = useRole();
    const db = getFirestore();

    const [stats, setStats] = useState({ totalStudents: 0, avgRating: 0, monthlyRevenue: 0 });
    const [pendingSubmissions, setPendingSubmissions] = useState<AssignmentSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!instructor?.uid) return;

        setIsLoading(true);
        const instructorId = instructor.uid;

        // 1. Écoute des inscriptions (Compteur étudiants)
        const unsubEnroll = onSnapshot(
            query(collection(db, 'enrollments'), where('instructorId', '==', instructorId)),
            (snap) => {
                const uniqueStudents = new Set(snap.docs.map(d => d.data().studentId)).size;
                setStats(prev => ({ ...prev, totalStudents: uniqueStudents }));
            }
        );

        // 2. Écoute des avis (Moyenne note)
        const unsubReviews = onSnapshot(
            query(collection(db, 'reviews'), where('instructorId', '==', instructorId)),
            (snap) => {
                if (snap.empty) return;
                const total = snap.docs.reduce((acc, d) => acc + (d.data().rating || 0), 0);
                setStats(prev => ({ ...prev, avgRating: total / snap.size }));
            }
        );

        // 3. Écoute des revenus du mois
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

        const unsubPayments = onSnapshot(
            query(
                collection(db, 'payments'), 
                where('instructorId', '==', instructorId),
                where('status', '==', 'Completed')
            ),
            (snap) => {
                const total = snap.docs
                    .map(d => d.data() as Payment)
                    .filter(p => (p.date as any)?.toDate() >= startOfMonth)
                    .reduce((acc, p) => acc + p.amount, 0);
                setStats(prev => ({ ...prev, monthlyRevenue: total }));
            }
        );

        // 4. Écoute des devoirs en attente (Actions urgentes)
        const unsubSubmissions = onSnapshot(
            query(
                collection(db, 'devoirs'), 
                where('instructorId', '==', instructorId),
                where('status', '==', 'submitted')
            ),
            (snap) => {
                setPendingSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignmentSubmission)).slice(0, 3));
                setIsLoading(false);
            }
        );

        return () => {
            unsubEnroll();
            unsubReviews();
            unsubPayments();
            unsubSubmissions();
        };
    }, [instructor?.uid, db]);

    if (isUserLoading) {
        return <div className="p-4 space-y-6"><Skeleton className="h-10 w-3/4 bg-slate-800" /><div className="grid grid-cols-2 gap-3"><Skeleton className="h-24 rounded-2xl bg-slate-800" /><Skeleton className="h-24 rounded-2xl bg-slate-800" /></div></div>;
    }

    return (
      <div className="flex flex-col gap-8 p-4 animate-in fade-in duration-500">
        <header>
            <h1 className="text-2xl font-black text-white">
                Tableau de bord
                <Zap className="inline-block ml-2 h-5 w-5 text-primary fill-primary" />
            </h1>
            <p className="text-slate-400 text-sm">Prêt à accompagner vos étudiants ?</p>
        </header>

        {/* --- STATS RAPIDES --- */}
        <section className="grid grid-cols-2 gap-3">
            <StatCard 
                title="Étudiants" 
                value={stats.totalStudents.toString()} 
                icon={Users} 
                isLoading={isLoading}
                accentColor="bg-blue-500/5 border-blue-500/20"
            />
            <StatCard 
                title="Note" 
                value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "N/A"} 
                icon={Star} 
                isLoading={isLoading}
                accentColor="bg-amber-500/5 border-amber-500/20"
            />
            <StatCard 
                title="Revenus (Mois)" 
                value={`${stats.monthlyRevenue.toLocaleString('fr-FR')} XOF`} 
                icon={DollarSign} 
                isLoading={isLoading}
                accentColor="bg-green-500/5 border-green-500/20"
            />
            <StatCard 
                title="Actions" 
                value={pendingSubmissions.length.toString()} 
                icon={ClipboardCheck} 
                isLoading={isLoading}
                accentColor="bg-red-500/5 border-red-500/20"
            />
        </section>

        {/* --- ACTIONS URGENTES --- */}
        <section className="space-y-4">
            <SectionHeader title="À corriger en priorité" />
            {isLoading ? (
                <Skeleton className="h-32 w-full rounded-2xl bg-slate-900" />
            ) : pendingSubmissions.length > 0 ? (
                <div className="grid gap-3">
                    {pendingSubmissions.map(sub => (
                        <Card key={sub.id} className="bg-slate-900 border-slate-800">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex-1 min-w-0 mr-4">
                                    <p className="text-sm font-bold text-white truncate">{sub.studentName}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 truncate">{sub.assignmentTitle}</p>
                                </div>
                                <Button size="sm" asChild className="h-9 px-4 rounded-xl">
                                    <Link href="/instructor/devoirs">Noter</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                    <ClipboardCheck className="h-8 w-8 mx-auto text-slate-700 mb-2" />
                    <p className="text-sm text-slate-500">Tous les devoirs sont notés. Beau travail !</p>
                </div>
            )}
        </section>

        {/* --- RACCOURCIS RAPIDES --- */}
        <section className="grid gap-3">
            <Button variant="outline" asChild className="h-14 justify-between bg-slate-900 border-slate-800 rounded-2xl group">
                <span className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Mes Formations
                </span>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" asChild className="h-14 justify-between bg-slate-900 border-slate-800 rounded-2xl group">
                <span className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-blue-400" />
                    Questions Étudiants
                </span>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
            </Button>
        </section>
      </div>
    );
}
