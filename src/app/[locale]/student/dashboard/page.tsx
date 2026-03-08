'use client';

/**
 * @fileOverview Dashboard Étudiant Ndara Afrique Optimisé.
 * ✅ AMBASSADEUR 2.0 : Métriques précises (Clics, Inscriptions, Ventes).
 * ✅ TRANSPARENCE : Chaque action via le lien est comptabilisée pour l'étudiant.
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
    Sparkles, 
    MousePointer2, 
    ShoppingCart,
    Medal,
    Users
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit, doc, getDocs } from 'firebase/firestore';
import type { NdaraUser, Settings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const [leaderboard, setLeaderboard] = useState<Partial<NdaraUser>[]>([]);
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

    // Fetch Leaderboard
    const fetchLeaderboard = async () => {
        try {
            const q = query(
                collection(db, 'users'), 
                orderBy('affiliateStats.sales', 'desc'), 
                limit(5)
            );
            const snap = await getDocs(q);
            setLeaderboard(snap.docs.map(d => ({ uid: d.id, ...d.data() } as NdaraUser)));
        } catch (e) {
            console.warn("Leaderboard index not ready yet.");
        }
    };
    fetchLeaderboard();

    return () => { unsubSettings(); unsubEnroll(); };
  }, [currentUser?.uid, db]);

  const handleShareAffiliate = () => {
      const url = `${window.location.origin}/${locale}/search?aff=${currentUser?.uid}`;
      navigator.clipboard.writeText(url);
      toast({ title: "Lien Ambassadeur copié !", description: "Partagez-le pour gagner des commissions." });
  };

  const affStats = currentUser?.affiliateStats || { clicks: 0, registrations: 0, sales: 0, earnings: 0 };
  const salesCount = affStats.sales || 0;
  
  const nextTier = useMemo(() => {
      if (salesCount < 5) return { goal: 5, bonus: "+2%", current: salesCount };
      if (salesCount < 20) return { goal: 20, bonus: "+5%", current: salesCount };
      if (salesCount < 50) return { goal: 50, bonus: "+10%", current: salesCount };
      return { goal: 50, bonus: "MAX", current: 50 };
  }, [salesCount]);

  if (isUserLoading) return <div className="p-4 bg-slate-950 min-h-screen space-y-6"><Skeleton className="h-10 w-3/4 rounded-xl bg-slate-900" /></div>;

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
      
      <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl font-black text-white leading-tight">
          Bara ala, <br/>
          <span className="text-primary">{currentUser?.fullName?.split(' ')[0]} !</span>
        </h1>
        <p className="text-slate-500 text-sm mt-2 font-medium italic">Votre empire du savoir s'étend.</p>
      </header>

      {/* --- SECTION AMBASSADEUR 2.0 --- */}
      {isAffiliateEnabled && (
          <section className="px-4 space-y-4">
              <div className="flex items-center gap-2 px-1">
                  <Medal className="h-4 w-4 text-primary" />
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Mon Impact Ambassadeur</h2>
              </div>

              <Card className="bg-slate-900 border-2 border-primary/20 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none"><BadgeEuro size={120} className="text-primary" /></div>
                  <CardContent className="p-8 space-y-8">
                      
                      <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-950/50 p-4 rounded-3xl border border-white/5 space-y-1 text-center">
                              <MousePointer2 className="h-3 w-3 mx-auto text-slate-500 mb-1" />
                              <p className="text-xl font-black text-white">{affStats.clicks || 0}</p>
                              <span className="text-[8px] font-black uppercase text-slate-600 tracking-tighter">Clics</span>
                          </div>
                          <div className="bg-slate-950/50 p-4 rounded-3xl border border-white/5 space-y-1 text-center">
                              <Users className="h-3 w-3 mx-auto text-blue-400 mb-1" />
                              <p className="text-xl font-black text-white">{affStats.registrations || 0}</p>
                              <span className="text-[8px] font-black uppercase text-slate-600 tracking-tighter">Inscrits</span>
                          </div>
                          <div className="bg-slate-950/50 p-4 rounded-3xl border border-white/5 space-y-1 text-center">
                              <ShoppingCart className="h-3 w-3 mx-auto text-emerald-400 mb-1" />
                              <p className="text-xl font-black text-white">{salesCount}</p>
                              <span className="text-[8px] font-black uppercase text-slate-600 tracking-tighter">Ventes</span>
                          </div>
                      </div>

                      <div className="bg-primary/10 border border-primary/20 p-6 rounded-[2rem] flex justify-between items-center">
                          <div>
                              <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Solde Retirable</p>
                              <p className="text-3xl font-black text-white mt-1">{(currentUser?.affiliateBalance || 0).toLocaleString('fr-FR')} <span className="text-xs">XOF</span></p>
                          </div>
                          <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                               <Button variant="ghost" className="h-auto p-0 text-[10px] font-black text-primary uppercase tracking-widest justify-start hover:bg-transparent" onClick={() => router.push('/student/paiements')}>
                                   Retirer mes gains <ChevronRight className="h-3 w-3 ml-1" />
                               </Button>
                           </div>
                      </div>

                      <div className="space-y-3">
                          <div className="flex justify-between items-end">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progression Bonus</p>
                              <span className="text-[10px] font-black text-primary uppercase">{nextTier.goal - nextTier.current} ventes avant {nextTier.bonus}</span>
                          </div>
                          <Progress value={(nextTier.current / nextTier.goal) * 100} className="h-2 bg-slate-800" indicatorClassName="bg-primary" />
                      </div>

                      <Button onClick={handleShareAffiliate} className="w-full h-16 bg-white text-slate-950 hover:bg-slate-100 rounded-2xl font-black uppercase text-xs tracking-widest gap-3 shadow-xl active:scale-95 transition-all">
                          <Share2 className="h-5 w-5" /> Partager mon lien viral
                      </Button>
                  </CardContent>
              </Card>

              {leaderboard.length > 0 && (
                <Card className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex items-center gap-3">
                        <Medal className="h-4 w-4 text-amber-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Top Ambassadeurs Ndara</h3>
                    </div>
                    <CardContent className="p-4 space-y-3">
                        {leaderboard.map((member, i) => (
                            <div key={member.uid} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className={cn("text-xs font-black w-4", i === 0 ? "text-amber-500" : "text-slate-600")}>#{i+1}</span>
                                    <Avatar className="h-8 w-8 border border-slate-700">
                                        <AvatarImage src={member.profilePictureURL} />
                                        <AvatarFallback className="bg-slate-800 text-[10px]">{member.fullName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-bold text-slate-300 truncate max-w-[120px]">{member.fullName}</span>
                                </div>
                                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black">{member.affiliateStats?.sales || 0} ventes</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
              )}
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
