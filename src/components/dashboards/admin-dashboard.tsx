'use client';

/**
 * @fileOverview Cockpit Admin Elite - Design Qwen Immersif.
 * ✅ TEMPS RÉEL : Statistiques et inscriptions synchronisées via onSnapshot.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { 
  Users, 
  BookOpen, 
  DollarSign, 
  Award,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminDashboard() {
    const { currentUser } = useRole();
    const db = getFirestore();
    
    const [stats, setStats] = useState({ revenue: 0, users: 0, courses: 0, certs: 0 });
    const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') return;

        setIsLoading(true);

        // 1. Chiffre d'affaires global
        const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('status', '==', 'Completed')), (snap) => {
            const total = snap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
            setStats(prev => ({ ...prev, revenue: total }));
        });

        // 2. Nombre total de membres
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            setQuickStats(prev => ({ ...prev, users: snap.size }));
        });

        // 3. Nombre de formations
        const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
            setQuickStats(prev => ({ ...prev, courses: snap.size }));
        });

        // 4. Nombre de certificats (Enrollments à 100%)
        const unsubEnroll = onSnapshot(query(collection(db, 'enrollments'), where('progress', '==', 100)), (snap) => {
            setQuickStats(prev => ({ ...prev, certs: snap.size }));
        });

        // 5. Dernières inscriptions enrichies
        const unsubRecent = onSnapshot(
            query(collection(db, 'enrollments'), orderBy('enrollmentDate', 'desc'), limit(5)),
            async (snap) => {
                const enrollments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                // On pourrait enrichir avec les noms des étudiants ici, 
                // mais on garde la réactivité onSnapshot simple pour le dashboard
                setRecentEnrollments(enrollments);
                setIsLoading(false);
            }
        );

        const setQuickStats = (fn: any) => setStats(fn);

        return () => { 
            unsubPayments(); 
            unsubUsers(); 
            unsubCourses(); 
            unsubEnroll(); 
            unsubRecent();
        };
    }, [db, currentUser]);

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700 relative">
            {/* Decorative Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

            <main className="relative z-10 space-y-10">
                
                {/* --- STATS GRID --- */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <DashboardStat 
                        icon={Users} 
                        label="Membres Totaux" 
                        value={stats.users.toLocaleString()} 
                        trend="+12%" 
                        color="text-blue-400" 
                        bgColor="bg-blue-500/10" 
                        isLoading={isLoading}
                    />
                    <DashboardStat 
                        icon={DollarSign} 
                        label="Chiffre d'Affaires" 
                        value={`${(stats.revenue / 1000000).toFixed(1)}M`} 
                        unit="FCFA"
                        trend="+8.5%" 
                        color="text-primary" 
                        bgColor="bg-primary/10" 
                        isLoading={isLoading}
                    />
                    <DashboardStat 
                        icon={BookOpen} 
                        label="Cours Actifs" 
                        value={stats.courses.toString()} 
                        trend="Stable" 
                        color="text-amber-500" 
                        bgColor="bg-amber-500/10" 
                        isLoading={isLoading}
                    />
                    <DashboardStat 
                        icon={Award} 
                        label="Certificats" 
                        value={stats.certs.toString()} 
                        trend="+5%" 
                        color="text-purple-400" 
                        bgColor="bg-purple-500/10" 
                        isLoading={isLoading}
                    />
                </section>

                {/* --- RECENT ACTIVITY --- */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-black text-white text-lg uppercase tracking-tight">Dernières Inscriptions</h3>
                        <button className="text-primary text-[10px] font-black uppercase tracking-widest hover:text-white transition">Voir Tout le registre</button>
                    </div>
                    <div className="p-8 space-y-4">
                        {isLoading ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-800" />)
                        ) : recentEnrollments.length > 0 ? (
                            recentEnrollments.map((enroll) => (
                                <div key={enroll.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 group hover:border-primary/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-white/5">
                                            <Avatar className="h-full w-full">
                                                <AvatarFallback className="text-[10px] font-black">N</AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm uppercase">Étudiant Ndara</p>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                                <Clock size={10} />
                                                {enroll.enrollmentDate ? formatDistanceToNow((enroll.enrollmentDate as any).toDate(), { locale: fr, addSuffix: true }) : '---'}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase px-3 py-1">ACTIF</Badge>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center opacity-20">
                                <Users className="h-12 w-12 mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Aucune donnée récente</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function DashboardStat({ icon: Icon, label, value, unit, trend, color, bgColor, isLoading }: any) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group transition-all hover:border-white/10 active:scale-95">
            <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-10 transition-opacity group-hover:opacity-20", bgColor)} />
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", bgColor, color)}>
                        <Icon size={24} />
                    </div>
                    {!isLoading && (
                        <Badge variant="outline" className={cn("border-none font-black text-[9px] uppercase tracking-tighter px-2.5", trend === 'Stable' ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/10 text-emerald-400')}>
                            {trend === 'Stable' ? '' : <TrendingUp size={10} className="mr-1" />}
                            {trend}
                        </Badge>
                    )}
                </div>
                
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
                {isLoading ? (
                    <Skeleton className="h-8 w-20 bg-slate-800" />
                ) : (
                    <div className="flex items-baseline gap-1.5">
                        <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
                        {unit && <span className="text-xs font-bold text-slate-600 uppercase">{unit}</span>}
                    </div>
                )}
            </div>
        </div>
    );
}
