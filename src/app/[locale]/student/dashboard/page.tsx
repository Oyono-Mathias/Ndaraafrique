
'use client';

/**
 * @fileOverview Dashboard Étudiant optimisé pour Android.
 * Hub centralisé regroupant la progression, les recommandations et l'activité.
 */

import { useRole } from '@/context/RoleContext';
import { ContinueLearning } from '@/components/dashboards/ContinueLearning';
import { RecommendedCourses } from '@/components/dashboards/RecommendedCourses';
import { RecentActivity } from '@/components/dashboards/RecentActivity';
import { NewCoursesExplore } from '@/components/dashboards/NewCoursesExplore';
import { StatCard } from '@/components/dashboard/StatCard';
import { BookOpen, Trophy, TrendingUp, Sparkles, Zap, Search, Bot } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import type { CourseProgress, Enrollment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function StudentDashboardAndroid() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [stats, setStats] = useState({ total: 0, completed: 0, avg: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoadingStats(true);
    const enrollQuery = query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid));
    const progressQuery = query(collection(db, 'course_progress'), where('userId', '==', currentUser.uid));

    const unsubEnroll = onSnapshot(enrollQuery, (snap) => {
      const total = snap.size;
      const unsubProg = onSnapshot(progressQuery, (pSnap) => {
        const progressDocs = pSnap.docs.map(d => d.data() as CourseProgress);
        const completed = progressDocs.filter(p => p.progressPercent === 100).length;
        const totalPerc = progressDocs.reduce((acc, curr) => acc + (curr.progressPercent || 0), 0);
        const avg = progressDocs.length > 0 ? Math.round(totalPerc / progressDocs.length) : 0;
        
        setStats({ total, completed, avg });
        setLoadingStats(false);
      });
      return () => unsubProg();
    });

    return () => unsubEnroll();
  }, [currentUser?.uid, db]);

  if (isUserLoading) {
    return (
      <div className="space-y-6 p-4 bg-slate-950 min-h-screen">
        <Skeleton className="h-10 w-3/4 bg-slate-900 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl bg-slate-900" />
          <Skeleton className="h-24 rounded-2xl bg-slate-900" />
        </div>
        <Skeleton className="h-64 w-full rounded-3xl bg-slate-900" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
      
      {/* --- HEADER SALUTATION --- */}
      <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl font-black text-white leading-tight">
          Bara ala, <br/>
          <span className="text-primary">{currentUser?.fullName?.split(' ')[0]} !</span>
        </h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">Continuez votre quête du savoir.</p>
      </header>

      {/* --- STATS (Android Style) --- */}
      <section className="px-4 grid grid-cols-2 gap-3">
        <StatCard 
          title="Formations" 
          value={stats.total.toString()} 
          icon={BookOpen} 
          isLoading={loadingStats} 
          accentColor="bg-slate-900 border-slate-800"
        />
        <StatCard 
          title="Certificats" 
          value={stats.completed.toString()} 
          icon={Trophy} 
          isLoading={loadingStats}
          accentColor="bg-slate-900 border-slate-800"
        />
      </section>

      {/* --- REPRENDRE L'APPRENTISSAGE --- */}
      <div className="px-4">
        <ContinueLearning />
      </div>

      {/* --- MATHIAS QUICK ACCESS --- */}
      <section className="px-4">
        <div className="bg-primary p-6 rounded-[2rem] shadow-2xl shadow-primary/20 relative overflow-hidden group active:scale-[0.98] transition-all">
          <Bot className="absolute -right-4 -bottom-4 h-32 w-32 text-black/10 group-hover:scale-110 transition-transform" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">Assistant Personnel</span>
            </div>
            <h2 className="text-2xl font-black text-white leading-none">Besoin d'aide, <br/>cher Ndara ?</h2>
            <p className="text-white/70 text-xs font-medium max-w-[180px]">Mathias répond à vos questions sur les cours 24h/24.</p>
            <Button asChild className="bg-white text-primary hover:bg-white/90 rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6">
              <Link href="/student/tutor">Discuter avec Mathias</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* --- NOUVELLES FORMATIONS --- */}
      <div className="px-4">
        <NewCoursesExplore />
      </div>

      {/* --- RECOMMANDATIONS IA --- */}
      <div className="px-4">
        <RecommendedCourses />
      </div>

      {/* --- ACTIVITÉ RÉCENTE --- */}
      <div className="px-4">
        <RecentActivity />
      </div>

      {/* --- BOUTON DE RECHERCHE FLOTTANT --- */}
      <Button asChild className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/40 z-50 transition-transform active:scale-90">
        <Link href="/search">
          <Search className="h-6 w-6 text-white" />
          <span className="sr-only">Explorer les cours</span>
        </Link>
      </Button>
    </div>
  );
}
