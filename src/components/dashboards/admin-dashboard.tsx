'use client';

/**
 * @fileOverview Cockpit Admin Elite - Design Qwen Immersif.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot
} from 'firebase/firestore';
import { 
  Users, 
  BookOpen, 
  DollarSign, 
  Award,
  TrendingUp,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { AdminActionQueue } from './AdminActionQueue';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
    const { currentUser } = useRole();
    const db = getFirestore();
    const [quickStats, setQuickStats] = useState({ revenue: 0, users: 0, courses: 0, certs: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') return;

        const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('status', '==', 'Completed')), (snap) => {
            const total = snap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
            setQuickStats(prev => ({ ...prev, revenue: total }));
        });

        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            setQuickStats(prev => ({ ...prev, users: snap.size }));
        });

        const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
            setQuickStats(prev => ({ ...prev, courses: snap.size }));
        });

        const unsubEnroll = onSnapshot(query(collection(db, 'enrollments'), where('progress', '==', 100)), (snap) => {
            setQuickStats(prev => ({ ...prev, certs: snap.size }));
            setIsLoading(false);
        });

        return () => { unsubPayments(); unsubUsers(); unsubCourses(); unsubEnroll(); };
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
                        value={quickStats.users.toLocaleString()} 
                        trend="+12%" 
                        color="text-blue-400" 
                        bgColor="bg-blue-500/10" 
                    />
                    <DashboardStat 
                        icon={DollarSign} 
                        label="Revenus (Total)" 
                        value={`${(quickStats.revenue / 1000000).toFixed(1)}M`} 
                        unit="FCFA"
                        trend="+8.5%" 
                        color="text-primary" 
                        bgColor="bg-primary/10" 
                    />
                    <DashboardStat 
                        icon={BookOpen} 
                        label="Cours Actifs" 
                        value={quickStats.courses.toString()} 
                        trend="Stable" 
                        color="text-amber-500" 
                        bgColor="bg-amber-500/10" 
                    />
                    <DashboardStat 
                        icon={Award} 
                        label="Certificats" 
                        value={quickStats.certs.toString()} 
                        trend="+5%" 
                        color="text-purple-400" 
                        bgColor="bg-purple-500/10" 
                    />
                </section>

                {/* --- ACTIVITY & AUDIT --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-black text-white text-lg uppercase tracking-tight">Dernières Actions</h3>
                            <button className="text-primary text-xs font-bold hover:text-white transition uppercase tracking-widest">Voir tout</button>
                        </div>
                        <AdminActionQueue />
                    </div>

                    <div className="space-y-6">
                        <h3 className="font-black text-white text-lg uppercase tracking-tight px-1">Monitoring Live</h3>
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                    <Activity className="h-6 w-6 animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-sm uppercase tracking-tight">Santé Système</p>
                                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Opérationnel</p>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <MonitorItem label="Base de données" status="98ms" />
                                <MonitorItem label="Serveur API" status="45ms" />
                                <MonitorItem label="IA Mathias" status="1.2s" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function DashboardStat({ icon: Icon, label, value, unit, trend, color, bgColor }: any) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group transition-all hover:border-white/10 active:scale-95">
            <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-10 transition-opacity group-hover:opacity-20", bgColor)} />
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", bgColor, color)}>
                        <Icon size={24} />
                    </div>
                    <Badge variant="outline" className={cn("border-none font-black text-[9px] uppercase tracking-tighter px-2.5", trend === 'Stable' ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/10 text-emerald-400')}>
                        {trend === 'Stable' ? '' : <TrendingUp size={10} className="mr-1" />}
                        {trend}
                    </Badge>
                </div>
                
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
                <div className="flex items-baseline gap-1.5">
                    <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
                    {unit && <span className="text-xs font-bold text-slate-600 uppercase">{unit}</span>}
                </div>
            </div>
        </div>
    );
}

function MonitorItem({ label, status }: { label: string, status: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-tight">{label}</span>
            <div className="flex items-center gap-3">
                <span className="text-slate-600 font-mono text-[10px]">{status}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </div>
        </div>
    );
}
