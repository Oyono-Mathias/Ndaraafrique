'use client';

/**
 * @fileOverview Dashboard Formateur Ndara Afrique.
 * ✅ NOUVEAU : Bloc Parrainage pour gagner des commissions sur les ventes des filleuls.
 */

import { useRole } from '@/context/RoleContext';
import { 
  collection, 
  query, 
  where, 
  getFirestore, 
  onSnapshot, 
  getCountFromServer,
  orderBy,
  limit,
  doc
} from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  ClipboardCheck, 
  TrendingUp, 
  BookOpen, 
  ChevronRight,
  Zap,
  Landmark,
  UserPlus,
  Share2,
  Wallet,
  BadgeEuro,
  Star
} from 'lucide-react';
import type { AssignmentSubmission, Settings } from '@/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function InstructorDashboard() {
    const { currentUser: instructor, isUserLoading } = useRole();
    const db = getFirestore();
    const { toast } = useToast();

    const [stats, setStats] = useState({ totalRevenue: 0, studentCount: 0 });
    const [pendingSubmissions, setPendingSubmissions] = useState<AssignmentSubmission[]>([]);
    const [coursePerformance, setCoursePerformance] = useState<{title: string, revenue: number}[]>([]);
    const [isReferralEnabled, setIsReferralEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!instructor?.uid) return;

        const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as Settings;
                setIsReferralEnabled(data.commercial?.referralEnabled ?? true);
            }
        });

        // Revenus
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
                setIsLoading(false);
            }
        );

        // Devoirs
        const unsubDevoirs = onSnapshot(
            query(collection(db, 'devoirs'), where('instructorId', '==', instructor.uid), where('status', '==', 'submitted'), limit(5)),
            (snap) => {
                setPendingSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignmentSubmission)));
            }
        );

        return () => { unsubSettings(); unsubPayments(); unsubDevoirs(); };
    }, [instructor?.uid, db]);

    const handleShareReferral = () => {
        const url = `${window.location.origin}/login?tab=register&ref=${instructor?.uid}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Lien de parrainage copié !", description: "Invitez d'autres experts et gagnez des commissions sur leurs ventes." });
    };

    if (isUserLoading || isLoading) {
        return <div className="p-4 space-y-6 bg-slate-950 min-h-screen"><Skeleton className="h-10 w-3/4 bg-slate-900 rounded-xl" /><Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" /></div>;
    }

    return (
        <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
            
            <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
                <h1 className="text-3xl font-black text-white leading-tight">Espace <span className="text-primary">Formateur</span></h1>
                <p className="text-slate-500 text-sm mt-2 font-medium italic">Pilotez votre académie panafricaine.</p>
            </header>

            {/* --- SECTION PARRAINAGE (REVENUS PASSIFS) --- */}
            {isReferralEnabled && (
                <section className="px-4">
                    <Card className="bg-gradient-to-br from-slate-900 to-primary/10 border-2 border-primary/30 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-700">
                        <CardContent className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                        <UserPlus className="h-5 w-5 text-primary" /> Programme Parrain
                                    </h2>
                                    <p className="text-xs text-slate-400 font-medium">Invitez des experts, gagnez des dividendes.</p>
                                </div>
                                <div className="p-3 bg-primary/20 rounded-2xl text-primary"><BadgeEuro size={32} /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Gains de parrainage</p>
                                    <p className="text-2xl font-black text-white">{(instructor?.referralBalance || 0).toLocaleString('fr-FR')} <span className="text-xs text-primary">XOF</span></p>
                                </div>
                                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none uppercase font-black text-[8px] w-fit">Actif</Badge>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-xs text-slate-400 leading-relaxed italic">
                                    Vous touchez une commission sur chaque formation vendue par les formateurs que vous avez parrainés.
                                </p>
                                <Button onClick={handleShareReferral} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/30 gap-3 active:scale-95 transition-all">
                                    <Share2 className="h-4 w-4" /> Partager mon code parrain
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            )}

            <section className="px-4 grid grid-cols-2 gap-3">
                <Link href="/instructor/revenus" className="block active:scale-95 transition-transform">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] shadow-xl relative overflow-hidden h-full">
                        <div className="p-2 bg-primary/10 rounded-xl inline-block mb-3"><Landmark className="h-5 w-5 text-primary" /></div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Gains Directs</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl font-black text-white">{stats.totalRevenue.toLocaleString('fr-FR')}</span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">XOF</span>
                        </div>
                    </div>
                </Link>
                <Link href="/instructor/students" className="block active:scale-95 transition-transform">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] shadow-xl relative overflow-hidden h-full">
                        <div className="p-2 bg-blue-500/10 rounded-xl inline-block mb-3"><Users className="h-5 w-5 text-blue-400" /></div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Inscriptions</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl font-black text-white">{stats.studentCount}</span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">Élèves</span>
                        </div>
                    </div>
                </Link>
            </section>

            <section className="px-4 space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />À corriger</h2>
                    {pendingSubmissions.length > 0 && <Badge className="bg-primary text-primary-foreground border-none rounded-full px-2">{pendingSubmissions.length}</Badge>}
                </div>
                {pendingSubmissions.length > 0 ? (
                    <div className="grid gap-3">
                        {pendingSubmissions.map(sub => (
                            <Card key={sub.id} className="bg-slate-900 border-slate-800 rounded-3xl active:scale-95 transition-all border-l-4 border-l-primary">
                                <CardContent className="p-5 flex items-center justify-between">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <p className="text-sm font-bold text-white truncate">{sub.studentName}</p>
                                        <p className="text-[10px] text-slate-500 truncate italic opacity-70">"{sub.assignmentTitle}"</p>
                                    </div>
                                    <Button size="sm" asChild className="rounded-xl h-10 px-4 font-bold bg-slate-800 hover:bg-primary text-white border-none transition-colors"><Link href="/instructor/devoirs">Noter</Link></Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800/50">
                        <Zap className="h-8 w-8 mx-auto text-slate-800 mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Tout est à jour !</p>
                    </div>
                )}
            </section>

            <section className="px-4 space-y-4">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1"><TrendingUp className="h-4 w-4" />Ventes par formation</h2>
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