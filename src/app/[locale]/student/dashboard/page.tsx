
'use client';

/**
 * @fileOverview Dashboard Étudiant Ndara Afrique Optimisé.
 * ✅ PERFORMANCE : Chargement dynamique des sous-sections lourdes.
 */

import { useRole } from '@/context/RoleContext';
import dynamic from 'next/dynamic';
import { BookOpen, Trophy, TrendingUp, Search as LucideSearch, BadgeEuro, Share2, ChevronRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, orderBy, getDocs, doc } from 'firebase/firestore';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// Chargement dynamique des composants de données pour un démarrage plus rapide
const ContinueLearning = dynamic(() => import('@/components/dashboards/ContinueLearning').then(mod => mod.ContinueLearning), { 
    loading: () => <Skeleton className="h-48 w-full rounded-[2rem] bg-slate-100 dark:bg-slate-800" />
});
const RecommendedCourses = dynamic(() => import('@/components/dashboards/RecommendedCourses').then(mod => mod.RecommendedCourses), {
    loading: () => <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-100 dark:bg-slate-800" />
});
const RecentActivity = dynamic(() => import('@/components/dashboards/RecentActivity').then(mod => mod.RecentActivity), {
    loading: () => <Skeleton className="h-48 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
});
const StatCard = dynamic(() => import('@/components/dashboard/StatCard').then(mod => mod.StatCard), {
    loading: () => <Skeleton className="h-24 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
});

export default function StudentDashboardAndroid() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const locale = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [isAffiliateEnabled, setIsAffiliateEnabled] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // Écouteur Stats & Réglages
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) {
            const data = snap.data() as Settings;
            setIsAffiliateEnabled(data.commercial?.affiliateEnabled ?? true);
        }
    });

    const unsubEnroll = onSnapshot(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)), (snap) => {
      const total = snap.size;
      const completed = snap.docs.filter(d => d.data().progress === 100).length;
      setStats({ total, completed });
      setLoadingData(false);
    });

    return () => { unsubSettings(); unsubEnroll(); };
  }, [currentUser?.uid, db]);

  const handleShareAffiliate = () => {
      const url = `${window.location.origin}/search?aff=${currentUser?.uid}`;
      navigator.clipboard.writeText(url);
      toast({ title: "Lien Ambassadeur copié !", description: "Partagez-le sur vos réseaux pour gagner des commissions." });
  };

  if (isUserLoading) {
    return (
      <div className="space-y-6 p-4 bg-background min-h-screen">
        <Skeleton className="h-10 w-3/4 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl bg-muted" />
            <Skeleton className="h-24 rounded-2xl bg-muted" />
        </div>
        <Skeleton className="h-64 w-full rounded-3xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24 bg-background min-h-screen relative overflow-hidden bg-grainy">
      
      <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl font-black text-foreground leading-tight">
          Bara ala, <br/>
          <span className="text-primary">{currentUser?.fullName?.split(' ')[0]} !</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-2 font-medium italic">Votre empire du savoir est prêt.</p>
      </header>

      {/* --- SECTION AMBASSADEUR --- */}
      {isAffiliateEnabled && (
          <section className="px-4">
              <Card className="bg-slate-900 border-2 border-primary/20 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                  <div className="absolute top-0 right-0 p-6 opacity-10"><BadgeEuro size={80} className="text-primary" /></div>
                  <CardContent className="p-8 space-y-6">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg"><TrendingUp className="h-5 w-5 text-primary" /></div>
                          <h2 className="text-xl font-black text-white uppercase tracking-tight">Espace Ambassadeur</h2>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Gains cumulés</p>
                              <p className="text-2xl font-black text-white">{(currentUser?.affiliateBalance || 0).toLocaleString('fr-FR')} <span className="text-xs text-primary">XOF</span></p>
                          </div>
                          <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                              <Button 
                                variant="ghost" 
                                className="h-auto p-0 text-[10px] font-black text-primary uppercase tracking-widest justify-start hover:bg-transparent" 
                                onClick={() => router.push('/student/paiements')}
                              >
                                  Retirer mes gains <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                          </div>
                      </div>

                      <Button onClick={handleShareAffiliate} className="w-full h-12 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-primary/20 active:scale-95">
                          <Share2 className="h-4 w-4" /> Copier mon lien Ambassadeur
                      </Button>
                  </CardContent>
              </Card>
          </section>
      )}

      <section className="px-4 grid grid-cols-2 gap-3">
        <StatCard title="Formations" value={stats.total.toString()} icon={BookOpen} isLoading={loadingData} />
        <StatCard title="Certificats" value={stats.completed.toString()} icon={Trophy} isLoading={loadingData} />
      </section>

      <div className="px-4"><ContinueLearning /></div>

      <div className="px-4 space-y-10">
        <RecommendedCourses />
        <RecentActivity />
      </div>

      <Button asChild className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/40 z-50 transition-transform active:scale-90 p-0 flex items-center justify-center">
        <Link href={`/${locale}/search`}>
          <LucideSearch className="h-6 w-6 text-primary-foreground" />
        </Link>
      </Button>
    </div>
  );
}
