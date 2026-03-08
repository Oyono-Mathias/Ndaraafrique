'use client';

/**
 * @fileOverview Dashboard Étudiant Ndara Afrique Optimisé.
 * ✅ AMBASSADEUR 4.0 : Statistiques avancées, Leaderboard et Partage Social.
 * ✅ RÉSOLU : Traçabilité complète du tunnel de vente.
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
    Wallet,
    MousePointer2,
    ShoppingCart,
    Award,
    Star,
    Facebook,
    Twitter,
    Linkedin,
    MessageCircle,
    Medal
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, doc, orderBy, limit } from 'firebase/firestore';
import type { Settings, NdaraUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Chargement dynamique des composants pour la performance
const ContinueLearning = dynamic(() => import('@/components/dashboards/ContinueLearning').then(mod => mod.ContinueLearning));
const RecommendedCourses = dynamic(() => import('@/components/dashboards/RecommendedCourses').then(mod => mod.RecommendedCourses));
const RecentActivity = dynamic(() => import('@/components/dashboards/RecentActivity').then(mod => mod.RecentActivity));
const StatCard = dynamic(() => import('@/components/dashboard/StatCard').then(mod => mod.StatCard));
const NewCoursesExplore = dynamic(() => import('@/components/dashboards/NewCoursesExplore').then(mod => mod.NewCoursesExplore));

export default function StudentDashboardAndroid() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const locale = useLocale();
  const { toast } = useToast();
  
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [isAffiliateEnabled, setIsAffiliateEnabled] = useState(false);
  const [leaderboard, setLeaderboard] = useState<NdaraUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // 1. Réglages globaux
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) {
            const data = snap.data() as Settings;
            setIsAffiliateEnabled(data.commercial?.affiliateEnabled ?? true);
        }
    });

    // 2. Inscriptions personnelles
    const unsubEnroll = onSnapshot(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)), (snap) => {
      setStats({ total: snap.size, completed: snap.docs.filter(d => d.data().progress === 100).length });
      setLoadingData(false);
    });

    // 3. Leaderboard Ambassadeurs (Top 5 par ventes)
    const leaderboardQuery = query(
        collection(db, 'users'),
        where('affiliateStats.sales', '>', 0),
        orderBy('affiliateStats.sales', 'desc'),
        limit(5)
    );
    const unsubLeaderboard = onSnapshot(leaderboardQuery, (snap) => {
        setLeaderboard(snap.docs.map(d => ({ uid: d.id, ...d.data() } as NdaraUser)));
    });

    return () => { unsubSettings(); unsubEnroll(); unsubLeaderboard(); };
  }, [currentUser?.uid, db]);

  const shareUrl = `${window.location.origin}/${locale}/search?aff=${currentUser?.uid}`;

  const shareActions = [
      { name: 'WhatsApp', icon: MessageCircle, color: 'bg-[#25D366]', url: `https://wa.me/?text=${encodeURIComponent("Rejoins-moi sur Ndara Afrique pour apprendre les compétences du futur ! 🚀 " + shareUrl)}` },
      { name: 'Facebook', icon: Facebook, color: 'bg-[#1877F2]', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
      { name: 'X', icon: Twitter, color: 'bg-black', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent("Ma quête du savoir commence sur Ndara Afrique. Rejoignez-nous !")}&url=${encodeURIComponent(shareUrl)}` },
      { name: 'LinkedIn', icon: Linkedin, color: 'bg-[#0A66C2]', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` },
  ];

  const handleCopyLink = () => {
      navigator.clipboard.writeText(shareUrl);
      toast({ title: "Lien copié !", description: "Partage-le pour gagner des commissions." });
  };
  
  if (isUserLoading) return <div className="p-4 bg-slate-950 min-h-screen space-y-6"><Skeleton className="h-10 w-3/4 rounded-xl bg-slate-900" /></div>;

  const aff = currentUser?.affiliateStats || { clicks: 0, registrations: 0, sales: 0, earnings: 0 };

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
      
      <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl font-black text-white leading-tight">
          Bara ala, <br/>
          <span className="text-primary">{currentUser?.fullName?.split(' ')[0]} !</span>
        </h1>
        <p className="text-slate-500 text-sm mt-2 font-medium italic">Le savoir est votre capital.</p>
      </header>

      {/* --- SECTION AMBASSADEUR 4.0 --- */}
      {isAffiliateEnabled && (
          <section className="px-4 space-y-6">
              <Card className="bg-gradient-to-br from-slate-900 to-primary/10 border-2 border-primary/30 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                    <CardContent className="p-8 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" /> Ma Croissance
                                </h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Partenariat Ndara</p>
                            </div>
                            <div className="p-3 bg-primary/20 rounded-2xl text-primary"><BadgeEuro size={32} /></div>
                        </div>

                        {/* TUNNEL DE CONVERSION */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5 text-center">
                                <MousePointer2 className="h-3 w-3 mx-auto text-blue-400 mb-1" />
                                <p className="text-lg font-black text-white">{aff.clicks}</p>
                                <p className="text-[8px] font-black text-slate-600 uppercase">Clics</p>
                            </div>
                            <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5 text-center">
                                <Users className="h-3 w-3 mx-auto text-primary mb-1" />
                                <p className="text-lg font-black text-white">{aff.registrations}</p>
                                <p className="text-[8px] font-black text-slate-600 uppercase">Ndara</p>
                            </div>
                            <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5 text-center">
                                <ShoppingCart className="h-3 w-3 mx-auto text-emerald-400 mb-1" />
                                <p className="text-lg font-black text-white">{aff.sales}</p>
                                <p className="text-[8px] font-black text-slate-600 uppercase">Ventes</p>
                            </div>
                        </div>

                        {/* DOUBLE FLUX FINANCIER */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl">
                                <p className="text-[8px] font-black text-amber-500 uppercase tracking-tighter mb-1">En sécurisation</p>
                                <p className="text-lg font-black text-white">{(currentUser?.pendingAffiliateBalance || 0).toLocaleString('fr-FR')} <span className="text-[10px]">XOF</span></p>
                            </div>
                            <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl">
                                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter mb-1">Disponible</p>
                                <p className="text-lg font-black text-white">{(currentUser?.affiliateBalance || 0).toLocaleString('fr-FR')} <span className="text-[10px]">XOF</span></p>
                            </div>
                        </div>

                        {/* BOUTONS DE PARTAGE SOCIAL */}
                        <div className="space-y-4">
                            <p className="text-[9px] font-black text-slate-500 uppercase text-center tracking-widest">Partager sur mes réseaux</p>
                            <div className="flex justify-between items-center gap-2">
                                {shareActions.map(action => (
                                    <a key={action.name} href={action.url} target="_blank" rel="noopener noreferrer" className={cn("flex-1 h-12 rounded-xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform", action.color)}>
                                        <action.icon size={20} />
                                    </a>
                                ))}
                            </div>
                            <Button onClick={handleCopyLink} className="w-full h-14 bg-white text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl">
                                <Share2 size={16} /> Copier mon lien viral
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* LEADERBOARD AMBASSADEURS */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1">
                        <Medal className="h-4 w-4 text-primary" /> Bourse des Ambassadeurs
                    </h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl">
                        {leaderboard.map((user, idx) => (
                            <div key={user.uid} className={cn("flex items-center justify-between p-4 border-b border-white/5 last:border-0", user.uid === currentUser.uid && "bg-primary/5")}>
                                <div className="flex items-center gap-3">
                                    <div className={cn("h-6 w-6 rounded-full flex items-center justify-center font-black text-[10px]", idx === 0 ? "bg-yellow-500 text-black" : "bg-slate-800 text-slate-500")}>
                                        {idx + 1}
                                    </div>
                                    <span className="text-xs font-bold text-slate-200">{user.fullName} {user.uid === currentUser.uid && "(Moi)"}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-white">{user.affiliateStats?.sales} <span className="text-[8px] text-slate-600 uppercase">Ventes</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PALIERS BONUS */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Objectifs de Gains</h3>
                    <div className="space-y-3">
                        <BonusTier label="5 Ventes" bonus="+2%" current={aff.sales} target={5} />
                        <BonusTier label="20 Ventes" bonus="+5%" current={aff.sales} target={20} />
                        <BonusTier label="50 Ventes" bonus="+10%" current={aff.sales} target={50} />
                    </div>
                </div>
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

function BonusTier({ label, bonus, current, target }: any) {
    const progress = Math.min(100, (current / target) * 100);
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className={cn(current >= target ? "text-emerald-500" : "text-slate-500")}>{label} ({bonus})</span>
                <span className="text-slate-600">{current}/{target}</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all duration-1000", current >= target ? "bg-emerald-500" : "bg-primary")} style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
}
