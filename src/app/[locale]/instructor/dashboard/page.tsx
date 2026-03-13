'use client';

/**
 * @fileOverview Dashboard Formateur Ndara Afrique V2 (Design Qwen Immersif).
 * Palette : Fond Bleu Sombre (#0f172a), Accents Vert (#10b981).
 * Design : Android-first tactile avec graphiques dynamiques.
 */

import { useRole } from '@/context/RoleContext';
import { 
  collection, 
  query, 
  where, 
  getFirestore, 
  onSnapshot, 
  orderBy,
  limit
} from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Landmark,
  TrendingUp, 
  ClipboardCheck, 
  History,
  Loader2,
  Wallet,
  ChartLine,
  Percent,
  Video,
  Megaphone,
  ChevronRight
} from 'lucide-react';
import type { AssignmentSubmission, Payment, Course } from '@/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format, subMonths, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function InstructorDashboard() {
    const { currentUser: instructor, isUserLoading } = useRole();
    const db = getFirestore();

    const [payments, setPayments] = useState<Payment[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [pendingSubmissions, setPendingSubmissions] = useState<AssignmentSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!instructor?.uid) return;

        setIsLoading(true);

        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('instructorId', '==', instructor.uid), where('status', '==', 'Completed')),
            (snap) => {
                setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
            }
        );

        const unsubCourses = onSnapshot(
            query(collection(db, 'courses'), where('instructorId', '==', instructor.uid)),
            (snap) => {
                setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
            }
        );

        const unsubDevoirs = onSnapshot(
            query(
                collection(db, 'devoirs'), 
                where('instructorId', '==', instructor.uid), 
                where('status', '==', 'submitted'),
                orderBy('submittedAt', 'desc'),
                limit(5)
            ),
            (snap) => {
                setPendingSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignmentSubmission)));
                setIsLoading(false);
            },
            (err) => {
                console.error("Dashboard Fetch Error:", err);
                setIsLoading(false);
            }
        );

        return () => { unsubPayments(); unsubCourses(); unsubDevoirs(); };
    }, [instructor?.uid, db]);

    const analytics = useMemo(() => {
        const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
        const totalStudentsCount = Array.from(new Set(payments.map(p => p.userId))).length;

        const now = new Date();
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(now, i);
            const monthLabel = format(monthDate, 'MMM', { locale: fr });
            const revenue = payments
                .filter(p => isSameMonth((p.date as any)?.toDate?.() || new Date(0), monthDate))
                .reduce((acc, p) => acc + (p.amount || 0), 0);
            
            chartData.push({ name: monthLabel, total: revenue });
        }

        return {
            totalRevenue,
            chartData,
            totalStudentsCount
        };
    }, [payments]);

    if (isUserLoading || isLoading) {
        return (
            <div className="flex flex-col gap-8 p-4 bg-[#0f172a] min-h-screen">
                <Skeleton className="h-12 w-1/2 bg-slate-900 rounded-xl" />
                <div className="grid grid-cols-1 gap-4">
                    <Skeleton className="h-48 rounded-[2.5rem] bg-slate-900" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-28 rounded-[2rem] bg-slate-900" />
                    <Skeleton className="h-28 rounded-[2rem] bg-slate-900" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-0 pb-32 bg-[#0f172a] min-h-screen relative overflow-hidden font-sans">
            <div className="grain-overlay" />
            
            {/* --- HEADER --- */}
            <header className="fixed top-0 w-full z-50 bg-[#0f172a]/95 backdrop-blur-md safe-area-pt border-b border-white/5">
                <div className="px-6 py-6 flex items-center justify-between">
                    <div>
                        <h1 className="font-black text-xl text-white tracking-wide uppercase">Espace Formateur</h1>
                        <p className="text-gray-300 text-sm font-medium mt-1 italic">Bara ala, Expert 👋</p>
                    </div>
                    <Link href="/account" className="active:scale-95 transition-transform">
                        <div className="w-12 h-12 rounded-full border-2 border-[#10b981]/30 overflow-hidden shadow-xl">
                            <Avatar className="h-full w-full">
                                <AvatarImage src={instructor?.profilePictureURL} className="object-cover" />
                                <AvatarFallback className="bg-slate-800 text-slate-500 font-black">
                                    {instructor?.fullName?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </Link>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pt-32 px-6 space-y-8 animate-in fade-in duration-700">

                {/* --- FINANCIAL KPIs --- */}
                <div className="grid grid-cols-1 gap-4">
                    {/* Main Balance Card */}
                    <Link href="/instructor/revenus" className="block group active:scale-[0.98] transition-all">
                        <Card className="bg-gradient-to-br from-[#10b981] to-[#047857] rounded-[2.5rem] p-6 border-none shadow-2xl shadow-[#10b981]/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                        <ChartLine className="text-white h-4 w-4" />
                                    </div>
                                    <span className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em]">Solde Disponible</span>
                                </div>
                                <h2 className="text-white font-black text-4xl mb-1 tracking-tight">
                                    {analytics.totalRevenue.toLocaleString('fr-FR')} <span className="text-lg opacity-60">FCFA</span>
                                </h2>
                                <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                                    <TrendingUp size={14} /> +12% ce mois
                                </p>
                                
                                <Button className="mt-6 w-full h-12 rounded-2xl bg-white text-[#047857] hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest shadow-xl border-none">
                                    <Wallet className="mr-2 h-4 w-4" /> Demander un virement
                                </Button>
                            </div>
                        </Card>
                    </Link>

                    {/* Secondary Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-[#1e293b] rounded-[2rem] p-5 border border-[#10b981]/20 shadow-xl active:scale-[0.98] transition-all">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Users size={16} />
                                </div>
                                <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Mes Ndara</span>
                            </div>
                            <p className="text-white font-black text-2xl leading-none">{analytics.totalStudentsCount}</p>
                            <p className="text-slate-600 text-[8px] font-bold uppercase tracking-tighter mt-1.5">Étudiants actifs</p>
                        </Card>
                        
                        <Card className="bg-[#1e293b] rounded-[2rem] p-5 border border-[#10b981]/20 shadow-xl active:scale-[0.98] transition-all">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-[#10b981]/20 flex items-center justify-center text-[#10b981]">
                                    <Percent size={16} />
                                </div>
                                <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Réussite</span>
                            </div>
                            <p className="text-white font-black text-2xl leading-none">94%</p>
                            <p className="text-slate-600 text-[8px] font-bold uppercase tracking-tighter mt-1.5">Taux moyen</p>
                        </Card>
                    </div>
                </div>

                {/* --- CASHFLOW CHART --- */}
                <Card className="bg-[#1e293b] rounded-[2.5rem] p-6 border border-white/5 shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-white text-xs uppercase tracking-[0.2em]">Trésorerie</h3>
                        <div className="bg-[#0f172a] px-3 py-1.5 rounded-full border border-white/10 text-[9px] font-black text-primary uppercase tracking-widest">
                            6 MOIS
                        </div>
                    </div>
                    <div className="h-48 w-full -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.chartData}>
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4}/>
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="white" opacity={0.05} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#64748b', fontSize: 10, fontWeight: '900'}} 
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px'}} 
                                    itemStyle={{color: '#10b981', fontWeight: 'bold'}}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="total" 
                                    stroke="#10b981" 
                                    strokeWidth={4} 
                                    fill="url(#chartGradient)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* --- URGENCIES: TO GRADE --- */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                            À Corriger
                        </h2>
                        <Link href="/instructor/devoirs" className="text-primary text-[10px] font-black uppercase tracking-widest hover:text-white transition">
                            VOIR TOUT
                        </Link>
                    </div>

                    <div className="grid gap-3">
                        {pendingSubmissions.length > 0 ? (
                            pendingSubmissions.map(sub => (
                                <Card key={sub.id} className="bg-[#1e293b] rounded-[2rem] p-4 border border-white/5 flex items-center gap-4 shadow-xl active:scale-[0.98] transition-all group">
                                    <Avatar className="h-12 w-12 border-2 border-white/10 shadow-lg group-hover:border-primary/30 transition-colors">
                                        <AvatarImage src={sub.studentAvatarUrl} className="object-cover" />
                                        <AvatarFallback className="bg-slate-800 text-slate-500 font-bold uppercase">
                                            {sub.studentName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-white text-sm truncate uppercase tracking-tight">{sub.studentName}</h4>
                                        <p className="text-slate-500 text-[10px] font-medium truncate italic">"{sub.assignmentTitle}"</p>
                                        <p className="text-slate-600 text-[8px] font-black uppercase tracking-tighter mt-1 flex items-center gap-1">
                                            <History size={10} /> Remis il y a peu
                                        </p>
                                    </div>
                                    <Button asChild className="h-10 px-5 rounded-2xl bg-[#10b981] hover:bg-emerald-600 text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-lg border-none">
                                        <Link href="/instructor/devoirs">Noter</Link>
                                    </Button>
                                </Card>
                            ))
                        ) : (
                            <div className="py-12 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-white/5 opacity-20">
                                <ClipboardCheck className="h-10 w-10 mx-auto text-slate-700 mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Tout est corrigé !</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* --- QUICK ACTIONS --- */}
                <div className="grid grid-cols-2 gap-4 pb-12">
                    <Link href="/instructor/courses/create" className="block group active:scale-95 transition-all">
                        <Card className="bg-[#1e293b] rounded-[2rem] p-6 border border-white/5 flex flex-col items-center justify-center gap-4 shadow-xl group-hover:border-primary/30">
                            <div className="w-14 h-14 rounded-3xl bg-[#10b981]/10 flex items-center justify-center text-[#10b981] group-hover:bg-[#10b981] group-hover:text-slate-950 transition-all shadow-inner">
                                <Video size={24} />
                            </div>
                            <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Nouveau Cours</span>
                        </Card>
                    </Link>
                    
                    <Link href="/instructor/annonces" className="block group active:scale-95 transition-all">
                        <Card className="bg-[#1e293b] rounded-[2rem] p-6 border border-white/5 flex flex-col items-center justify-center gap-4 shadow-xl group-hover:border-blue-500/30">
                            <div className="w-14 h-14 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner">
                                <Megaphone size={24} />
                            </div>
                            <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Annonce</span>
                        </Card>
                    </Link>
                </div>

            </main>
        </div>
    );
}