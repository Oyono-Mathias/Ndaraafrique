'use client';

/**
 * @fileOverview Cockpit Stratégique Administrateur V2 (Design Qwen Immersif).
 * ✅ DESIGN : Forest & Wealth (Elite Admin).
 * ✅ ACTIONS : File d'attente d'audit et stats live.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  getCountFromServer,
  onSnapshot
} from 'firebase/firestore';
import { 
  ShieldAlert, 
  Users, 
  BookOpen, 
  DollarSign, 
  TrendingUp,
  LayoutDashboard,
  Activity,
  Zap,
  Clock,
  Landmark,
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { AdminQuickActions } from './AdminQuickActions';
import { AdminActionQueue } from './AdminActionQueue';
import { AdminSecurityAlerts } from './AdminSecurityAlerts';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent } from "@/components/ui/card";
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const [quickStats, setQuickStats] = useState({ revenue: 0, users: 0, courses: 0, online: 0 });
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') return;

        // Écouteur temps réel des stats globales
        const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('status', '==', 'Completed')), (snap) => {
            const total = snap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
            setQuickStats(prev => ({ ...prev, revenue: total }));
        });

        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            setQuickStats(prev => ({ ...prev, users: snap.size, online: snap.docs.filter(d => d.data().isOnline).length }));
        });

        const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
            setQuickStats(prev => ({ ...prev, courses: snap.size }));
            setIsLoadingStats(false);
        });

        return () => { unsubPayments(); unsubUsers(); unsubCourses(); };
    }, [db, currentUser]);

    return (
        <div className="flex flex-col gap-8 pb-32 bg-[#0f172a] min-h-screen relative overflow-hidden font-sans">
            <div className="grain-overlay opacity-[0.04]" />
            
            <header className="px-6 pt-12 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-2 text-primary mb-2">
                    <Activity className="h-5 w-5 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Monitoring Stratégique</span>
                </div>
                <h1 className="text-4xl font-black text-white leading-tight uppercase tracking-tight">
                    Cockpit <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">Ndara Admin.</span>
                </h1>
            </header>

            <main className="px-6 space-y-10 relative z-10 animate-in fade-in duration-1000 delay-200">
                
                {/* --- STATS GRID --- */}
                <section className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <Link href="/admin/payments" className="block active:scale-[0.98] transition-all">
                            <div className="bg-gradient-to-br from-amber-500 to-orange-700 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-1000" />
                                <div className="relative z-10">
                                    <p className="text-amber-100 text-[10px] font-black uppercase tracking-[0.25em] mb-2">Chiffre d'Affaires Global</p>
                                    <h2 className="text-white font-black text-4xl tracking-tight leading-none mb-4">
                                        {quickStats.revenue.toLocaleString('fr-FR')} <span className="text-lg opacity-60">XOF</span>
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
                                        <span className="text-white/80 text-[9px] font-black uppercase tracking-widest">Calculé en temps réel</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>

                    <StatPill label="Membres" value={quickStats.users.toString()} icon={Users} color="text-blue-400" bgColor="bg-blue-500/10" />
                    <StatPill label="En Ligne" value={quickStats.online.toString()} icon={Zap} color="text-primary" bgColor="bg-primary/10" />
                </section>

                {/* --- FILE D'ATTENTE PRIORITAIRE --- */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-red-500" />
                            File d'Audit
                        </h2>
                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Trié par urgence</span>
                    </div>
                    <AdminActionQueue />
                </section>

                {/* --- ALERTES DE SÉCURITÉ --- */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 px-1 text-amber-500">
                        <AlertTriangle className="h-4 w-4" />
                        <h2 className="text-xs font-black uppercase tracking-[0.3em]">Alertes Systèmes</h2>
                    </div>
                    <AdminSecurityAlerts />
                </section>

                {/* --- ACTIONS RAPIDES --- */}
                <section className="space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 px-1">Raccourcis</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <QuickLink href="/admin/users" label="Membres" icon={Users} color="bg-blue-500/10 text-blue-400" />
                        <QuickLink href="/admin/moderation" label="Modération" icon={ShieldCheck} color="bg-primary/10 text-primary" />
                        <QuickLink href="/admin/payments" label="Audit Pay" icon={Landmark} color="bg-amber-500/10 text-amber-500" />
                        <QuickLink href="/admin/settings" label="Réglages" icon={Settings} color="bg-purple-500/10 text-purple-400" />
                    </div>
                </section>

                <div className="pt-12 text-center">
                    <p className="text-[9px] font-black text-slate-800 uppercase tracking-[0.5em] pb-12">Ndara Admin Cockpit v2.0</p>
                </div>
            </main>
        </div>
    );
}

function StatPill({ label, value, icon: Icon, color, bgColor }: any) {
    return (
        <div className={cn("bg-slate-900 border border-white/5 p-5 rounded-[2rem] flex flex-col justify-between shadow-xl active:scale-95 transition-all group", bgColor)}>
            <Icon className={cn("h-5 w-5 mb-4", color)} />
            <div>
                <p className="text-2xl font-black text-white leading-none">{value.padStart(2, '0')}</p>
                <p className="text-slate-600 text-[8px] font-black uppercase tracking-widest mt-2">{label}</p>
            </div>
        </div>
    );
}

function QuickLink({ href, label, icon: Icon, color }: any) {
    return (
        <Link href={href} className="block active:scale-95 transition-transform">
            <div className="bg-slate-900 border border-white/5 p-6 rounded-[2rem] flex flex-col items-center gap-4 shadow-xl">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", color)}>
                    <Icon size={24} />
                </div>
                <span className="text-white text-[9px] font-black uppercase tracking-widest">{label}</span>
            </div>
        </Link>
    );
}
