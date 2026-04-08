
'use client';

/**
 * @fileOverview Espace Ambassadeur Ndara Afrique V2 - Design Qwen Fintech.
 * ✅ DESIGN : Esthétique Fintech Neo-Banque (Neo-card, stat-pills, grain).
 * ✅ CROISSANCE : Outils de partage viral et paliers de bonus.
 * ✅ FONCTIONNEL : Retrait Mobile Money et Leaderboard réel.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Share2, 
    MousePointer2, 
    Users, 
    ShoppingCart, 
    Landmark, 
    ChevronRight, 
    ShieldCheck,
    Loader2,
    Clock,
    MessageCircle,
    Facebook,
    Twitter,
    Linkedin,
    Medal,
    Copy,
    Check,
    Sparkles,
    Crown,
    Lightbulb,
    Smartphone,
    ArrowUpRight,
    Wallet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { requestPayoutAction } from '@/actions/payoutActions';
import type { NdaraUser, AffiliateTransaction } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function AmbassadorPage() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const locale = useLocale();
    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [leaderboard, setLeaderboard] = useState<NdaraUser[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawMethod, setWithdrawMethod] = useState<'orange' | 'mtn' | 'wave'>('orange');
    const [phoneValue, setPhoneValue] = useState('');

    useEffect(() => {
        if (!currentUser?.uid) return;

        const unsubLeader = onSnapshot(
            query(
                collection(db, 'users'),
                where('affiliateStats.sales', '>', 0),
                orderBy('affiliateStats.sales', 'desc'),
                limit(5)
            ), 
            (snap) => {
                setLeaderboard(snap.docs.map(d => ({ uid: d.id, ...d.data() } as NdaraUser)));
                setLoadingData(false);
            }
        );

        return () => unsubLeader();
    }, [currentUser?.uid, db]);

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${locale}/search?aff=${currentUser?.uid}` : '';

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        toast({ title: "Lien copié !", description: "Partagez-le pour gagner des commissions." });
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleWithdraw = async () => {
        const balance = currentUser?.affiliateBalance || 0;
        if (balance < 5000) {
            toast({ variant: 'destructive', title: "Seuil insuffisant", description: "Le retrait minimum est de 5 000 XOF." });
            return;
        }
        if (!phoneValue || phoneValue.length < 8) {
            toast({ variant: 'destructive', title: "Numéro invalide", description: "Veuillez saisir votre numéro Mobile Money." });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await requestPayoutAction({ 
                instructorId: currentUser!.uid, 
                amount: balance, 
                method: 'mobile_money',
                requesterId: currentUser!.uid
            });
            if (result.success) {
                toast({ title: "Demande envoyée !", description: "Votre virement sera traité sous 48h." });
                setIsWithdrawModalOpen(false);
            } else {
                toast({ variant: 'destructive', title: "Erreur", description: result.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erreur technique" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isUserLoading) return <AmbassadorSkeleton />;

    const stats = currentUser?.affiliateStats || { clicks: 0, registrations: 0, sales: 0, earnings: 0 };

    return (
        <div className="flex flex-col gap-8 pb-32 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
            <div className="grain-overlay opacity-[0.04]" />

            <header className="fixed top-0 w-full z-50 bg-slate-950/95 backdrop-blur-md safe-area-pt border-b border-white/5">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="font-black text-xl text-white uppercase tracking-tight">Ambassadeur</h1>
                            <p className="text-primary text-[10px] font-black uppercase tracking-widest">Gagnez de l'argent 💰</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Medal className="h-5 w-5 text-primary" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Votre commission :</span>
                        <Badge className="bg-primary text-slate-950 border-none font-black text-[9px] px-2 py-0.5">10%</Badge>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-6 pt-32 space-y-8 animate-in fade-in duration-700">
                
                {/* --- NEO-BANK CARD --- */}
                <div 
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="bg-gradient-to-br from-[#10b981] via-[#047857] to-[#065f46] rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-primary/20 group active:scale-[0.98] transition-all cursor-pointer"
                >
                    <div className="absolute -right-6 -top-6 h-40 w-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000" />
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.25em] mb-1">Gains Disponibles</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-5xl font-black text-white leading-none">{(currentUser?.affiliateBalance || 0).toLocaleString('fr-FR')}</h2>
                                    <span className="text-sm font-bold text-white/70 uppercase">XOF</span>
                                </div>
                            </div>
                            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Wallet className="h-7 w-7 text-white" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <p className="text-emerald-100 text-[9px] font-bold uppercase tracking-widest opacity-60">Ce mois</p>
                                <p className="text-white text-base font-black">+{stats.earnings?.toLocaleString('fr-FR')} FCFA</p>
                            </div>
                            <div className="text-right">
                                <p className="text-emerald-100 text-[9px] font-bold uppercase tracking-widest opacity-60">En sécurisation</p>
                                <p className="text-white text-sm font-bold">{(currentUser?.pendingAffiliateBalance || 0).toLocaleString('fr-FR')} FCFA</p>
                            </div>
                        </div>

                        <Button className="w-full h-14 rounded-3xl bg-white text-[#047857] hover:bg-slate-50 font-black uppercase text-[11px] tracking-widest shadow-xl border-none">
                            <ArrowUpRight className="mr-2 h-4 w-4" />
                            Virement Mobile Money
                        </Button>
                    </div>
                </div>

                <div className="bg-[#1e293b] rounded-[2.5rem] p-6 border border-white/5 shadow-xl space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-white text-xs uppercase tracking-widest">Mon Lien Viral</h3>
                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-2">Actif</Badge>
                    </div>

                    <div className="bg-slate-950 rounded-2xl p-3 border border-white/10 flex items-center justify-between group active:scale-95 transition-all cursor-pointer" onClick={handleCopyLink}>
                        <span className="text-[11px] font-mono text-slate-500 truncate flex-1 pr-4">{shareUrl}</span>
                        <div className="h-10 px-4 rounded-xl bg-primary text-slate-950 flex items-center justify-center text-[10px] font-black uppercase tracking-widest shrink-0">
                            {isCopied ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
                            Copier
                        </div>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                        <ShareCircle icon={MessageCircle} color="bg-[#25D366]" href={`https://wa.me/?text=${encodeURIComponent("Rejoins-moi sur Ndara Afrique ! 🚀 " + shareUrl)}`} />
                        <ShareCircle icon={Facebook} color="bg-[#1877F2]" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} />
                        <ShareCircle icon={Twitter} color="bg-black" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Ma quête du savoir commence ici.")}&url=${encodeURIComponent(shareUrl)}`} />
                        <ShareCircle icon={Linkedin} color="bg-[#0A66C2]" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} />
                    </div>
                </div>

                <section className="grid grid-cols-3 gap-3">
                    <StatPill icon={MousePointer2} label="Clics" value={stats.clicks} color="text-blue-400" bgColor="bg-blue-500/10" />
                    <StatPill icon={Users} label="Inscrits" value={stats.registrations} color="text-primary" bgColor="bg-primary/10" />
                    <StatPill icon={ShoppingCart} label="Ventes" value={stats.sales} color="text-orange-400" bgColor="bg-orange-500/10" />
                </section>

                <div className="bg-[#1e293b] rounded-[2.5rem] p-6 border border-white/5 shadow-xl space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-white text-xs uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={14} className="text-primary" />
                            Booster mes Revenus
                        </h3>
                        <span className="text-primary text-[10px] font-black">Niveau 1/3</span>
                    </div>

                    <div className="space-y-5">
                        <BonusTier label="5 ventes → +2%" target={5} current={stats.sales} />
                        <BonusTier label="20 ventes → +5%" target={20} current={stats.sales} />
                        <BonusTier label="50 ventes → +10%" target={50} current={stats.sales} />
                    </div>
                </div>

                <div className="bg-[#1e293b] rounded-[2.5rem] p-6 border border-white/5 shadow-xl space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-white text-xs uppercase tracking-widest flex items-center gap-2">
                            <Crown size={14} className="text-yellow-500" />
                            Top Ambassadeurs
                        </h3>
                        <button className="text-primary text-[10px] font-black uppercase tracking-widest">Voir tout</button>
                    </div>

                    <div className="space-y-3">
                        {loadingData ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-900" />)
                        ) : leaderboard.map((user, idx) => (
                            <div key={user.uid} className={cn(
                                "flex items-center gap-4 p-3 rounded-2xl border transition-all",
                                idx === 0 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-slate-950/50 border-white/5"
                            )}>
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs",
                                    idx === 0 ? "bg-yellow-500 text-slate-950" : "bg-slate-800 text-slate-500"
                                )}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate uppercase tracking-tight">{user.fullName}</p>
                                    <p className={cn("text-[9px] font-black uppercase tracking-widest", idx === 0 ? "text-yellow-500" : "text-primary")}>
                                        {user.affiliateStats?.earnings?.toLocaleString('fr-FR')} FCFA
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-600 text-[8px] font-black uppercase">Ventes</p>
                                    <p className="text-sm font-black text-white">{user.affiliateStats?.sales}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded-[2.5rem] p-6 flex items-start gap-4">
                    <div className="p-2 bg-orange-500/20 rounded-xl">
                        <Lightbulb className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight mb-1">Astuce du Jour</h4>
                        <p className="text-xs text-slate-400 leading-relaxed italic">"Partagez votre lien dans les groupes WhatsApp d'étudiants. Les taux de conversion sont 3x plus élevés !"</p>
                    </div>
                </div>

            </main>

            <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
                <DialogContent className="bg-[#1e293b] border-white/5 rounded-[2.5rem] p-0 overflow-hidden sm:max-w-md">
                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Retrait Mobile Money</DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium italic">Recevez vos gains instantanément.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="p-8 space-y-6">
                        <div className="bg-slate-950 rounded-3xl p-5 border border-white/5 text-center">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Montant transférable</p>
                            <p className="text-3xl font-black text-primary">{(currentUser?.affiliateBalance || 0).toLocaleString('fr-FR')} FCFA</p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Méthode de versement</label>
                            <div className="grid grid-cols-3 gap-2">
                                <ProviderBtn active={withdrawMethod === 'orange'} onClick={() => setWithdrawMethod('orange')} label="Orange" color="bg-orange-500" />
                                <ProviderBtn active={withdrawMethod === 'mtn'} onClick={() => setWithdrawMethod('mtn')} label="MTN" color="bg-yellow-500" />
                                <ProviderBtn active={withdrawMethod === 'wave'} onClick={() => setWithdrawMethod('wave')} label="Wave" color="bg-blue-500" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Numéro de téléphone</label>
                            <Input 
                                type="tel" 
                                placeholder="+236 ..." 
                                value={phoneValue}
                                onChange={(e) => setPhoneValue(e.target.value)}
                                className="h-14 bg-slate-950 border-white/5 rounded-2xl text-white font-mono text-lg" 
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-slate-950/50 border-t border-white/5">
                        <Button 
                            onClick={handleWithdraw}
                            disabled={isSubmitting || (currentUser?.affiliateBalance || 0) < 5000}
                            className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Check className="mr-2 h-4 w-4" />}
                            Valider le retrait
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatPill({ icon: Icon, label, value, color, bgColor }: any) {
    return (
        <div className={cn("p-4 rounded-3xl text-center space-y-2 border border-white/5 shadow-xl", bgColor)}>
            <Icon className={cn("h-5 w-5 mx-auto", color)} />
            <p className="text-2xl font-black text-white leading-none">{value}</p>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
        </div>
    );
}

