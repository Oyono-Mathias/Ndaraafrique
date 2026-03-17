'use client';

/**
 * @fileOverview Centre de Marketing & Growth Hub Ndara Afrique.
 * Branché sur la collection Firestore 'marketing_campaigns'.
 * ✅ DESIGN QWEN : Radar des Campagnes & Entonnoir d'Acquisition.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { 
    Target, 
    Plus, 
    MousePointer2, 
    Users, 
    TrendingUp, 
    Zap, 
    History,
    BarChart2,
    Radar,
    Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function AdminMarketingPage() {
    const db = getFirestore();
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    // Raccordement réel à la collection marketing
    const campaignsQuery = useMemo(() => query(collection(db, 'marketing_campaigns'), orderBy('createdAt', 'desc'), limit(10)), [db]);
    const { data: campaigns, isLoading } = useCollection<any>(campaignsQuery);

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700 relative">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-ndara-amber/5 rounded-full blur-[120px] pointer-events-none" />

            <header className="relative z-10">
                <div className="flex items-center gap-2 text-ndara-amber mb-1">
                    <Zap className="h-4 w-4 fill-ndara-amber" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Growth & Conversion Hub</span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Marketing Hub</h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Pilotez votre machine de croissance Ndara Afrique.</p>
            </header>

            {/* --- ENTONNOIR D'ACQUISITION --- */}
            <section className="relative z-10 space-y-4">
                <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 px-1">
                    <BarChart2 className="h-4 w-4 text-primary" />
                    Entonnoir d'Acquisition
                </h2>
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-4xl p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    
                    <div className="grid gap-6 relative z-10">
                        <FunnelBarItem label="Affiliation" value={65} color="from-primary to-emerald-400" />
                        <FunnelBarItem label="Direct" value={25} color="from-blue-600 to-blue-400" />
                        <FunnelBarItem label="Publicité" value={10} color="from-ndara-amber to-amber-400" />
                    </div>
                </div>
            </section>

            {/* --- RADAR DES CAMPAGNES --- */}
            <section className="relative z-10 space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Radar className="h-4 w-4 text-primary" />
                        Radar des Campagnes
                    </h2>
                    <Button variant="ghost" size="sm" className="h-8 text-primary font-black uppercase text-[9px] tracking-widest">
                        <Plus className="h-3 w-3 mr-1" /> Créer une campagne
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {isLoading ? (
                        [...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-3xl bg-slate-900" />)
                    ) : campaigns && campaigns.length > 0 ? (
                        campaigns.map(camp => (
                            <CampaignCard key={camp.id} camp={camp} />
                        ))
                    ) : (
                        <>
                            <CampaignCard camp={{ name: "Black Friday", clicks: 1250, status: "Active", trend: "+12%" }} isSimulated />
                            <CampaignCard camp={{ name: "Parrainage", clicks: 840, status: "Active", trend: "Stable" }} isSimulated isAmber />
                        </>
                    )}
                </div>
            </section>

            {/* --- HISTORY SECTION --- */}
            <section className="relative z-10 space-y-4">
                <div className="flex items-center gap-2 text-slate-500 ml-1">
                    <History className="h-4 w-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Historique des Performances</h3>
                </div>
                
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-4xl overflow-hidden shadow-2xl">
                    {isLoading ? (
                        <div className="p-8 space-y-4">
                            <Skeleton className="h-12 w-full rounded-2xl bg-slate-800" />
                            <Skeleton className="h-12 w-full rounded-2xl bg-slate-800" />
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {campaigns?.map((camp: any) => (
                                <div key={camp.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500">
                                            <Target size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white uppercase tracking-tight text-sm">{camp.name}</p>
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{camp.type || 'Standard'}</p>
                                        </div>
                                    </div>
                                    <Badge className={cn(
                                        "text-[9px] font-black uppercase border-none px-2.5 py-1",
                                        camp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'
                                    )}>{camp.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function FunnelBarItem({ label, value, color }: { label: string, value: number, color: string }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
                <span className="text-slate-500">{label}</span>
                <span className="text-white">{value}%</span>
            </div>
            <div className="w-full bg-slate-950/50 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/5">
                <div 
                    className={cn("h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)] bg-gradient-to-r", color)}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

function CampaignCard({ camp, isSimulated = false, isAmber = false }: { camp: any, isSimulated?: boolean, isAmber?: boolean }) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 relative overflow-hidden group active:scale-[0.98] transition-all shadow-xl">
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700",
                isAmber ? "from-ndara-amber/10 to-transparent" : "from-primary/10 to-transparent"
            )}></div>
            
            <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{camp.name}</span>
                    <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        isAmber ? "bg-ndara-amber shadow-[0_0_8px_#f59e0b]" : "bg-primary shadow-[0_0_8px_#10b981]"
                    )} />
                </div>
                
                <div>
                    <p className="text-3xl font-black text-white tracking-tighter leading-none">{camp.clicks.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1.5">Impact (Clics)</p>
                </div>

                <div className={cn(
                    "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest",
                    isAmber ? "text-ndara-amber" : "text-primary"
                )}>
                    {camp.trend === 'Stable' ? <Zap size={12} /> : <TrendingUp size={12} />}
                    {camp.trend || 'Actif'}
                </div>
            </div>
        </div>
    );
}

