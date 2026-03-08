'use client';

/**
 * @fileOverview Espace Ambassadeur Ndara Afrique.
 * Centre de pilotage pour les étudiants souhaitant monétiser leur réseau.
 * ✅ TRAÇABILITÉ : Clics, Inscriptions, Ventes.
 * ✅ FINANCE : Retrait Mobile Money (Seuil 5000 XOF).
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    BadgeEuro, 
    Share2, 
    MousePointer2, 
    Users, 
    ShoppingCart, 
    TrendingUp, 
    Landmark, 
    ChevronRight, 
    Sparkles, 
    Award,
    ShieldCheck,
    Info,
    ArrowUpRight,
    Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { requestPayout } from '@/actions/payoutActions';

export default function AmbassadorPage() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const locale = useLocale();
    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [affiliateSettings, setAffiliateSettings] = useState({ percentage: 10, enabled: true });

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setAffiliateSettings({
                    percentage: data.commercial?.affiliatePercentage || 10,
                    enabled: data.commercial?.affiliateEnabled ?? true
                });
            }
        });
        return () => unsub();
    }, [db]);

    const handleShare = () => {
        const url = `${window.location.origin}/${locale}/search?aff=${currentUser?.uid}`;
        navigator.clipboard.writeText(url);
        toast({ 
            title: "Lien copié !", 
            description: "Partagez-le sur WhatsApp ou Facebook pour commencer à gagner." 
        });
    };

    const handleWithdraw = async () => {
        const balance = currentUser?.affiliateBalance || 0;
        if (balance < 5000) {
            toast({ 
                variant: 'destructive', 
                title: "Seuil insuffisant", 
                description: "Le retrait minimum est de 5 000 XOF." 
            });
            return;
        }

        setIsSubmitting(true);
        const result = await requestPayout({ 
            instructorId: currentUser!.uid, // Réutilisation de l'action générique
            amount: balance 
        });

        if (result.success) {
            toast({ 
                title: "Demande envoyée !", 
                description: "Votre gain sera transféré sur votre numéro Mobile Money sous 48h." 
            });
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsSubmitting(false);
    };

    const stats = currentUser?.affiliateStats || { clicks: 0, registrations: 0, sales: 0, earnings: 0 };
    const salesCount = stats.sales || 0;

    const nextTier = useMemo(() => {
        if (salesCount < 5) return { name: 'Bronze', goal: 5, bonus: '+2%', current: salesCount };
        if (salesCount < 20) return { name: 'Argent', goal: 20, bonus: '+5%', current: salesCount };
        if (salesCount < 50) return { name: 'Or', goal: 50, bonus: '+10%', current: salesCount };
        return { name: 'Platine', goal: 50, bonus: 'MAX', current: 50 };
    }, [salesCount]);

    if (isUserLoading) return <AmbassadorSkeleton />;

    return (
        <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
            <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-2 text-primary mb-2">
                    <BadgeEuro className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Monétisation</span>
                </div>
                <h1 className="text-3xl font-black text-white leading-tight">Espace <br/><span className="text-primary">Ambassadeur</span></h1>
                <p className="text-slate-500 text-sm mt-2 font-medium italic">Partagez le savoir, encaissez des revenus.</p>
            </header>

            <div className="px-4 space-y-6">
                
                {/* --- CARTE SOLDE PRINCIPALE --- */}
                <Card className="bg-primary p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-primary/20 border-none group">
                    <div className="absolute -right-6 -top-6 h-32 w-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                    <BadgeEuro className="absolute -right-4 -bottom-4 h-32 w-32 text-black/10" />
                    
                    <div className="relative z-10 space-y-1">
                        <p className="text-[10px] font-black uppercase text-white/60 tracking-[0.2em]">Gains Disponibles</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-5xl font-black text-white">{(currentUser?.affiliateBalance || 0).toLocaleString('fr-FR')}</h2>
                            <span className="text-xs font-bold text-white/70 uppercase">XOF</span>
                        </div>
                    </div>
                    
                    <div className="relative z-10 pt-10">
                        <Button 
                            onClick={handleWithdraw}
                            disabled={isSubmitting || (currentUser?.affiliateBalance || 0) < 5000}
                            className="w-full h-14 rounded-2xl bg-white text-primary hover:bg-slate-100 font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Landmark className="mr-2 h-4 w-4" />}
                            Retirer via Mobile Money
                        </Button>
                        <p className="text-[9px] text-white/50 text-center mt-4 font-bold uppercase tracking-tighter">
                            Seuil minimum de retrait : 5 000 XOF
                        </p>
                    </div>
                </Card>

                {/* --- STATS DE TUNNEL --- */}
                <section className="grid grid-cols-3 gap-3">
                    <StatBox icon={MousePointer2} label="Clics" value={stats.clicks} color="text-slate-400" />
                    <StatBox icon={Users} label="Inscrits" value={stats.registrations} color="text-blue-400" />
                    <StatBox icon={ShoppingCart} label="Ventes" value={stats.sales} color="text-emerald-400" />
                </section>

                {/* --- VOTRE LIEN VIRAL --- */}
                <Card className="bg-slate-900 border-slate-800 rounded-[2rem] p-6 shadow-xl border-l-4 border-l-primary">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <h3 className="text-xs font-black uppercase text-white tracking-widest">Votre Lien Viral</h3>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-slate-500 break-all">
                            {window.location.origin}/{locale}/search?aff={currentUser?.uid}
                        </div>
                        <Button onClick={handleShare} className="w-full h-12 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest gap-2">
                            <Share2 className="h-4 w-4" /> Copier et Partager
                        </Button>
                    </div>
                </Card>

                {/* --- PALIERS DE BONUS --- */}
                <Card className="bg-slate-900 border-slate-800 rounded-[2rem] p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03]"><Award size={80} className="text-primary" /></div>
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-sm font-black uppercase text-white tracking-[0.2em]">Niveau {nextTier.name}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Gagnez {nextTier.bonus} de commission supplémentaire</p>
                            </div>
                            <span className="text-xs font-black text-primary">{salesCount} / {nextTier.goal}</span>
                        </div>
                        <div className="space-y-2">
                            <Progress value={(salesCount / nextTier.goal) * 100} className="h-2 bg-slate-800" />
                            <p className="text-[9px] text-slate-600 font-bold text-center uppercase tracking-tighter">
                                {nextTier.goal - salesCount} ventes avant le prochain grade
                            </p>
                        </div>
                    </div>
                </Card>

                {/* --- RÈGLES D'OR --- */}
                <div className="p-6 bg-slate-900/30 border border-slate-800 rounded-3xl space-y-4">
                    <div className="flex items-center gap-2 text-slate-500">
                        <ShieldCheck className="h-4 w-4" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Charte de l'Ambassadeur</h4>
                    </div>
                    <ul className="space-y-3">
                        <RuleItem text="Règle du dernier clic : Le dernier lien cliqué par le client avant l'achat remporte la commission." />
                        <RuleItem text="Validité de 30 jours : Vos prospects restent liés à vous pendant 1 mois complet." />
                        <RuleItem text="Paiement 48h : Vos retraits sont traités rapidement par l'équipe finance." />
                    </ul>
                </div>

            </div>
        </div>
    );
}

function StatBox({ icon: Icon, label, value, color }: any) {
    return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-center space-y-1 shadow-lg">
            <Icon className={cn("h-4 w-4 mx-auto mb-1", color)} />
            <p className="text-xl font-black text-white">{value}</p>
            <p className="text-[8px] font-black uppercase text-slate-600 tracking-tighter">{label}</p>
        </div>
    );
}

function RuleItem({ text }: { text: string }) {
    return (
        <li className="flex items-start gap-3">
            <div className="h-1 w-1 rounded-full bg-primary mt-1.5 shrink-0" />
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{text}</p>
        </li>
    );
}

function AmbassadorSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <Skeleton className="h-12 w-1/2 bg-slate-900" />
            <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" />
            <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-20 bg-slate-900 rounded-3xl" />
                <Skeleton className="h-20 bg-slate-900 rounded-3xl" />
                <Skeleton className="h-20 bg-slate-900 rounded-3xl" />
            </div>
        </div>
    );
}
