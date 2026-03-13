'use client';

/**
 * @fileOverview Espace Ambassadeur Ndara Afrique V2 - Version Audit Final.
 * ✅ DESIGN : Esthétique Fintech Neo-Banque (Fond noir, coins 2rem, grain).
 * ✅ CROISSANCE : Outils de partage viral optimisés.
 * ✅ FIX : Correction syntaxe onSnapshot.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    BadgeEuro, 
    Share2, 
    MousePointer2, 
    Users, 
    ShoppingCart, 
    Landmark, 
    ChevronRight, 
    ShieldCheck,
    Loader2,
    Clock,
    History,
    MessageCircle,
    Facebook,
    Twitter,
    Linkedin,
    Medal,
    Copy,
    Check,
    Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { requestPayoutAction } from '@/actions/payoutActions';
import type { NdaraUser, AffiliateTransaction } from '@/lib/types';

export default function AmbassadorPage() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const locale = useLocale();
    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [transactions, setTransactions] = useState<AffiliateTransaction[]>([]);
    const [leaderboard, setLeaderboard] = useState<NdaraUser[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const unsubTrans = onSnapshot(
            query(
                collection(db, 'affiliate_transactions'),
                where('affiliateId', '==', currentUser.uid),
                orderBy('createdAt', 'desc'),
                limit(10)
            ), 
            (snap) => {
                setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as AffiliateTransaction)));
            }
        );

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

        return () => { 
            unsubTrans(); 
            unsubLeader(); 
        };
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
        setIsSubmitting(true);
        const result = await requestPayoutAction({ instructorId: currentUser!.uid, amount: balance, method: 'mobile_money' });
        if (result.success) toast({ title: "Demande de retrait envoyée !" });
        else toast({ variant: 'destructive', title: "Erreur", description: result.error });
        setIsSubmitting(false);
    };

    if (isUserLoading) return <AmbassadorSkeleton />;

    const stats = currentUser?.affiliateStats || { clicks: 0, registrations: 0, sales: 0, earnings: 0 };

    return (
        <div className="flex flex-col gap-8 pb-32 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
            {/* Header Salutation */}
            <header className="px-6 pt-12 animate-in fade-in slide-in-from-top-4 duration-1000">
                <div className="flex items-center gap-2 text-primary mb-3">
                    <BadgeEuro className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Monétisation & Impact</span>
                </div>
                <h1 className="text-4xl font-black text-white leading-tight uppercase tracking-tight">
                    Espace <br/><span className="text-primary">Ambassadeur</span>
                </h1>
                <p className="text-slate-500 text-sm mt-3 font-medium italic">Transformez votre réseau en revenus passifs.</p>
            </header>

            <div className="px-6 space-y-8">
                
                {/* --- NEO-BANK BALANCE CARD --- */}
                <Card className="bg-primary p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-primary/20 border-none group active:scale-[0.98] transition-all">
                    <div className="absolute -right-6 -top-6 h-40 w-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000" />
                    <div className="relative z-10 space-y-1">
                        <p className="text-[10px] font-black uppercase text-white/60 tracking-[0.25em]">Gains Disponibles</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-5xl font-black text-white leading-none">{(currentUser?.affiliateBalance || 0).toLocaleString('fr-FR')}</h2>
                            <span className="text-sm font-bold text-white/70 uppercase">XOF</span>
                        </div>
                    </div>
                    <div className="relative z-10 pt-8">
                        <Button 
                            onClick={handleWithdraw}
                            disabled={isSubmitting || (currentUser?.affiliateBalance || 0) < 5000}
                            className="w-full h-14 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-black/10 transition-all border-none"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Landmark className="mr-2 h-4 w-4" />}
                            Virement Mobile Money
                        </Button>
                    </div>
                </Card>

                {/* --- PENDING BALANCE --- */}
                <div className="bg-slate-900 border border-white/5 p-6 rounded-[2rem] flex items-center justify-between shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 shadow-inner">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-0.5">En sécurisation</p>
                            <p className="text-xl font-black text-white">{(currentUser?.pendingAffiliateBalance || 0).toLocaleString('fr-FR')} <span className="text-xs opacity-40">XOF</span></p>
                        </div>
                    </div>
                    <Badge variant="outline" className="border-amber-500/20 text-amber-500 text-[8px] uppercase font-black px-2 py-0.5 bg-amber-500/5">GEL 14J</Badge>
                </div>

                {/* --- STATS CONVERSION --- */}
                <section className="grid grid-cols-3 gap-3">
                    <StatPill icon={MousePointer2} label="Clics" value={stats.clicks} color="text-slate-400" />
                    <StatPill icon={Users} label="Inscrits" value={stats.registrations} color="text-blue-400" />
                    <StatPill icon={ShoppingCart} label="Ventes" value={stats.sales} color="text-emerald-400" />
                </section>

                {/* --- VIRAL SHARING SECTION --- */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1">
                        <Share2 className="h-4 w-4 text-primary" /> Mon lien viral
                    </h3>
                    <Card className="bg-slate-900 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-6">
                        <div className="bg-slate-950 rounded-2xl p-4 border border-white/5 flex items-center justify-between group active:scale-95 transition-all cursor-pointer" onClick={handleCopyLink}>
                            <span className="text-xs font-mono text-slate-400 truncate flex-1 pr-4">{shareUrl}</span>
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                            </div>
                        </div>
                        <div className="flex justify-between items-center gap-3">
                            <ShareCircleIcon icon={MessageCircle} color="bg-[#25D366]" href={`https://wa.me/?text=${encodeURIComponent("Rejoins-moi sur Ndara Afrique pour apprendre les compétences du futur ! 🚀 " + shareUrl)}`} />
                            <ShareCircleIcon icon={Facebook} color="bg-[#1877F2]" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} />
                            <ShareCircleIcon icon={Twitter} color="bg-black" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Ma quête du savoir commence sur Ndara Afrique. Rejoignez-nous !")}&url=${encodeURIComponent(shareUrl)}`} />
                            <ShareCircleIcon icon={Linkedin} color="bg-[#0A66C2]" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} />
                        </div>
                    </Card>
                </div>

                {/* --- BOURSE DES AMBASSADEURS --- */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1">
                        <Medal className="h-4 w-4 text-amber-500" /> TOP AMBASSADEURS
                    </h3>
                    <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        {leaderboard.length > 0 ? leaderboard.map((user, idx) => (
                            <div key={user.uid} className={cn("flex items-center justify-between p-5 border-b border-white/5 last:border-0", user.uid === currentUser?.uid && "bg-primary/5")}>
                                <div className="flex items-center gap-4">
                                    <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center font-black text-[11px]", idx === 0 ? "bg-yellow-500 text-black shadow-lg" : "bg-slate-800 text-slate-500")}>
                                        {idx + 1}
                                    </div>
                                    <span className={cn("text-sm font-bold truncate max-w-[140px]", user.uid === currentUser?.uid ? "text-primary" : "text-white")}>{user.fullName}</span>
                                </div>
                                <p className="text-xs font-black text-white uppercase">{user.affiliateStats?.sales} <span className="text-[8px] text-slate-600 ml-1">Ventes</span></p>
                            </div>
                        )) : <div className="p-8 text-center opacity-20"><Medal className="mx-auto mb-2 opacity-50" /><p className="text-[10px] font-bold uppercase tracking-widest">Le classement arrive...</p></div>}
                    </div>
                </div>

                {/* --- PALIERS DE BONUS --- */}
                <Card className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-2">
                        <Sparkles size={14} /> Booster mes revenus
                    </h3>
                    <div className="space-y-5">
                        <BonusTierItem label="Apprenti (5 Ventes)" bonus="+2%" current={stats.sales} target={5} />
                        <BonusTierItem label="Elite (20 Ventes)" bonus="+5%" current={stats.sales} target={20} />
                        <BonusTierItem label="Légende (50 Ventes)" bonus="+10%" current={stats.sales} target={50} />
                    </div>
                </Card>

                {/* Footer Assurance */}
                <div className="p-6 bg-slate-900/30 border border-white/5 rounded-[2rem] flex items-start gap-4">
                    <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">
                        Les commissions sont auditées et gelées pendant 14 jours par mesure de sécurité avant d'être transférées vers votre solde de retrait.
                    </p>
                </div>

            </div>
        </div>
    );
}

