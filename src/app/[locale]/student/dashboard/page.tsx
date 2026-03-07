'use client';

/**
 * @fileOverview Dashboard Étudiant Ndara Afrique.
 * ✅ NOUVEAU : Bloc Ambassadeur pour gagner de l'argent avec Ndara.
 */

import { useRole } from '@/context/RoleContext';
import { ContinueLearning } from '@/components/dashboards/ContinueLearning';
import { RecentActivity } from '@/components/dashboards/RecentActivity';
import { StatCard } from '@/components/dashboard/StatCard';
import { BookOpen, Trophy, Sparkles, Search as LucideSearch, Bot, BadgeEuro, Share2, Wallet, TrendingUp } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, orderBy, getDocs, doc } from 'firebase/firestore';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { CourseCard } from '@/components/cards/CourseCard';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { useToast } from '@/hooks/use-toast';

export default function StudentDashboardAndroid() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const locale = useLocale();
  const { toast } = useToast();
  
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
  const [isAffiliateEnabled, setIsAffiliateEnabled] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // 1. Écouteur Stats & Réglages
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
    });

    // 2. Chargement du Catalogue
    const unsubCourses = onSnapshot(query(collection(db, 'courses'), where('status', '==', 'Published'), orderBy('createdAt', 'desc')), async (snap) => {
      const coursesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setAllCourses(coursesData);
      
      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId))];
        const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30))));
        const newMap = new Map();
        usersSnap.forEach(d => newMap.set(d.id, d.data()));
        setInstructorsMap(newMap);
      }
      setLoadingData(false);
    });

    return () => { unsubSettings(); unsubEnroll(); unsubCourses(); };
  }, [currentUser?.uid, db]);

  const handleShareAffiliate = () => {
      const url = `${window.location.origin}/search?aff=${currentUser?.uid}`;
      navigator.clipboard.writeText(url);
      toast({ title: "Lien Ambassadeur copié !", description: "Partagez-le sur vos réseaux pour gagner des commissions." });
  };

  if (isUserLoading) {
    return <div className="space-y-6 p-4 bg-background min-h-screen"><Skeleton className="h-10 w-3/4 bg-muted rounded-xl" /><Skeleton className="h-64 w-full rounded-3xl bg-muted" /></div>;
  }

  return (
    <div className="flex flex-col gap-8 pb-24 bg-background min-h-screen relative overflow-hidden bg-grainy">
      
      <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl font-black text-foreground leading-tight">
          Bara ala, <br/>
          <span className="text-primary">{currentUser?.fullName?.split(' ')[0]} !</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-2 font-medium">L'excellence vous appartient.</p>
      </header>

      {/* --- SECTION AMBASSADEUR (SI ACTIVÉ) --- */}
      {isAffiliateEnabled && (
          <section className="px-4 animate-in zoom-in duration-700">
              <Card className="bg-slate-900 border-2 border-primary/20 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                  <div className="absolute top-0 right-0 p-6 opacity-10"><BadgeEuro size={80} className="text-primary" /></div>
                  <CardContent className="p-8 space-y-6">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg"><TrendingUp className="h-5 w-5 text-primary" /></div>
                          <h2 className="text-xl font-black text-white uppercase tracking-tight">Espace Ambassadeur</h2>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Solde disponible</p>
                              <p className="text-2xl font-black text-white">{(currentUser?.affiliateBalance || 0).toLocaleString('fr-FR')} <span className="text-xs text-primary">XOF</span></p>
                          </div>
                          <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                              <Button variant="ghost" className="h-auto p-0 text-[10px] font-black text-primary uppercase tracking-widest justify-start hover:bg-transparent" onClick={() => router.push('/student/paiements')}>
                                  Retirer mes gains <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                          </div>
                      </div>

                      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                          <p className="text-xs text-slate-300 leading-relaxed font-medium">
                              Gagnez de l'argent en partageant les formations Ndara. Vous touchez une commission sur chaque vente effectuée via votre lien.
                          </p>
                          <Button onClick={handleShareAffiliate} className="w-full h-12 bg-primary text-white rounded-xl mt-4 font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-primary/20 active:scale-95">
                              <Share2 className="h-4 w-4" /> Copier mon lien de vente
                          </Button>
                      </div>
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