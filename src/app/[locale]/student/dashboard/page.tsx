'use client';

/**
 * @fileOverview Dashboard Étudiant Ndara Afrique (Design Qwen Redesign 2026).
 * ✅ I18N : Utilisation des traductions pour le multilingue.
 * ✅ RÉACTIONNEL : Les textes basculent instantanément au switch de langue.
 * ✅ Amélioré : Typographie pro, espacement cohérent, radius mature, hiérarchie claire.
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
        <div className="dashboard-container px-6 pt-12 space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-11 w-3/4 rounded-2xl bg-muted" />
            <Skeleton className="h-4 w-2/3 rounded-lg bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-36 rounded-3xl bg-muted" />
            <Skeleton className="h-36 rounded-3xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  const firstName = currentUser?.fullName?.split(' ')[0] || common('ndara_term');

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Grain overlay global */}
      <div className="grain-overlay" />

      {/* Conteneur principal avec largeur contrôlée */}
      <div className="dashboard-container px-6 pt-12 space-y-10">

        {/* --- HEADER SALUTATION --- */}
        <header className="animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-3xl font-black text-foreground leading-tight tracking-tight">
            {common('greeting')}<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--primary))] to-teal-400">
              {firstName} !
            </span>
          </h1>
          <p className="mt-4 text-muted-foreground text-base font-light max-w-[300px]">
            "{t('quote')}"
          </p>
        </header>

        {/* --- STATS ROW --- */}
        <section className="grid grid-cols-2 gap-4">
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

        {/* --- REPRENDRE L'ÉTUDE --- */}
        <div>
          <ContinueLearning />
        </div>

        {/* --- IA MATHIAS (version plus mature) --- */}
        <section>
          <Link 
            href={`/${locale}/student/tutor`} 
            className="block group active:scale-[0.985] transition-all duration-200"
          >
            <div className="dashboard-card bg-gradient-to-br from-[#CC7722] to-[#9a5a1a] p-7 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-12 -mt-12" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/15 rounded-full blur-2xl -ml-8 -mb-10" />

              <div className="relative z-10 flex items-start justify-between">
                <div className="max-w-[68%] space-y-5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                      <Bot size={16} className="text-white" />
                    </div>
                    <span className="text-white/90 text-xs font-black uppercase tracking-[0.15em]">
                      MATHIAS IA
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-white leading-tight tracking-tight">
                    {t('tutor_box_title')}
                  </h3>

                  <p className="text-white/75 text-[15px] leading-relaxed">
                    "{t('tutor_box_desc')}"
                  </p>

                  <Button 
                    className="bg-white text-[#CC7722] hover:bg-white/95 rounded-2xl text-sm font-semibold h-11 px-7 shadow-md"
                  >
                    {t('ask_question')}
                  </Button>
                </div>

                <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/25 flex-shrink-0">
                  <Sparkles className="h-12 w-12 text-white animate-pulse" />
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* --- RECOMMANDATIONS --- */}
        <div className="space-y-5">
          <h2 className="text-sm font-black text-muted-foreground uppercase tracking-[0.125em] px-1">
            {t('recommendations')}
          </h2>
          <RecommendedCourses />
        </div>

        {/* --- ACTIVITÉ RÉCENTE --- */}
        <div className="space-y-5">
          <h2 className="text-sm font-black text-muted-foreground uppercase tracking-[0.125em] px-1">
            {t('alerts')}
          </h2>
          <RecentActivity />
        </div>

      </div>

      {/* --- ANDROID FAB --- */}
      <Button 
        asChild 
        className="fixed bottom-8 right-6 h-16 w-16 rounded-3xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/50 z-50 active:scale-95 transition-all border-none"
      >
        <Link href={`/${locale}/search`}>
          <Search className="h-7 w-7 text-white" />
        </Link>
      </Button>
    </div>
  );
}

// Helper local
function nav(key: string) {
  const t = useTranslations('Nav');
  return t(key);
}