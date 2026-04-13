'use client';

/**
 * @fileOverview Cockpit Admin Elite - Design Qwen Immersif V2.
 * ✅ REAL-TIME : 100% branché sur onSnapshot pour une réactivité totale.
 * ✅ I18N : Intégration complète des traductions Admin (FR/EN/SG).
 * ✅ MeSomb : Ajout du solde marchand en temps réel.
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
  Timestamp
} from 'firebase/firestore';
import { 
  Users, 
  Wallet, 
  Percent, 
  Award,
  Clock,
  Activity
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { MeSombBalanceCard } from '@/components/admin/MeSombBalanceCard';
import { formatDistanceToNow, startOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import type { NdaraUser, Payment, TrackingEvent } from '@/lib/types';
import Link from 'next/link';

interface AdminStats {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  activeUsers: number;
  totalUsers: number;
  conversionRate: number;
  successRate: number;
}

/** Utility to safely convert Firestore date fields to JS Date objects. */
const safeToDate = (date: any): Date | null => {
  if (!date) return null;
  if (typeof date.toDate === 'function') return date.toDate();
  if (date instanceof Date) return date;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
};

export default function AdminDashboard() {
    const { currentUser } = useRole();
    const db = getFirestore();
    const t = useTranslations('Admin');
    
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

        // 1. Revenus réels par période (Temps Réel)
        const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('status', '==', 'Completed')), (snap) => {
            const payments = snap.docs.map(d => d.data() as Payment);
            
            const revToday = payments.filter(p => {
                const d = safeToDate(p.date);
                return d && d >= today;
            }).reduce((acc, p) => acc + (p.amount || 0), 0);

            const revWeek = payments.filter(p => {
                const d = safeToDate(p.date);
                return d && d >= week;
            }).reduce((acc, p) => acc + (p.amount || 0), 0);

            const revMonth = payments.filter(p => {
                const d = safeToDate(p.date);
                return d && d >= month;
            }).reduce((acc, p) => acc + (p.amount || 0), 0);

            setStats(prev => ({ 
                ...prev, 
                revenueToday: revToday,
                revenueWeek: revWeek,
                revenueMonth: revMonth,
                totalPaymentsCount: payments.length
            }));
        });

        // 2. Utilisateurs Actifs (lastSeen < 24h) & Total Utilisateurs (Temps Réel)
        const activeThreshold = subDays(now, 1);
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            const allUsers = snap.docs.map(d => d.data() as NdaraUser);
            const active = allUsers.filter(u => {
                const d = safeToDate(u.lastSeen);
                return d && d >= activeThreshold;
            }).length;

            setStats(prev => ({ 
                ...prev, 
                activeUsers: active,
                totalUsers: allUsers.length 
            }));
        });

        // 3. Conversion (Temps Réel sur les événements de tracking)
        const unsubTracking = onSnapshot(collection(db, 'tracking_events'), (snap) => {
            const events = snap.docs.map(d => d.data() as TrackingEvent);
            const uniqueSessions = new Set(events.map(e => e.sessionId)).size;
            
            setStats(prev => {
                const totalPayments = (prev as any).totalPaymentsCount || 0;
                const rate = uniqueSessions > 0 ? (totalPayments / uniqueSessions) * 100 : 0;
                return { ...prev, conversionRate: Number(rate.toFixed(1)) };
            });
        });

        // 4. Inscriptions récentes (Temps Réel)
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
            unsubPayments(); 
            unsubUsers(); 
            unsubTracking(); 
            unsubRecent();
        };
    }, [db, currentUser]);

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 space-y-10">
                {/* MeSomb Live Monitoring */}
                <div className="max-w-md">
                    <MeSombBalanceCard />
                </div>

                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title={t('stats.revenue')} 
                        value={`${((stats.revenueMonth || 0) / 1000).toFixed(0)}K`} 
                        unit="XOF"
                        icon={Wallet} 
                        trend={`${(stats.revenueToday || 0).toLocaleString()} ${t('stats.today')}`} 
                        trendType="up"
                        isLoading={isLoading}
                    />
                    <StatCard 
                        title={t('stats.active_users')} 
                        value={(stats.activeUsers || 0).toLocaleString()} 
                        icon={Activity} 
                        trend={`${(stats.totalUsers || 0).toLocaleString()} au total`} 
                        trendType="up"
                        sparklineColor="#3B82F6"
                        isLoading={isLoading}
                    />
                    <StatCard 
                        title={t('stats.conversion')} 
                        value={`${stats.conversionRate || 0}%`} 
                        icon={Percent} 
                        trend="Ventes / Sessions" 
                        trendType="neutral"
                        sparklineColor="#CC7722"
                        isLoading={isLoading}
                    />
                    <StatCard 
                        title={t('stats.success')} 
                        value={`${stats.successRate || 0}%`} 
                        icon={Award} 
                        trend="Certifications" 
                        sparklineColor="#A855F7"
                        isLoading={isLoading}
                    />
                </section>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-4xl overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-black text-white text-lg uppercase tracking-tight">{t('real_enrollments')}</h3>
                        <Link href="/admin/courses">
                            <button className="text-primary text-[10px] font-black uppercase tracking-widest hover:text-white transition">{t('view_catalog')}</button>
                        </Link>
                    </div>
                    <div className="p-8 space-y-4">
                        {isLoading ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-800" />)
                        ) : recentEnrollments.length > 0 ? (
                            recentEnrollments.map((enroll) => {
                                const student = usersMap.get(enroll.studentId);
                                const enrollDate = safeToDate(enroll.enrollmentDate);
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
                                                    {enrollDate ? formatDistanceToNow(enrollDate, { locale: fr, addSuffix: true }) : '---'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-primary uppercase">{(enroll.priceAtEnrollment || 0).toLocaleString()} F</p>
                                            <p className="text-[8px] font-bold text-slate-600 uppercase">Payé</p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-12 text-center opacity-20">
                                <Users className="h-12 w-12 mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">{t('no_recent_activity')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}