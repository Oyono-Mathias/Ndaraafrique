'use client';

/**
 * @fileOverview Dashboard Étudiant Ndara Afrique (Design Qwen Immersif).
 * ✅ I18N : Support multilingue complet.
 * ✅ REAL-TIME : Raccordement Firestore pour les statistiques.
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
  Search,
  Bell
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ContinueLearning } from '@/components/dashboards/ContinueLearning';
import { RecommendedCourses } from '@/components/dashboards/RecommendedCourses';
import { RecentActivity } from '@/components/dashboards/RecentActivity';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = currentUser?.fullName?.split(' ')[0] || common('ndara_term');

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-32">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] -ml-40 -mb-40 pointer-events-none" />

      {/* Internal Header */}
      <header className="fixed top-0 w-full z-50 glass safe-top md:hidden">
        <div className="px-6 py-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-0.5">{common('greeting')}</p>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">{firstName}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button className="w-10 h-10 rounded-full glass-light flex items-center justify-center text-gray-400 hover:text-white transition relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-black"></span>
                    </button>
                    <Link href={`/${locale}/student/profile`}>
                        <Avatar className="h-10 w-10 border-2 border-primary/50 shadow-lg">
                            <AvatarImage src={currentUser?.profilePictureURL} className="object-cover" />
                            <AvatarFallback className="bg-slate-800 text-slate-400 font-bold">
                                {firstName.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                </div>
            </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-28 md:pt-10 px-6 overflow-y-auto hide-scrollbar space-y-8 animate-in fade-in duration-700">
        
        {/* Continue Learning - Immersive Component */}
        <ContinueLearning />

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-4">
          <StatCard 
            title="Formations" 
            value={stats.total.toString()} 
            icon={BookOpen} 
            isLoading={loadingData}
            accentColor="bg-blue-500/20 text-blue-400"
          />
          <StatCard 
            title="Diplômes" 
            value={stats.completed.toString()} 
            icon={Trophy} 
            isLoading={loadingData}
            accentColor="bg-amber-500/20 text-amber-400"
          />
        </section>

        {/* MATHIAS IA - Floating Effect */}
        <section>
          <Link 
            href={`/${locale}/student/tutor`} 
            className="block group active:scale-[0.98] transition-all"
          >
            <div className="glass rounded-4xl p-6 border border-primary/30 relative overflow-hidden flex items-center gap-5">
                <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center shadow-xl floating">
                    <Bot className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">MATHIAS IA</h2>
                    <p className="text-gray-400 text-xs font-medium italic">Ton tuteur personnel 24/7</p>
                </div>
                <div className="w-8 h-8 rounded-full glass-light flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors">
                    <ChevronRight className="h-5 w-5" />
                </div>
            </div>
          </Link>
        </section>

        {/* Recommended Courses Horizontal Scroll */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">{t('recommendations')}</h2>
            <Link href={`/${locale}/search`} className="text-primary text-[10px] font-black uppercase tracking-widest">{t('view_all') || 'Voir tout'}</Link>
          </div>
          <RecommendedCourses />
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-widest px-1">{t('alerts')}</h2>
          <RecentActivity />
        </div>

      </main>

      {/* FAB Search Button */}
      <Button 
        asChild 
        className="fixed bottom-24 right-6 h-16 w-16 rounded-full bg-primary hover:bg-emerald-400 shadow-2xl shadow-primary/40 z-50 transition-all active:scale-90 border-none"
      >
        <Link href={`/${locale}/search`}>
          <Search className="h-7 w-7 text-slate-950" />
          <span className="sr-only">Rechercher</span>
        </Link>
      </Button>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
    return <div className={cn("animate-spin", className)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
    </div>
}