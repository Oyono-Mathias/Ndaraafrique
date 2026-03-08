'use client';

/**
 * @fileOverview Espace Ambassadeur Ndara Afrique V2.
 * ✅ SÉCURITÉ : Affiche les soldes En Attente vs Disponible.
 * ✅ VIRALITÉ : Compteur d'impact social.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
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
    TrendingUp, 
    Landmark, 
    ChevronRight, 
    Sparkles, 
    ShieldCheck,
    Loader2,
    Clock,
    History
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { requestPayout } from '@/actions/payoutActions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AmbassadorPage() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const locale = useLocale();
    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(true);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const q = query(
            collection(db, 'affiliate_transactions'),
            where('affiliateId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const unsub = onSnapshot(q, (snap) => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoadingTransactions(false);
        });

        return () => unsub();
    }, [currentUser?.uid, db]);

    const handleShare = () => {
        const url = `${window.location.origin}/${locale}/search?aff=${currentUser?.uid}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Lien copié !", description: "Partagez ce lien pour gagner des commissions." });
    };

    const handleWithdraw = async () => {
        const balance = currentUser?.affiliateBalance || 0;
        if (balance < 5000) {
            toast({ variant: 'destructive', title: "Seuil insuffisant", description: "Le retrait minimum est de 5 000 XOF." });
            return;
        }
        setIsSubmitting(true);
        const result = await requestPayout({ instructorId: currentUser!.uid, amount: balance });
        if (result.success) toast({ title: "Demande envoyée !" });
        else toast({ variant: 'destructive', title: "Erreur", description: result.error });
        setIsSubmitting(false);
    };

    if (isUserLoading) return <AmbassadorSkeleton />;

    const stats = currentUser?.affiliateStats || { clicks: 0, registrations: 0, sales: 0, earnings: 0 };

    return (
        <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
            <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-2 text-primary mb-2">
                    <BadgeEuro className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Monétisation & Impact</span>
                </div>
                <h1 className="text-3xl font-black text-white leading-tight">Espace <br/><span className="text-primary">Ambassadeur</span></h1>
            </header>

            <div className="px-4 space-y-6">
                
                {/* --- CARTE SOLDES DOUBLE FLUX --- */}
                <div className="grid grid-cols-1 gap-4">
                    <Card className="bg-primary p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-primary/20 border-none">
                        <div className="absolute -right-6 -top-6 h-32 w-32 bg-white/10 rounded-full blur-3xl" />
                        <div className="relative z-10 space-y-1">
                            <p className="text-[10px] font-black uppercase text-white/60 tracking-[0.2em]">Solde Disponible</p>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-5xl font-black text-white">{(currentUser?.affiliateBalance || 0).toLocaleString('fr-FR')}</h2>
                                <span className="text-xs font-bold text-white/70 uppercase">XOF</span>
                            </div>
                        </div>
                        <div className="relative z-10 pt-8">
                            <Button 
                                onClick={handleWithdraw}
                                disabled={isSubmitting || (currentUser?.affiliateBalance || 0) < 5000}
                                className="w-full h-14 rounded-2xl bg-white text-primary hover:bg-slate-100 font-black uppercase text-[10px] shadow-xl"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Landmark className="mr-2 h-4 w-4" />}
                                Retirer mes gains
                            </Button>
                        </div>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800 p-6 rounded-[2rem] flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                                <Clock className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">En attente de validation</p>
                                <p className="text-xl font-black text-white">{(currentUser?.pendingAffiliateBalance || 0).toLocaleString('fr-FR')} <span className="text-xs">XOF</span></p>
                            </div>
                        </div>
                        <Badge variant="outline" className="border-slate-700 text-slate-500 text-[9px] uppercase font-black">Gel 14j</Badge>
                    </Card>
                </div>

                {/* --- COMPTEUR D'IMPACT VIRAL --- */}
                <section className="bg-gradient-to-r from-blue-600/20 to-primary/20 border border-white/5 rounded-[2.5rem] p-8 text-center space-y-4 shadow-2xl">
                    <div className="flex justify-center -space-x-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-10 w-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                                <Users className="h-5 w-5 text-slate-500" />
                            </div>
                        ))}
                        <div className="h-10 w-10 rounded-full border-2 border-slate-900 bg-primary flex items-center justify-center text-[10px] font-black text-white">
                            +{stats.registrations}
                        </div>
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Votre Impact Ndara</h3>
                    <p className="text-slate-400 text-xs font-medium">Vous avez déjà aidé <span className="text-white font-bold">{stats.registrations} personnes</span> à rejoindre le mouvement du savoir en Afrique.</p>
                </section>

                {/* --- STATS DE TUNNEL --- */}
                <section className="grid grid-cols-3 gap-3">
                    <StatBox icon={MousePointer2} label="Clics" value={stats.clicks} color="text-slate-400" />
                    <StatBox icon={Users} label="Inscrits" value={stats.registrations} color="text-blue-400" />
                    <StatBox icon={ShoppingCart} label="Ventes" value={stats.sales} color="text-emerald-400" />
                </section>

                {/* --- LIEN & ACTIONS --- */}
                <div className="space-y-3">
                    <Button onClick={handleShare} className="w-full h-16 bg-white text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest gap-3 shadow-xl active:scale-95 transition-all">
                        <Share2 className="h-5 w-5" /> Copier mon lien viral
                    </Button>
                </div>

                {/* --- DERNIÈRES TRANSACTIONS --- */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-500 ml-2">
                        <History className="h-4 w-4" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest">Historique de mes ventes</h3>
                    </div>
                    {loadingTransactions ? (
                        <Skeleton className="h-24 w-full rounded-3xl bg-slate-900" />
                    ) : transactions.length > 0 ? (
                        <div className="grid gap-3">
                            {transactions.map(t => <TransactionItem key={t.id} t={t} />)}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-slate-900/20 rounded-[2rem] border-2 border-dashed border-slate-800/50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Aucune vente enregistrée</p>
                        </div>
                    )}
                </section>

                {/* --- RÈGLES DE SÉCURITÉ --- */}
                <div className="p-6 bg-slate-900/30 border border-slate-800 rounded-3xl space-y-4">
                    <div className="flex items-center gap-2 text-slate-500">
                        <ShieldCheck className="h-4 w-4" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Sécurisation Ndara</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed italic">
                        "Pour protéger la plateforme, vos gains sont gelés pendant 14 jours. Passé ce délai de garantie contre les remboursements, ils deviennent payables."
                    </p>
                </div>

            </div>
        </div>
    );
}

function TransactionItem({ t }: any) {
    const statusConfig = {
        pending: { label: 'En sécurisation', color: 'text-amber-500 bg-amber-500/10' },
        approved: { label: 'Disponible', color: 'text-emerald-500 bg-emerald-500/10' },
        paid: { label: 'Payé', color: 'text-blue-500 bg-blue-500/10' },
        cancelled: { label: 'Annulé', color: 'text-red-500 bg-red-500/10' },
    }[t.status as string] || { label: t.status, color: 'bg-slate-800' };

    return (
        <Card className="bg-slate-900/50 border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-4">
                <p className="font-bold text-white text-sm truncate">{t.courseTitle}</p>
                <p className="text-[9px] text-slate-500 uppercase font-medium mt-0.5">Par {t.buyerName}</p>
            </div>
            <div className="text-right shrink-0">
                <p className="font-black text-white text-sm">+{t.commissionAmount.toLocaleString('fr-FR')} XOF</p>
                <Badge className={cn("text-[8px] font-black uppercase border-none px-2 mt-1", statusConfig.color)}>
                    {statusConfig.label}
                </Badge>
            </div>
        </Card>
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
