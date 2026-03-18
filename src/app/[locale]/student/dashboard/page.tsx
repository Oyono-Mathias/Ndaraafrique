'use client';

/**
 * @fileOverview Dashboard Étudiant Ndara Afrique (Design Qwen Redesign).
 * ✅ I18N : Utilisation des traductions pour le multilingue.
 * ✅ RÉACTIONNEL : Les textes basculent instantanément au switch de langue.
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
    const unsubEnroll = onSnapshot(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)), (snap) => {
      setStats({ 
        total: snap.size, 
        completed: snap.docs.filter(d => d.data().progress === 100).length 
      });
      setLoadingData(false);
    });

    return () => unsubEnroll();
  }, [currentUser?.uid, db]);
  
  if (isUserLoading) {
    return (
        <div className="p-6 space-y-8 bg-slate-950 min-h-screen">
            <div className="space-y-2">
                <Skeleton className="h-10 w-2/3 bg-slate-900 rounded-xl" />
                <Skeleton className="h-4 w-1/2 bg-slate-900 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-32 rounded-[2rem] bg-slate-900" />
                <Skeleton className="h-32 rounded-[2rem] bg-slate-900" />
            </div>
        </div>
    );
  }

  const firstName = currentUser?.fullName?.split(' ')[0] || common('ndara_term');

  return (
    <div className="flex flex-col gap-10 pb-24 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
      
      {/* --- HEADER SALUTATION (VINTAGE I18N) --- */}
      <header className="px-6 pt-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl font-black text-white leading-tight uppercase tracking-tight">
          {common('greeting')}<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">{firstName} !</span>
        </h1>
        <p className="font-sans italic text-slate-500 text-sm font-light mt-3 max-w-[280px]">
          "{t('quote')}"
        </p>
      </header>

      {/* --- STATS ROW (FINTECH) --- */}
      <section className="px-6 grid grid-cols-2 gap-4">
        <StatCard title={nav('my_courses')} value={stats.total.toString()} icon={BookOpen} isLoading={loadingData} />
        <StatCard title={t('certificates')} value={stats.completed.toString()} icon={Trophy} isLoading={loadingData} />
      </section>

      {/* --- REPRENDRE L'ÉTUDE (IMMERSIVE) --- */}
      <div className="px-6">
        <ContinueLearning />
      </div>

      {/* --- IA MATHIAS (MAGIC BOX) --- */}
      <section className="px-6">
        <Link href={`/${locale}/student/tutor`} className="block group active:scale-[0.98] transition-all">
            <div className="bg-gradient-to-br from-[#CC7722] to-[#9a5a1a] rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-5 -mb-5" />
                
                <div className="relative z-10 flex items-start justify-between">
                    <div className="max-w-[70%] space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white">
                                <Bot size={14} />
                            </div>
                            <span className="text-white/90 text-[10px] font-black uppercase tracking-[0.2em]">MATHIAS IA</span>
                        </div>
                        <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">
                            {t('tutor_box_title')}
                        </h3>
                        <p className="text-white/80 text-xs font-medium italic">
                            "{t('tutor_box_desc')}"
                        </p>
                        <Button className="bg-white text-[#CC7722] hover:bg-slate-100 rounded-full text-[10px] font-black uppercase h-9 px-6 transition shadow-lg border-none">
                            {t('ask_question')}
                        </Button>
                    </div>
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                        <Sparkles className="h-10 w-10 text-white animate-pulse" />
                    </div>
                </div>
            </div>
        </Link>
      </section>

      {/* --- RECOMMANDATIONS (CAROUSEL) --- */}
      <div className="px-6">
        <h2 className="text-sm font-black text-white uppercase tracking-widest px-1 mb-4">{t('recommendations')}</h2>
        <RecommendedCourses />
      </div>

      {/* --- ACTIVITÉ RÉCENTE --- */}
      <div className="px-6 space-y-4">
        <h2 className="text-sm font-black text-white uppercase tracking-widest px-1">{t('alerts')}</h2>
        <RecentActivity />
      </div>

      {/* --- ANDROID FAB --- */}
      <Button asChild className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/40 z-50 transition-transform active:scale-90 border-none">
        <Link href={`/${locale}/search`}>
          <Search className="h-6 w-6 text-white" />
        </Link>
      </Button>

    </div>
  );
}

// Helper local pour simplifier le code
function nav(key: string) {
    const t = useTranslations('Nav');
    return t(key);
}