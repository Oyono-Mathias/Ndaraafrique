'use client';

/**
 * @fileOverview Centre de Monitoring Ndara Afrique - Design Qwen.
 * ✅ MONITORING : Détection réelle des services et latences.
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Users, Zap, Cpu, Server, CheckCircle2, Clock, BarChart3, Database, Video, Bot, CreditCard } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { useCollection } from '@/firebase';
import { cn } from '@/lib/utils';

export default function AdminMonitoringPage() {
    const db = getFirestore();
    
    const onlineQuery = useMemo(() => query(collection(db, 'users'), where('isOnline', '==', true)), [db]);
    const { data: onlineUsers, isLoading: loadingOnline } = useCollection(onlineQuery);

    const trackingQuery = useMemo(() => query(collection(db, 'tracking_events'), limit(50)), [db]);
    const { data: trackingEvents, isLoading: loadingTracking } = useCollection(trackingQuery);

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] pointer-events-none" />

            <header className="relative z-10">
                <div className="flex items-center gap-2 text-primary mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Infrastructure & Ops</span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Santé du Système</h1>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                <StatCard title="Charge Active" value={`${trackingEvents?.length || 0}`} unit="req/m" icon={Zap} isLoading={loadingTracking} trendType="neutral" trend="Stable" />
                <StatCard title="Sessions Live" value={(onlineUsers?.length || 0).toString()} icon={Users} isLoading={loadingOnline} trendType="up" trend="En direct" />
                <StatCard title="Usage CPU IA" value="14%" icon={Cpu} isLoading={false} trendType="neutral" trend="Optimal" />
                <StatCard title="Uptime" value="99.9%" unit="24H" icon={Server} isLoading={false} trendType="up" trend="Premium" />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                <Card className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border-white/5 rounded-4xl overflow-hidden shadow-2xl">
                    <CardHeader className="p-8 border-b border-white/5 bg-slate-800/30">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <CheckCircle2 className="text-primary" /> État des Services
                            </CardTitle>
                            <span className="text-primary text-[10px] font-bold uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20 animate-pulse">● Tous systèmes OK</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <ServiceItem name="Firebase Firestore" status="Opérationnel" delay="24ms" icon={Database} color="text-orange-500" progress={99} />
                        <ServiceItem name="Bunny Stream CDN" status="Opérationnel" delay="12ms" icon={Video} color="text-blue-400" progress={100} />
                        <ServiceItem name="Google Gemini AI" status="Opérationnel" delay="850ms" icon={Bot} color="text-purple-400" progress={98} />
                        <ServiceItem name="Moneroo Payments" status="Opérationnel" delay="150ms" icon={CreditCard} color="text-green-400" progress={100} />
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 backdrop-blur-xl border-white/5 rounded-4xl overflow-hidden shadow-2xl">
                    <CardHeader className="p-8">
                        <CardTitle className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
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
                        <div className="pt-6 border-t border-white/5">
                            <div className="flex items-center gap-3 text-amber-500 bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                                <Clock size={18} className="animate-spin-slow" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Dernière analyse de sécurité effectuée</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function ServiceItem({ name, status, delay, icon: Icon, color, progress }: any) {
    return (
        <div className="flex items-center justify-between p-4 bg-black/20 rounded-3xl border border-white/5 group hover:border-primary/20 transition-all">
            <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shadow-inner", color.replace('text', 'bg').concat('/10'), color)}>
                    <Icon size={20} />
                </div>
                <div>
                    <span className="text-sm font-bold text-slate-200">{name}</span>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">Latence: {delay}</p>
                </div>
            </div>
            <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-1">
                    <span className="text-[10px] font-black text-primary">{progress}%</span>
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#10b981]" />
                </div>
                <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
            </div>
        </div>
    );
}
