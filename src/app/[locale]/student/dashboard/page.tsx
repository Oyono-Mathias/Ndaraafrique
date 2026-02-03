
'use client';

/**
 * @fileOverview Dashboard Étudiant optimisé pour Android.
 * Hub centralisé regroupant la progression, les recommandations et l'activité.
 * Flux 100% temps réel via Firestore.
 */

import { useRole } from '@/context/RoleContext';
import { ContinueLearning } from '@/components/dashboards/ContinueLearning';
import { RecommendedCourses } from '@/components/dashboards/RecommendedCourses';
import { RecentActivity } from '@/components/dashboards/RecentActivity';
import { StatCard } from '@/components/dashboard/StatCard';
import { BookOpen, Trophy, TrendingUp, Sparkles, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import type { CourseProgress, Enrollment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

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
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-3/4 bg-slate-800" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl bg-slate-800" />
          <Skeleton className="h-24 rounded-2xl bg-slate-800" />
        </div>
        <Skeleton className="h-40 rounded-2xl bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24 animate-in fade-in duration-500">
      {/* --- HEADER SALUTATION --- */}
      <header className="px-4 pt-4">
        <h1 className="text-2xl font-black text-white">
          Salut, {currentUser?.fullName?.split(' ')[0]} ! 
          <Zap className="inline-block ml-2 h-5 w-5 text-yellow-400 fill-yellow-400" />
        </h1>
        <p className="text-slate-400 text-sm mt-1">Prêt à acquérir de nouvelles compétences ?</p>
      </header>

      {/* --- STATS RAPIDES (Android Style) --- */}
      <section className="px-4 grid grid-cols-2 gap-3">
        <StatCard 
          title="Cours suivis" 
          value={stats.total.toString()} 
          icon={BookOpen} 
          isLoading={loadingStats} 
          accentColor="bg-blue-500/5 border-blue-500/20"
        />
        <StatCard 
          title="Certificats" 
          value={stats.completed.toString()} 
          icon={Trophy} 
          isLoading={loadingStats}
          accentColor="bg-green-500/5 border-green-500/20"
        />
      </section>

      {/* --- REPRENDRE L'APPRENTISSAGE --- */}
      <div className="px-4">
        <ContinueLearning />
      </div>

      {/* --- RECOMMANDATIONS IA --- */}
      <div className="px-4">
        <RecommendedCourses />
      </div>

      {/* --- ACTIVITÉ RÉCENTE --- */}
      <div className="px-4">
        <RecentActivity />
      </div>
    </div>
  );
}
