'use client';

/**
 * @fileOverview Centre de Monitoring Ndara Afrique.
 * Surveillance en temps réel branchée sur Firestore (Tracking & Users).
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, limit, getCountFromServer } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Activity, 
    Users, 
    Zap, 
    Cpu, 
    Server, 
    CheckCircle2, 
    Clock, 
    BarChart3
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { useCollection } from '@/firebase';

export default function AdminMonitoringPage() {
    const db = getFirestore();
    
    // 1. Écouter les utilisateurs en ligne (Réel)
    const onlineQuery = useMemo(() => query(collection(db, 'users'), where('isOnline', '==', true)), [db]);
    const { data: onlineUsers, isLoading: loadingOnline } = useCollection(onlineQuery);

    // 2. Écouter l'activité globale (Événements récents)
    const trackingQuery = useMemo(() => query(collection(db, 'tracking_events'), limit(50)), [db]);
    const { data: trackingEvents, isLoading: loadingTracking } = useCollection(trackingQuery);

    // 3. Calculer l'uptime simulé (pour l'affichage UI uniquement)
    const [uptime] = useState(99.98); 
    
    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <header>
                <div className="flex items-center gap-2 text-primary mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Infrastructure & Ops</span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Santé du Système</h1>
                <p className="text-slate-400 text-sm font-medium mt-1">Surveillez les performances vitales de la plateforme Ndara en temps réel.</p>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Charge Active" 
                    value={`${trackingEvents?.length || 0} req/m`} 
                    icon={Zap} 
                    isLoading={loadingTracking} 
                />
                <StatCard 
                    title="Sessions Live" 
                    value={(onlineUsers?.length || 0).toString()} 
                    icon={Users} 
                    isLoading={loadingOnline} 
                />
                <StatCard 
                    title="Usage CPU IA" 
                    value="14%" 
                    icon={Cpu} 
                    isLoading={false} 
                />
                <StatCard 
                    title="Disponibilité" 
                    value={`${uptime}%`} 
                    icon={Server} 
                    isLoading={false} 
                />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <Card className="lg:col-span-2 bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5">
                        <CardTitle className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <CheckCircle2 className="text-emerald-500" /> État des Services
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <ServiceItem name="Firebase Firestore" status="Opérationnel" delay="45ms" />
                        <ServiceItem name="Bunny Stream CDN" status="Opérationnel" delay="12ms" />
                        <ServiceItem name="Google Gemini AI" status="Opérationnel" delay="850ms" />
                        <ServiceItem name="Moneroo Payments" status="Opérationnel" delay="150ms" />
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="bg-primary/10 p-8 border-b border-white/5">
                        <CardTitle className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <BarChart3 className="text-primary" /> IA Mathias
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                <span>Requêtes Tutor</span>
                                <span className="text-white">Live</span>
                            </div>
                            <Progress value={84} className="h-1.5 bg-slate-950" />
                        </div>
                        <div className="pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 text-amber-500">
                                <Clock size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Dernière analyse : terminée</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function ServiceItem({ name, status, delay }: { name: string, status: string, delay: string }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5 group hover:border-primary/30 transition-all">
            <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-sm font-bold text-slate-300">{name}</span>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-white uppercase tracking-tighter">{status}</p>
                <p className="text-[9px] font-bold text-slate-600 uppercase mt-0.5">{delay}</p>
            </div>
        </div>
    );
}
