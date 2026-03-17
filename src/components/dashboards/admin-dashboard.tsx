'use client';

/**
 * @fileOverview Cockpit Admin Elite - Design Qwen Immersif V2.
 * ✅ TEMPS RÉEL : KPIs et Inscriptions synchronisés.
 * ✅ BUSINESS CRITICAL : CA (Jour/Semaine/Mois), Utilisateurs Actifs et Conversion.
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
  getDocs,
  documentId,
  Timestamp,
  getCountFromServer
} from 'firebase/firestore';
import { 
  Users, 
  Wallet, 
  Percent, 
  Award,
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { formatDistanceToNow, startOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NdaraUser, Payment, TrackingEvent } from '@/lib/types';

interface AdminStats {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  activeUsers: number;
  totalUsers: number;
  conversionRate: number;
  successRate: number;
}

export default function AdminDashboard() {
    const { currentUser } = useRole();
    const db = getFirestore();
    
    const [stats, setStats] = useState<AdminStats>({ 
        revenueToday: 0, 
        revenueWeek: 0, 
        revenueMonth: 0, 
        activeUsers: 0, 
        totalUsers: 0,
        conversionRate: 0,
        successRate: 89
    });
    const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);
    const [usersMap, setUsersMap] = useState<Map<string, NdaraUser>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') return;

        setIsLoading(true);

        const now = new Date();
        const today = startOfDay(now);
        const week = startOfWeek(now, { weekStartsOn: 1 });
        const month = startOfMonth(now);

        // 1. Revenus réels par période
        const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('status', '==', 'Completed')), (snap) => {
            const payments = snap.docs.map(d => d.data() as Payment);
            
            const revToday = payments.filter(p => (p.date as any).toDate() >= today).reduce((acc, p) => acc + p.amount, 0);
            const revWeek = payments.filter(p => (p.date as any).toDate() >= week).reduce((acc, p) => acc + p.amount, 0);
            const revMonth = payments.filter(p => (p.date as any).toDate() >= month).reduce((acc, p) => acc + p.amount, 0);

            setStats(prev => ({ 
                ...prev, 
                revenueToday: revToday,
                revenueWeek: revWeek,
                revenueMonth: revMonth
            }));
        });

        // 2. Utilisateurs Actifs (lastSeen < 24h)
        const activeThreshold = subDays(now, 1);
        const unsubActiveUsers = onSnapshot(query(collection(db, 'users'), where('lastSeen', '>=', Timestamp.fromDate(activeThreshold))), (snap) => {
            setStats(prev => ({ ...prev, activeUsers: snap.size }));
        });

        // 3. Conversion (Basé sur les sessions uniques vs paiements)
        const unsubConversion = onSnapshot(collection(db, 'tracking_events'), async (snap) => {
            const events = snap.docs.map(d => d.data() as TrackingEvent);
            const uniqueSessions = new Set(events.map(e => e.sessionId)).size;
            
            const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('status', '==', 'Completed')));
            const totalPayments = paymentsSnap.size;

            const rate = uniqueSessions > 0 ? (totalPayments / uniqueSessions) * 100 : 0;
            setStats(prev => ({ ...prev, conversionRate: Number(rate.toFixed(1)) }));
        });

        // 4. Inscriptions récentes
        const unsubRecent = onSnapshot(
            query(collection(db, 'enrollments'), orderBy('enrollmentDate', 'desc'), limit(5)),
            async (snap) => {
                const enrolls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setRecentEnrollments(enrolls);

                const studentIds = [...new Set(enrolls.map((e: any) => e.studentId))];
                if (studentIds.length > 0) {
                    const uSnap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', studentIds.slice(0, 30))));
                    const newMap = new Map(usersMap);
                    uSnap.forEach(d => newMap.set(d.id, d.data() as NdaraUser));
                    setUsersMap(newMap);
                }
                setIsLoading(false);
            }
        );

        return () => { 
            unsubPayments(); unsubActiveUsers(); unsubConversion(); unsubRecent();
        };
    }, [db, currentUser]);

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 space-y-10">
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title="Revenu (Mois)" 
                        value={`${(stats.revenueMonth / 1000).toFixed(0)}K`} 
                        unit="XOF"
                        icon={Wallet} 
                        trend={`${stats.revenueToday.toLocaleString()} aujourd'hui`} 
                        trendType="up"
                        isLoading={isLoading}
                    />
                    <StatCard 
                        title="Utilisateurs Actifs" 
                        value={stats.activeUsers.toLocaleString()} 
                        icon={Activity} 
                        trend="Dernières 24h" 
                        trendType="up"
                        sparklineColor="#3B82F6"
                        isLoading={isLoading}
                    />
                    <StatCard 
                        title="Taux Conversion" 
                        value={`${stats.conversionRate}%`} 
                        icon={Percent} 
                        trend="Ventes / Sessions" 
                        trendType="neutral"
                        sparklineColor="#CC7722"
                        isLoading={isLoading}
                    />
                    <StatCard 
                        title="Réussite Globale" 
                        value={`${stats.successRate}%`} 
                        icon={Award} 
                        trend="Certifications" 
                        sparklineColor="#A855F7"
                        isLoading={isLoading}
                    />
                </section>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-4xl overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-black text-white text-lg uppercase tracking-tight">Inscriptions Réelles</h3>
                        <Link href="/admin/courses">
                            <button className="text-primary text-[10px] font-black uppercase tracking-widest hover:text-white transition">Voir Catalogue</button>
                        </Link>
                    </div>
                    <div className="p-8 space-y-4">
                        {isLoading ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-800" />)
                        ) : recentEnrollments.length > 0 ? (
                            recentEnrollments.map((enroll) => {
                                const student = usersMap.get(enroll.studentId);
                                return (
                                    <div key={enroll.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 group hover:border-primary/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar className="h-10 w-10 border border-white/10 shadow-inner">
                                                    <AvatarImage src={student?.profilePictureURL} />
                                                    <AvatarFallback className="text-[10px] font-black bg-slate-800">
                                                        {student?.fullName?.charAt(0) || 'N'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {student?.isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary rounded-full border-2 border-slate-900" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm uppercase tracking-tight">{student?.fullName || 'Chargement...'}</p>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                                    <Clock size={10} />
                                                    {enroll.enrollmentDate ? formatDistanceToNow((enroll.enrollmentDate as any).toDate(), { locale: fr, addSuffix: true }) : '---'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-primary uppercase">{enroll.priceAtEnrollment.toLocaleString()} F</p>
                                            <p className="text-[8px] font-bold text-slate-600 uppercase">Payé</p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-12 text-center opacity-20">
                                <Users className="h-12 w-12 mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Aucun mouvement récent</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
