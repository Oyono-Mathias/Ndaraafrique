'use client';

/**
 * @fileOverview Dashboard Étudiant Ndara Afrique (Design Qwen Redesign 2026).
 * ✅ Carte Mathias IA ajustée pour avoir presque la même taille que les Stat Cards.
 */

import { useRole } from '@/context/RoleContext';
import { 
  collection, 
  query, 
  where, 
  getFirestore, 
  onSnapshot 
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  Trophy, 
  Bot, 
  Sparkles, 
  Search
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ContinueLearning } from '@/components/dashboards/ContinueLearning';
import { RecommendedCourses } from '@/components/dashboards/RecommendedCourses';
import { RecentActivity } from '@/components/dashboards/RecentActivity';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function StudentDashboardAndroid() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const common = useTranslations('Common');
  
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoadingData(true);
    const unsubEnroll = onSnapshot(
      query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)), 
      (snap) => {
        setStats({ 
          total: snap.size, 
          completed: snap.docs.filter(d => d.data().progress === 100).length 
        });
        setLoadingData(false);
      }
    );

    return () => unsubEnroll();
  }, [currentUser?.uid, db]);
  
  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="dashboard-container px-6 pt-12 space-y-10">
          <div className="space-y-3">
            <Skeleton className="h-12 w-3/4 rounded-2xl bg-muted" />
            <Skeleton className="h-5 w-2/3 rounded-lg bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <Skeleton className="h-40 rounded-3xl bg-muted" />
            <Skeleton className="h-40 rounded-3xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  const firstName = currentUser?.fullName?.split(' ')[0] || common('ndara_term');

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      <div className="grain-overlay" />

      <div className="dashboard-container px-6 pt-10 space-y-9">

        {/* HEADER SALUTATION */}
        <header className="animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-4xl font-black text-foreground leading-[1.1] tracking-tight">
            {common('greeting')}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--primary))] to-teal-400">
              {firstName} !
            </span>
          </h1>
          <p className="mt-5 text-muted-foreground text-base leading-relaxed max-w-[320px]">
            "{t('quote')}"
          </p>
        </header>

        {/* STATS ROW - Référence de taille */}
        <section className="grid grid-cols-2 gap-5">
          <StatCard 
            title={nav('my_courses')} 
            value={stats.total.toString()} 
            icon={BookOpen} 
            isLoading={loadingData} 
          />
          <StatCard 
            title={t('certificates')} 
            value={stats.completed.toString()} 
            icon={Trophy} 
            isLoading={loadingData} 
          />
        </section>

        {/* REPRENDRE L'ÉTUDE */}
        <div className="pt-2">
          <ContinueLearning />
        </div>

        {/* MATHIAS IA - TAILLE PRESQUE IDENTIQUE AUX STAT CARDS */}
        <section>
          <Link 
            href={`/${locale}/student/tutor`} 
            className="block group active:scale-[0.985] transition-all duration-200"
          >
            <div className="dashboard-card bg-gradient-to-br from-orange-600 to-amber-700 p-6 rounded-3xl shadow-lg relative overflow-hidden border border-white/10 h-[172px] flex flex-col">
              <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />

              <div className="relative z-10 flex items-start justify-between flex-1">
                <div className="flex-1 space-y-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Bot size={15} className="text-white" />
                    </div>
                    <span className="text-white/90 text-[10px] font-bold uppercase tracking-widest">
                      MATHIAS IA
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white leading-tight tracking-tight">
                    {t('tutor_box_title')}
                  </h3>

                  <p className="text-white/75 text-sm leading-snug line-clamp-2">
                    "{t('tutor_box_desc')}"
                  </p>
                </div>

                <div className="flex-shrink-0 w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 mt-1">
                  <Sparkles className="h-9 w-9 text-white animate-pulse" />
                </div>
              </div>

              {/* Bouton en bas pour uniformiser la hauteur */}
              <Button 
                size="sm"
                className="bg-white hover:bg-white/95 text-orange-700 font-semibold rounded-2xl h-9 px-5 text-xs shadow-md w-full mt-3"
              >
                {t('ask_question')}
              </Button>
            </div>
          </Link>
        </section>

        {/* RECOMMANDATIONS */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-[0.1em] px-1">
            {t('recommendations')}
          </h2>
          <RecommendedCourses />
        </div>

        {/* ALERTES */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-[0.1em] px-1">
            {t('alerts')}
          </h2>
          <RecentActivity />
        </div>

      </div>

      {/* FAB */}
      <Button 
        asChild 
        className="fixed bottom-8 right-6 h-16 w-16 rounded-3xl bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] shadow-2xl shadow-primary/50 z-50 active:scale-95 transition-all border-none"
      >
        <Link href={`/${locale}/search`}>
          <Search className="h-7 w-7 text-white" />
        </Link>
      </Button>
    </div>
  );
}

function nav(key: string) {
  const t = useTranslations('Nav');
  return t(key);
}