function StatPill({ icon: Icon, label, value, color }: any) {
    return (
        <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl text-center space-y-1.5 shadow-xl active:scale-95 transition-all">
            <Icon className={cn("h-4 w-4 mx-auto mb-1", color)} />
            <p className="text-2xl font-black text-white leading-none">{value}</p>
            <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest">{label}</p>
        </div>
    );
}

function ShareCircleIcon({ icon: Icon, color, href }: any) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cn("h-12 w-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform", color)}>
            <Icon size={20} />
        </a>
    );
}

function BonusTierItem({ label, bonus, current, target }: any) {
    const progress = Math.min(100, (current / target) * 100);
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className={cn(current >= target ? "text-primary" : "text-slate-500")}>{label}</span>
                <span className="text-slate-600">{current}/{target} <span className="text-primary ml-1">{bonus}</span></span>
            </div>
            <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5 p-[1px]">
                <div className={cn("h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]", current >= target ? "bg-emerald-500" : "bg-primary")} style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
}

function AmbassadorSkeleton() {
    return (
        <div className="p-6 space-y-8 pt-12">
            <Skeleton className="h-12 w-3/4 bg-slate-900 rounded-xl" />
            <Skeleton className="h-48 w-full rounded-[2.5rem] bg-slate-900" />
            <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-24 bg-slate-900 rounded-3xl" />
                <Skeleton className="h-24 bg-slate-900 rounded-3xl" />
                <Skeleton className="h-24 bg-slate-900 rounded-3xl" />
            </div>
        </div>
    );
}