function ShareCircle({ icon: Icon, color, href }: any) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform", color)}>
            <Icon size={20} />
        </a>
    );
}

function BonusTier({ label, target, current }: any) {
    const progress = Math.min(100, (current / target) * 100);
    const reached = current >= target;
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className={cn(reached ? "text-primary" : "text-slate-500")}>{label}</span>
                <span className="text-white">{current}/{target}</span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 p-0.5">
                <div className={cn("h-full rounded-full transition-all duration-1000", reached ? "bg-primary shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-primary/30")} style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
}

function ProviderBtn({ active, onClick, label, color }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all active:scale-95 gap-1",
                active ? "border-primary bg-primary/5" : "border-transparent bg-slate-900 grayscale opacity-50"
            )}
        >
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[10px]", color)}>
                {label.charAt(0)}
            </div>
            <span className="text-[8px] font-black text-white uppercase">{label}</span>
        </button>
    );
}

function AmbassadorSkeleton() {
    return (
        <div className="p-6 space-y-8 pt-32">
            <Skeleton className="h-48 w-full rounded-[2.5rem] bg-slate-900" />
            <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-24 bg-slate-900 rounded-3xl" />
                <Skeleton className="h-24 bg-slate-900 rounded-3xl" />
                <Skeleton className="h-24 bg-slate-900 rounded-3xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" />
        </div>
    );
}
