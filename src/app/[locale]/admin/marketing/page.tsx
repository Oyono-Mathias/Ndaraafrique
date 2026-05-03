'use client';

/**
 * @fileOverview Centre de Marketing & Growth Hub Ndara Afrique.
 * ✅ CEO FEATURE : Kit de diffusion WhatsApp pour copier-coller le message d'annonce.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, limit } from 'firebase/firestore';
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
    Flame,
    MessageSquare,
    Copy,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';

export default function AdminMarketingPage() {
    const db = getFirestore();
    const t = useTranslations('Admin');
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);

    // Raccordement réel à la collection marketing
    const campaignsQuery = useMemo(() => query(collection(db, 'marketing_campaigns'), orderBy('createdAt', 'desc'), limit(10)), [db]);
    const { data: campaigns, isLoading } = useCollection<any>(campaignsQuery);

    const handleCopyTemplate = () => {
        navigator.clipboard.writeText(t('whatsapp_template'));
        setIsCopied(true);
        toast({ title: "Kit copié !", description: "Le message WhatsApp est prêt à être collé." });
        setTimeout(() => setIsCopied(false), 2000);
    };

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

            <div className="grid lg:grid-cols-3 gap-8 relative z-10">
                
                {/* --- ENTONNOIR ET RADAR --- */}
                <div className="lg:col-span-2 space-y-10">
                    {/* Kit de Diffusion WhatsApp */}
                    <section className="space-y-4">
                        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 px-1">
                            <MessageSquare className="h-4 w-4 text-emerald-500" />
                            Kit de Diffusion WhatsApp
                        </h2>
                        <div className="bg-slate-900 border border-white/5 rounded-4xl p-8 relative overflow-hidden shadow-2xl">
                            <div className="space-y-4">
                                <p className="text-xs text-slate-400 font-medium italic">
                                    "Message d'annonce officiel pour les groupes communautaires."
                                </p>
                                <div className="bg-slate-950/80 rounded-2xl p-6 border border-white/5 font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto hide-scrollbar">
                                    {t('whatsapp_template')}
                                </div>
                                <Button 
                                    onClick={handleCopyTemplate}
                                    className="w-full h-14 rounded-2xl bg-[#25D366] hover:bg-[#128C7E] text-white font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-xl shadow-emerald-500/10"
                                >
                                    {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                    {isCopied ? "Copié dans le presse-papier" : "Copier le message WhatsApp"}
                                </Button>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 px-1">
                            <BarChart2 className="h-4 w-4 text-primary" />
                            Entonnoir d'Acquisition
                        </h2>
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-4xl p-8 relative overflow-hidden shadow-2xl">
                            <div className="grid gap-6 relative z-10">
                                <FunnelBarItem label="Affiliation" value={65} color="from-primary to-emerald-400" />
                                <FunnelBarItem label="Direct" value={25} color="from-blue-600 to-blue-400" />
                                <FunnelBarItem label="Publicité" value={10} color="from-ndara-amber to-amber-400" />
                            </div>
                        </div>
                    </section>
                </div>

                {/* --- SIDEBAR RADAR --- */}
                <div className="space-y-8">
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                <Radar className="h-4 w-4 text-primary" />
                                Radar Live
                            </h2>
                        </div>
                        <div className="grid gap-4">
                            {isLoading ? (
                                [...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-3xl bg-slate-900" />)
                            ) : campaigns && campaigns.length > 0 ? (
                                campaigns.map(camp => (
                                    <CampaignCard key={camp.id} camp={camp} />
                                ))
                            ) : (
                                <>
                                    <CampaignCard camp={{ name: "Black Friday", clicks: 1250, status: "Active", trend: "+12%" }} isSimulated />
                                    <CampaignCard camp={{ name: "Lancement Ndara", clicks: 3450, status: "Active", trend: "Viral" }} isSimulated isAmber />
                                </>
                            )}
                        </div>
                    </section>
                </div>
            </div>
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
