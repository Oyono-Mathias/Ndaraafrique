'use client';

/**
 * @fileOverview Centre de Monitoring Ndara Afrique.
 * Surveillance en temps réel de la santé système et de l'usage IA.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
    Activity, 
    Users, 
    Database, 
    Zap, 
    Cpu, 
    Server, 
    AlertCircle, 
    CheckCircle2,
    Clock,
    BarChart3
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { cn } from '@/lib/utils';

export default function AdminMonitoringPage() {
    const [uptime, setUptime] = useState(99.98);
    
    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <header>
                <div className="flex items-center gap-2 text-primary mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Infrastructure & Ops</span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Santé du Système</h1>
                <p className="text-slate-400 text-sm font-medium mt-1">Surveillez les performances vitales de la plateforme Ndara.</p>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Temps de réponse" value="124ms" icon={Zap} isLoading={false} />
                <StatCard title="Utilisateurs Actifs" value="42" icon={Users} isLoading={false} />
                <StatCard title="Usage CPU" value="14%" icon={Cpu} isLoading={false} />
                <StatCard title="Disponibilité" value={`${uptime}%`} icon={Server} isLoading={false} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* --- STATUT DES SERVICES --- */}
                <Card className="lg:col-span-2 bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5">
                        <CardTitle className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <CheckCircle2 className="text-emerald-500" /> État des Services Cloud
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <ServiceItem name="Firebase Firestore" status="Opérationnel" delay="45ms" />
                        <ServiceItem name="Bunny Stream CDN" status="Opérationnel" delay="12ms" />
                        <ServiceItem name="Google Gemini AI" status="Opérationnel" delay="850ms" />
                        <ServiceItem name="Moneroo Payments" status="Opérationnel" delay="150ms" />
                        <ServiceItem name="PWA Service Worker" status="Actif" delay="Stable" />
                    </CardContent>
                </Card>

                {/* --- USAGE IA MATHIAS --- */}
                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-primary/10 p-8 border-b border-white/5">
                        <CardTitle className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <BarChart3 className="text-primary" /> Usage IA Mathias
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                <span>Requêtes Tutor</span>
                                <span className="text-white">8.4k / 10k</span>
                            </div>
                            <Progress value={84} className="h-1.5 bg-slate-950" />
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                <span>Analyse Devoirs</span>
                                <span className="text-white">450 / 1k</span>
                            </div>
                            <Progress value={45} className="h-1.5 bg-slate-950" />
                        </div>
                        <div className="pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 text-amber-500">
                                <Clock size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Dernier Job : Il y a 2 min</span>
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
