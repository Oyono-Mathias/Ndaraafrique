'use client';

/**
 * @fileOverview Dashboard Étudiant Ndara Afrique Optimisé.
 * ✅ AMBASSADEUR 3.0 : Sécurisation financière (Pending vs Available) & Compteur Viral.
 */

import { useRole } from '@/context/RoleContext';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { 
    BookOpen, 
    Trophy, 
    Search as LucideSearch, 
    BadgeEuro, 
    Share2, 
    ChevronRight, 
    TrendingUp,
    Users,
    Clock,
    Wallet
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import type { Settings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// Chargement dynamique des composants
const ContinueLearning = dynamic(() => import('@/components/dashboards/ContinueLearning').then(mod => mod.ContinueLearning), { 
    loading: () => <Skeleton className="h-48 w-full rounded-[2rem] bg-slate-800" />
});
const RecommendedCourses = dynamic(() => import('@/components/dashboards/RecommendedCourses').then(mod => mod.RecommendedCourses), {
    loading: () => <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-800" />
});
const RecentActivity = dynamic(() => import('@/components/dashboards/RecentActivity').then(mod => mod.RecentActivity), {
    loading: () => <Skeleton className="h-48 w-full rounded-2xl bg-slate-800" />
});
const StatCard = dynamic(() => import('@/components/dashboard/StatCard').then(mod => mod.StatCard), {
    loading: () => <Skeleton className="h-24 w-full rounded-2xl bg-slate-800" />
});
const NewCoursesExplore = dynamic(() => import('@/components/dashboards/NewCoursesExplore').then(mod => mod.NewCoursesExplore), {
    loading: () => <Skeleton className="h-64 w-full rounded-2xl bg-slate-800" />
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

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) {
            const data = snap.data() as Settings;
            setIsAffiliateEnabled(data.commercial?.affiliateEnabled ?? true);
        }
    });

    const unsubEnroll = onSnapshot(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)), (snap) => {
      setStats({ total: snap.size, completed: snap.docs.filter(d => d.data().progress === 100).length });
      setLoadingData(false);
    });

    return () => { unsubSettings(); unsubEnroll(); };
  }, [currentUser?.uid, db]);

  const handleShareAffiliate = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const url = `${window.location.origin}/${locale}/search?aff=${currentUser?.uid}`;
      navigator.clipboard.writeText(url);
      toast({ title: "Lien Ambassadeur copié !" });
  };
  
  if (isUserLoading) return <div className="p-4 bg-slate-950 min-h-screen space-y-6"><Skeleton className="h-10 w-3/4 rounded-xl bg-slate-900" /></div>;

  const affiliateStats = currentUser?.affiliateStats || { registrations: 0, earnings: 0 };

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
      
      <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl font-black text-white leading-tight">
          Bara ala, <br/>
          <span className="text-primary">{currentUser?.fullName?.split(' ')[0]} !</span>
        </h1>
        <p className="text-slate-500 text-sm mt-2 font-medium italic">Le savoir est votre capital.</p>
      </header>

      {/* --- AMBASSADEUR 3.0 : SÉCURISATION & IMPACT --- */}
      {isAffiliateEnabled && (
          <section className="px-4 space-y-4">
              <Link href="/student/ambassadeur" className="block active:scale-95 transition-transform">
                <Card className="bg-gradient-to-br from-slate-900 to-primary/10 border-2 border-primary/30 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none"><BadgeEuro size={120} className="text-primary" /></div>
                    <CardContent className="p-8 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" /> Ma Croissance
                                </h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Compte Ambassadeur Ndara</p>
                            </div>
                            <div className="p-3 bg-primary/20 rounded-2xl text-primary"><BadgeEuro size={32} /></div>
                        </div>

                        {/* COMPTEUR VIRAL D'IMPACT */}
                        <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-white leading-none">{affiliateStats.registrations}</p>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Personnes aidées à se former</p>
                            </div>
                        </div>

                        {/* DOUBLE FLUX FINANCIER : SÉCURISATION VS DISPONIBLE */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl space-y-1">
                                <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                                    <Clock className="h-3 w-3" />
                                    <span className="text-[8px] font-black uppercase tracking-tighter">En sécurisation (14j)</span>
                                </div>
                                <p className="text-lg font-black text-white leading-none">{(currentUser?.pendingAffiliateBalance || 0).toLocaleString('fr-FR')}</p>
                                <p className="text-[8px] font-bold text-slate-600 uppercase">XOF</p>
                            </div>
                            <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl space-y-1">
                                <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
                                    <Wallet className="h-3 w-3" />
                                    <span className="text-[8px] font-black uppercase tracking-tighter">Solde Disponible</span>
                                </div>
                                <p className="text-lg font-black text-white leading-none">{(currentUser?.affiliateBalance || 0).toLocaleString('fr-FR')}</p>
                                <p className="text-[8px] font-bold text-slate-600 uppercase">XOF</p>
                            </div>
                        </div>

                        <Button onClick={handleShareAffiliate} className="w-full h-14 bg-white text-slate-950 hover:bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 shadow-xl active:scale-95 transition-all">
                            <Share2 className="h-4 w-4" /> Partager mon lien viral
                        </Button>
                    </CardContent>
                </Card>
              </Link>
          </section>
      )}

      <section className="px-4 grid grid-cols-2 gap-3">
        <StatCard title="Formations" value={stats.total.toString()} icon={BookOpen} isLoading={loadingData} />
        <StatCard title="Certificats" value={stats.completed.toString()} icon={Trophy} isLoading={loadingData} />
      </section>

      <div className="px-4"><ContinueLearning /></div>
      <div className="px-4"><NewCoursesExplore /></div>

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
