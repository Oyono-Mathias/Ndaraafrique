
'use client';

/**
 * @fileOverview Dashboard Formateur Ndara Afrique.
 * ✅ ANALYTICS 2.0 : Funnel de conversion (Clics -> Inscriptions -> Ventes).
 * ✅ MOTIVATION : Lien direct vers le Leaderboard public.
 */

import { useRole } from '@/context/RoleContext';
import { 
  collection, 
  query, 
  where, 
  getFirestore, 
  onSnapshot, 
  doc,
  orderBy,
  limit
} from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  ClipboardCheck, 
  TrendingUp, 
  Zap,
  Landmark,
  UserPlus,
  Share2,
  Wallet,
  BadgeEuro,
  UserCheck,
  ShieldCheck,
  Clock,
  MessageCircle,
  Medal,
  Link as LinkIcon,
  History,
  ArrowUpRight,
  Facebook,
  Linkedin,
  Twitter,
  ArrowRight,
  PieChart
} from 'lucide-react';
import type { AssignmentSubmission, Settings, NdaraUser, ReferralCommission } from '@/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function InstructorDashboard() {
    const { currentUser: instructor, isUserLoading } = useRole();
    const db = getFirestore();
    const { toast } = useToast();
    const locale = useLocale();

    const [stats, setStats] = useState({ totalRevenue: 0, studentCount: 0, referralsCount: 0 });
    const [pendingSubmissions, setPendingSubmissions] = useState<AssignmentSubmission[]>([]);
    const [referralHistory, setReferralHistory] = useState<ReferralCommission[]>([]);
    const [coursePerformance, setCoursePerformance] = useState<{title: string, revenue: number}[]>([]);
    const [isReferralEnabled, setIsReferralEnabled] = useState(false);
    const [leaderboard, setLeaderboard] = useState<NdaraUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!instructor?.uid) return;

        const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as Settings;
                setIsReferralEnabled(data.commercial?.referralEnabled ?? true);
            }
        });

        // Revenus & Performance
        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('instructorId', '==', instructor.uid), where('status', '==', 'Completed')),
            (snap) => {
                const total = snap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
                const performanceMap = new Map<string, number>();
                snap.docs.forEach(d => {
                    const data = d.data();
                    performanceMap.set(data.courseTitle || 'Cours', (performanceMap.get(data.courseTitle) || 0) + data.amount);
                });
                setStats(prev => ({ ...prev, totalRevenue: total }));
                setCoursePerformance(Array.from(performanceMap.entries()).map(([title, revenue]) => ({ title, revenue })).sort((a, b) => b.revenue - a.revenue));
            }
        );

        // Historique des commissions parrainage
        const unsubRefCommissions = onSnapshot(
            query(
                collection(db, 'referral_commissions'), 
                where('instructorId', '==', instructor.uid),
                orderBy('timestamp', 'desc'),
                limit(5)
            ),
            (snap) => {
                setReferralHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReferralCommission)));
            }
        );

        // Leaderboard des Experts (Top 5 local)
        const leaderboardQuery = query(
            collection(db, 'users'),
            where('role', '==', 'instructor'),
            orderBy('affiliateStats.sales', 'desc'),
            limit(5)
        );
        const unsubLeaderboard = onSnapshot(leaderboardQuery, (snap) => {
            setLeaderboard(snap.docs.map(d => ({ uid: d.id, ...d.data() } as NdaraUser)));
        });

        const unsubReferrals = onSnapshot(
            query(collection(db, 'users'), where('referredBy', '==', instructor.uid)),
            (snap) => {
                setStats(prev => ({ ...prev, referralsCount: snap.size }));
                setIsLoading(false);
            }
        );

        const unsubDevoirs = onSnapshot(
            query(collection(db, 'devoirs'), where('instructorId', '==', instructor.uid), where('status', '==', 'submitted')),
            (snap) => {
                setPendingSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignmentSubmission)));
            }
        );

        return () => { 
            unsubSettings(); 
            unsubPayments(); 
            unsubLeaderboard(); 
            unsubReferrals(); 
            unsubDevoirs(); 
            unsubRefCommissions();
        };
    }, [instructor?.uid, db]);

    const inviteUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/${locale}/invite/${instructor?.username}`
        : '';

    const handleShareReferral = (provider?: string) => {
        let url = '';
        const text = `Rejoins l'élite des formateurs sur Ndara Afrique ! 🌍 Partage ton savoir et génère des revenus : ${inviteUrl}`;
        
        switch(provider) {
            case 'wa': 
                url = `https://wa.me/?text=${encodeURIComponent(text)}`; 
                break;
            case 'fb':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`;
                break;
            case 'li':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteUrl)}`;
                break;
            default: 
                navigator.clipboard.writeText(inviteUrl);
                toast({ title: "Lien d'invitation copié !", description: "Utilisez cet alias court pour vos bios." });
                return;
        }
        if (url) window.open(url, '_blank');
    };

    // ✅ CALCUL DU TAUX DE CONVERSION
    const conversionRate = useMemo(() => {
        const clicks = instructor?.affiliateStats?.clicks || 0;
        const sales = instructor?.affiliateStats?.sales || 0;
        if (clicks === 0) return 0;
        return ((sales / clicks) * 100).toFixed(1);
    }, [instructor]);

    if (isUserLoading || isLoading) {
        return <div className="p-4 space-y-6 bg-slate-950 min-h-screen"><Skeleton className="h-10 w-3/4 bg-slate-900 rounded-xl" /><Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" /></div>;
    }

    const aff = instructor?.affiliateStats || { clicks: 0, registrations: 0, sales: 0, earnings: 0 };

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
            
            <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black text-white leading-tight">Espace <span className="text-primary">Formateur</span></h1>
                        <p className="text-slate-500 text-sm mt-2 font-medium italic">Pilotez votre académie panafricaine.</p>
                    </div>
                    <Button asChild variant="outline" className="h-10 rounded-xl border-slate-800 bg-slate-900 text-primary font-black uppercase text-[9px] tracking-widest">
                        <Link href="/leaderboard">
                            <Medal className="mr-2 h-3.5 w-3.5" /> Bourse
                        </Link>
                    </Button>
                </div>
            </header>

            {/* --- SECTION ANALYTICS FUNNEL --- */}
            {isReferralEnabled && (
                <section className="px-4 space-y-6">
                    <Card className="bg-gradient-to-br from-slate-900 to-primary/10 border-2 border-primary/30 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardContent className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                        <PieChart className="h-5 w-5 text-primary" /> Funnel & Conversion
                                    </h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Analytics Réseau</p>
                                </div>
                                <div className="p-3 bg-primary/20 rounded-2xl text-primary font-black text-sm">{conversionRate}%</div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 text-center">
                                    <Clock className="h-3 w-3 mx-auto text-slate-500 mb-1" />
                                    <p className="text-xl font-black text-white">{aff.clicks}</p>
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Clics</p>
                                </div>
                                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 text-center">
                                    <UserCheck className="h-3 w-3 mx-auto text-blue-400 mb-1" />
                                    <p className="text-xl font-black text-white">{aff.registrations}</p>
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Inscriptions</p>
                                </div>
                                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 text-center">
                                    <ShoppingCart className="h-3 w-3 mx-auto text-emerald-400 mb-1" />
                                    <p className="text-xl font-black text-white">{aff.sales}</p>
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Ventes</p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mon Alias d'Invitation</p>
                                    <span className="text-[10px] font-mono text-primary truncate">invite/{instructor?.username}</span>
                                </div>
                                
                                <div className="grid grid-cols-4 gap-2">
                                    <Button onClick={() => handleShareReferral('wa')} className="h-12 bg-[#25D366] hover:bg-[#25D366]/90 text-white rounded-xl shadow-lg transition-transform active:scale-90 p-0">
                                        <MessageCircle size={20}/>
                                    </Button>
                                    <Button onClick={() => handleShareReferral('fb')} className="h-12 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white rounded-xl shadow-lg transition-transform active:scale-90 p-0">
                                        <Facebook size={20}/>
                                    </Button>
                                    <Button onClick={() => handleShareReferral('li')} className="h-12 bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white rounded-xl shadow-lg transition-transform active:scale-90 p-0">
                                        <Linkedin size={20}/>
                                    </Button>
                                    <Button onClick={() => handleShareReferral()} className="h-12 bg-primary text-white rounded-xl shadow-lg transition-transform active:scale-90 p-0">
                                        <Share2 size={20}/>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* HISTORIQUE RÉCENT DES COMMISSIONS RÉSEAU */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1">
                            <History className="h-4 w-4 text-primary" /> Historique du Réseau
                        </h3>
                        {referralHistory.length > 0 ? (
                            <div className="grid gap-3">
                                {referralHistory.map(comm => (
                                    <Card key={comm.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden active:scale-[0.98] transition-all">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-200 truncate">{comm.studentName}</p>
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-tighter truncate max-w-[150px]">
                                                        {comm.courseTitle}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-emerald-400">+{comm.commission.toLocaleString('fr-FR')} <span className="text-[8px] opacity-50">XOF</span></p>
                                                <p className="text-[8px] font-bold text-slate-600 uppercase">
                                                    {(comm.timestamp as any)?.toDate ? format((comm.timestamp as any).toDate(), 'dd/MM/yy', { locale: fr }) : '...'}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="p-10 text-center border-2 border-dashed border-slate-800 rounded-[2rem] opacity-30">
                                <History className="h-8 w-8 mx-auto mb-3" />
                                <p className="text-[10px] font-black uppercase">Aucun gain réseau</p>
                            </div>
                        )}
                    </div>

                    {/* LIEN VERS LE LEADERBOARD GLOBAL */}
                    <Button asChild variant="ghost" className="w-full h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-primary transition-all">
                        <Link href="/leaderboard">
                            Voir le classement complet des experts
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </section>
            )}

            <section className="px-4 grid grid-cols-2 gap-3">
                <Link href="/instructor/revenus" className="block active:scale-95 transition-transform">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] shadow-xl relative overflow-hidden h-full">
                        <div className="p-2 bg-primary/10 rounded-xl inline-block mb-3"><Landmark className="h-5 w-5 text-primary" /></div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Trésorerie</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl font-black text-white">{stats.totalRevenue.toLocaleString('fr-FR')}</span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">XOF</span>
                        </div>
                    </div>
                </Link>
                <Link href="/instructor/students" className="block active:scale-95 transition-transform">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] shadow-xl relative overflow-hidden h-full">
                        <div className="p-2 bg-blue-500/10 rounded-xl inline-block mb-3"><Users className="h-5 w-5 text-blue-400" /></div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Ma Communauté</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl font-black text-white">{stats.studentCount}</span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">Ndara</span>
                        </div>
                    </div>
                </Link>
            </section>

            <section className="px-4 space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />Travaux à Noter</h2>
                    {pendingSubmissions.length > 0 && <Badge className="bg-primary text-primary-foreground border-none rounded-full px-2">{pendingSubmissions.length}</Badge>}
                </div>
                {pendingSubmissions.length > 0 ? (
                    <div className="grid gap-3">
                        {pendingSubmissions.map(sub => (
                            <Card key={sub.id} className="bg-slate-900 border border-slate-800 rounded-3xl active:scale-[0.98] transition-all border-l-4 border-l-primary shadow-xl">
                                <CardContent className="p-5 flex items-center justify-between">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <p className="text-sm font-bold text-white truncate">{sub.studentName}</p>
                                        <p className="text-[10px] text-slate-500 truncate italic opacity-70">"{sub.assignmentTitle}"</p>
                                    </div>
                                    <Button size="sm" asChild className="rounded-xl h-10 px-4 font-bold bg-slate-800 hover:bg-primary text-white border-none"><Link href="/instructor/devoirs">Noter</Link></Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800/50">
                        <Zap className="h-8 w-8 mx-auto text-slate-800 mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Aucun travail en attente</p>
                    </div>
                )}
            </section>

            <section className="px-4 space-y-4">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1"><TrendingUp className="h-4 w-4" />Top Formations</h2>
                <div className="grid gap-3">
                    {coursePerformance.map((course, idx) => (
                        <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 font-black text-xs text-primary">#{idx + 1}</div>
                                <span className="text-xs font-bold text-slate-300 truncate">{course.title}</span>
                            </div>
                            <span className="text-sm font-black text-white shrink-0 ml-4">{course.revenue.toLocaleString('fr-FR')} <span className="text-[9px] text-slate-600">XOF</span></span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
  );
}
