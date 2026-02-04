'use client';

/**
 * @fileOverview Dashboard Étudiant optimisé Android-First.
 * Esthétique Vintage avec texture grainée et accents Ocre.
 * Flux 100% Firestore pour la progression et l'activité.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, onSnapshot, getDocs, documentId } from 'firebase/firestore';
import { ContinueLearning } from './ContinueLearning';
import { RecommendedCourses } from './RecommendedCourses';
import { RecentActivity } from './RecentActivity';
import { StatCard } from '@/components/dashboard/StatCard';
import { BookOpen, Trophy, TrendingUp, Sparkles, Bot, ChevronRight, Zap } from 'lucide-react';
import type { CourseProgress, Enrollment, Course, NdaraUser } from '@/lib/types';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function StudentDashboard() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [stats, setStats] = useState({ totalCourses: 0, completed: 0, avgProgress: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoading(true);

    const enrollQuery = query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid));
    const progressQuery = query(collection(db, 'course_progress'), where('userId', '==', currentUser.uid));

    const unsubEnrollments = onSnapshot(enrollQuery, (enrollSnap) => {
        const enrollCount = enrollSnap.size;
        
        const unsubProgress = onSnapshot(progressQuery, (progressSnap) => {
            const progressDocs = progressSnap.docs.map(d => d.data() as CourseProgress);
            const completed = progressDocs.filter(p => p.progressPercent === 100).length;
            const totalProgress = progressDocs.reduce((acc, curr) => acc + (curr.progressPercent || 0), 0);
            const avg = progressDocs.length > 0 ? Math.round(totalProgress / progressDocs.length) : 0;

            setStats({
                totalCourses: enrollCount,
                completed,
                avgProgress: avg
            });
            setIsLoading(false);
        });

        return () => unsubProgress();
    });

    return () => unsubEnrollments();
  }, [currentUser?.uid, db]);

  if (isUserLoading) {
    return (
      <div className="p-4 space-y-6 bg-slate-950 min-h-screen">
        <Skeleton className="h-12 w-3/4 bg-slate-900 rounded-xl" />
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
          <span className="text-[#CC7722]">{currentUser?.fullName?.split(' ')[0]} !</span>
        </h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">Continuez votre quête du savoir.</p>
      </header>

      {/* --- STATS VINTAGE (Android Style) --- */}
      <section className="px-4 grid grid-cols-2 gap-3">
        <StatCard 
          title="Formations" 
          value={stats.totalCourses.toString()} 
          icon={BookOpen} 
          isLoading={isLoading} 
          accentColor="bg-slate-900 border-slate-800"
        />
        <StatCard 
          title="Certificats" 
          value={stats.completed.toString()} 
          icon={Trophy} 
          isLoading={isLoading}
          accentColor="bg-slate-900 border-slate-800"
        />
      </section>

      {/* --- REPRENDRE L'APPRENTISSAGE --- */}
      <div className="px-4">
        <ContinueLearning />
      </div>

      {/* --- MATHIAS QUICK ACCESS --- */}
      <section className="px-4">
        <div className="bg-[#CC7722] p-6 rounded-[2rem] shadow-2xl shadow-[#CC7722]/20 relative overflow-hidden group active:scale-[0.98] transition-all">
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
            <Button asChild className="bg-white text-[#CC7722] hover:bg-white/90 rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6">
              <Link href="/student/tutor">Discuter avec Mathias</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* --- RECOMMANDATIONS & ACTIVITÉ --- */}
      <div className="px-4 space-y-10">
        <RecommendedCourses />
        <RecentActivity />
      </div>

      {/* --- FLOATING ACTION BUTTON (ANDROID FAB) --- */}
      <Button asChild className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-[#CC7722] hover:bg-[#CC7722]/90 shadow-2xl shadow-[#CC7722]/40 z-50 transition-transform active:scale-90">
        <Link href="/search">
          <SearchIcon className="h-6 w-6 text-white" />
          <span className="sr-only">Chercher un cours</span>
        </Link>
      </Button>

    </div>
  );
}

function SearchIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}