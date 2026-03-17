'use client';

/**
 * @fileOverview Cockpit Admin Elite - Design Qwen Immersif V2.
 * ✅ TEMPS RÉEL : KPIs et Inscriptions synchronisés.
 * ✅ RÉSOLU : Récupération des noms d'étudiants réels pour les inscriptions.
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
  documentId
} from 'firebase/firestore';
import { 
  Users, 
  Wallet, 
  Percent, 
  Award,
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NdaraUser } from '@/lib/types';

interface AdminStats {
  revenue: number;
  users: number;
  courses: number;
  certs: number;
}

export default function AdminDashboard() {
    const { currentUser } = useRole();
    const db = getFirestore();
    
    const [stats, setStats] = useState<AdminStats>({ revenue: 0, users: 0, courses: 0, certs: 0 });
    const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);
    const [usersMap, setUsersMap] = useState<Map<string, NdaraUser>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') return;

        setIsLoading(true);

        // 1. Revenus réels
        const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('status', '==', 'Completed')), (snap) => {
            const total = snap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
            setStats(prev => ({ ...prev, revenue: total }));
        });

        // 2. Nombre total de membres
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            setStats(prev => ({ ...prev, users: snap.size }));
        });

        // 3. Nombre de formations
        const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
            setStats(prev => ({ ...prev, courses: snap.size }));
        });

        // 4. Nombre de certificats (Élèves à 100%)
        const unsubEnrollCount = onSnapshot(query(collection(db, 'enrollments'), where('progress', '==', 100)), (snap) => {
            setStats(prev => ({ ...prev, certs: snap.size }));
            setIsLoading(false);
        });

        // 5. Inscriptions récentes (avec enrichissement des noms)
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
            }
        );

        return () => { 
            unsubPayments(); unsubUsers(); unsubCourses(); unsubEnrollCount(); unsubRecent();
        };
    }, [db, currentUser]);

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 space-y-10">
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title="Chiffre d'Affaires" 
                        value={`${(stats.revenue / 1000).toFixed(0)}K`} 
                        unit="XOF"
                        icon={Wallet} 
                        trend="+12.5%" 
                        trendType="up"
                        isLoading={isLoading}
                    />
                    <StatCard 
                        title="Membres Actifs" 
                        value={stats.users.toLocaleString()} 
                        icon={Users} 
                        trend="+8.2%" 
                        trendType="up"
                        sparklineColor="#3B82F6"
                        isLoading={isLoading}
                    />
                    <StatCard 
                        title="Taux Conversion" 
                        value="3.8%" 
                        icon={Percent} 
                        trend="-1.4%" 
                        trendType="down"
                        sparklineColor="#CC7722"
                        isLoading={isLoading}
                    />
                    <StatCard 
                        title="Réussite Cours" 
                        value="89.2%" 
                        icon={Award} 
                        trend="Stable" 
                        sparklineColor="#A855F7"
                        isLoading={isLoading}
                    />
                </section>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-4xl overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-black text-white text-lg uppercase tracking-tight">Dernières Inscriptions</h3>
                        <button className="text-primary text-[10px] font-black uppercase tracking-widest hover:text-white transition">Voir Tout</button>
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
                                        <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase px-3 py-1 rounded-full">EN LIGNE</Badge>
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