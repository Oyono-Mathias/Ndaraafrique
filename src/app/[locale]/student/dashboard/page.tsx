'use client';

/**
 * @fileOverview Dashboard Étudiant Ndara Afrique Épuré.
 * Focus unique sur l'apprentissage et la progression.
 */

import { useRole } from '@/context/RoleContext';
import Link from 'next/link';
import { 
    BookOpen, 
    Trophy, 
    Search as LucideSearch, 
    ChevronRight, 
    TrendingUp,
    Clock,
    Award,
    Star,
    Sparkles,
    Bot
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

// Importation statique des composants
import { ContinueLearning } from '@/components/dashboards/ContinueLearning';
import { RecommendedCourses } from '@/components/dashboards/RecommendedCourses';
import { RecentActivity } from '@/components/dashboards/RecentActivity';
import { StatCard } from '@/components/dashboard/StatCard';
import { NewCoursesExplore } from '@/components/dashboards/NewCoursesExplore';

export default function StudentDashboardAndroid() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const locale = useLocale();
  
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // Inscriptions personnelles
    const unsubEnroll = onSnapshot(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)), (snap) => {
      setStats({ 
        total: snap.size, 
        completed: snap.docs.filter(d => d.data().progress === 100).length 
      });
      setLoadingData(false);
    });

    return () => unsubEnroll();
  }, [currentUser?.uid, db]);
  
  if (isUserLoading) return <div className="p-4 bg-slate-950 min-h-screen space-y-6"><Skeleton className="h-10 w-3/4 rounded-xl bg-slate-900" /></div>;

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
      
      <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl font-black text-white leading-tight">
          Bara ala, <br/>
          <span className="text-primary">{currentUser?.fullName?.split(' ')[0]} !</span>
        </h1>
        <p className="text-slate-500 text-sm mt-2 font-medium italic">Le savoir est votre capital.</p>
      </header>

      {/* --- STATS D'APPRENTISSAGE --- */}
      <section className="px-4 grid grid-cols-2 gap-3">
        <StatCard title="Formations" value={stats.total.toString()} icon={BookOpen} isLoading={loadingData} />
        <StatCard title="Certificats" value={stats.completed.toString()} icon={Trophy} isLoading={loadingData} />
      </section>

      {/* --- ACCÈS RAPIDE MATHIAS --- */}
      <section className="px-4">
        <Link href="/student/tutor" className="block active:scale-[0.98] transition-all">
            <div className="bg-primary p-6 rounded-[2rem] shadow-2xl shadow-primary/20 relative overflow-hidden group">
                <Bot className="absolute -right-4 -bottom-4 h-32 w-32 text-black/10 group-hover:scale-110 transition-transform" />
                <div className="relative z-10 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 bg-white/20 rounded-full flex items-center justify-center">
                            <Sparkles className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">IA MATHIAS</span>
                    </div>
                    <h2 className="text-xl font-black text-white leading-none">Une question sur <br/>votre cours ?</h2>
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Discuter avec le tuteur 24h/24</p>
                </div>
            </div>
        </Link>
      </section>

      <div className="px-4"><ContinueLearning /></div>
      <div className="px-4"><NewCoursesExplore /></div>

      <div className="px-4 space-y-10">
        <RecommendedCourses />
        <RecentActivity />
      </div>

      <Button asChild className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/40 z-50 transition-transform active:scale-90 p-0 flex items-center justify-center border-none">
        <Link href={`/${locale}/search`}>
          <LucideSearch className="h-6 w-6 text-primary-foreground" />
        </Link>
      </Button>
    </div>
  );
}
