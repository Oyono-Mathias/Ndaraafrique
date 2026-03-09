'use client';

/**
 * @fileOverview Dashboard Financier de l'Instructeur (Payout System v2).
 * ✅ CALCULS : Revenus Formations, Revenus Parrainage, Solde Disponible.
 * ✅ ACTIONS : Demande de retrait sécurisée.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Wallet, 
    TrendingUp, 
    ArrowUpRight, 
    History, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Landmark,
    Smartphone,
    CreditCard,
    BadgeEuro,
    AlertCircle,
    Loader2,
    ChevronRight
} from 'lucide-react';
import { requestPayoutAction } from '@/actions/payoutActions';
import { useToast } from '@/hooks/use-toast';
import type { Payment, PayoutRequest } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function InstructorRevenuePage() {
    const { currentUser: instructor, isUserLoading } = useRole();
    const db = getFirestore();
    const { toast } = useToast();

    const [payments, setPayments] = useState<Payment[]>([]);
    const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
    const [isDialogOpen, setIsDriveOpen] = useState(false);
    const [payoutMethod, setPayoutMethod] = useState<'mobile_money' | 'bank_transfer'>('mobile_money');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (!instructor?.uid) return;

        setIsLoadingData(true);
        const instructorId = instructor.uid;

        // 1. Écouter les revenus formations
        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('instructorId', '==', instructorId), where('status', '==', 'Completed')),
            (snap) => {
                setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
            }
        );

        // 2. Écouter les demandes de retrait (Historique)
        const unsubPayouts = onSnapshot(
            query(collection(db, 'payout_requests'), where('instructorId', '==', instructorId), orderBy('createdAt', 'desc'), limit(50)),
            (snap) => {
                setPayoutRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest)));
                setIsLoadingData(false);
            },
            (err) => {
                console.warn("History fetch error (waiting for index?):", err);
                setIsLoadingData(false);
            }
        );

        return () => {
            unsubPayments();
            unsubPayouts();
        };
    }, [instructor?.uid, db]);

    const stats = useMemo(() => {
        // A. Revenus Formations
        const totalCoursesEarned = payments.reduce((acc, p) => acc + p.amount, 0);
        
        // B. Revenus Parrainage (Disponible + Gelé)
        const referralEarned = (instructor?.referralBalance || 0) + (instructor?.affiliateBalance || 0);
        const pendingRefBalance = (instructor?.pendingAffiliateBalance || 0);

        // C. Somme des retraits (Tout sauf les rejetés)
        const totalWithdrawn = payoutRequests
            .filter(p => p.status !== 'rejected')
            .reduce((acc, p) => acc + p.amount, 0);
        
        // D. Solde Disponible
        const availableBalance = (totalCoursesEarned + referralEarned) - totalWithdrawn;

        // E. Retrait en cours
        const pendingPayoutAmount = payoutRequests
            .filter(p => p.status === 'pending' || p.status === 'approved')
            .reduce((acc, p) => acc + p.amount, 0);

        return {
            totalCoursesEarned,
            referralEarned,
            pendingRefBalance,
            availableBalance: Math.max(0, availableBalance),
            pendingPayoutAmount
        };
    }, [payments, payoutRequests, instructor]);

    const handleRequestWithdrawal = async () => {
        if (!instructor) return;
        if (stats.availableBalance < 5000) {
            toast({ variant: 'destructive', title: "Seuil insuffisant", description: "Le retrait minimum est de 5 000 XOF." });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await requestPayoutAction({
                instructorId: instructor.uid,
                amount: stats.availableBalance,
                method: payoutMethod
            });

            if (result.success) {
                toast({ title: "Demande envoyée !", description: "Votre retrait sera traité sous 48h." });
                setIsDriveOpen(false);
            } else {
                toast({ variant: 'destructive', title: "Erreur", description: result.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erreur technique" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isUserLoading || isLoadingData) return <RevenueSkeleton />;

    return (
        <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy animate-in fade-in duration-700">
            
            {/* --- HEADER --- */}
            <header className="px-4 pt-8">
                <div className="flex items-center gap-2 text-primary mb-2">
                    <Wallet className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Trésorerie & Gains</span>
                </div>
                <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">Tableau <br/><span className="text-primary">des Revenus</span></h1>
            </header>

            <div className="px-4 space-y-6">
                
                {/* --- CARTE SOLDE DISPONIBLE --- */}
                <Card className="bg-primary p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-primary/20 border-none">
                    <div className="absolute -right-6 -top-6 h-32 w-32 bg-white/10 rounded-full blur-3xl" />
                    <Landmark className="absolute -right-4 -bottom-4 h-24 w-24 text-black/10" />
                    
                    <div className="relative z-10 space-y-1">
                        <p className="text-[10px] font-black uppercase text-white/60 tracking-[0.2em]">Solde Disponible</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-5xl font-black text-white">{stats.availableBalance.toLocaleString('fr-FR')}</h2>
                            <span className="text-xs font-bold text-white/70 uppercase">XOF</span>
                        </div>
                    </div>
                    
                    <div className="relative z-10 pt-8">
                        <Button 
                            onClick={() => setIsDriveOpen(true)}
                            disabled={stats.availableBalance < 5000}
                            className="w-full h-14 rounded-2xl bg-white text-primary hover:bg-slate-100 font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                        >
                            Retirer mes fonds
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                        <p className="text-[9px] text-white/50 text-center mt-4 font-bold uppercase tracking-tighter">
                            Seuil minimum de retrait : 5 000 XOF
                        </p>
                    </div>
                </Card>

                {/* --- STATS DÉTAILLÉES --- */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-slate-900 border-slate-800 p-5 rounded-[2rem] shadow-xl">
                        <div className="p-2 bg-blue-500/10 rounded-xl inline-block mb-2">
                            <TrendingUp className="h-4 w-4 text-blue-400" />
                        </div>
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Gains Formations</p>
                        <p className="text-lg font-black text-white mt-1">{stats.totalCoursesEarned.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-600">XOF</span></p>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800 p-5 rounded-[2rem] shadow-xl">
                        <div className="p-2 bg-emerald-500/10 rounded-xl inline-block mb-2">
                            <BadgeEuro className="h-4 w-4 text-emerald-400" />
                        </div>
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Gains Réseau</p>
                        <p className="text-lg font-black text-white mt-1">{stats.referralEarned.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-600">XOF</span></p>
                    </Card>
                </div>

                {/* --- RETRAITS EN COURS --- */}
                {stats.pendingPayoutAmount > 0 && (
                    <Card className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-[2rem] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                                <Clock className="h-6 w-6 animate-pulse" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Retrait en cours de traitement</p>
                                <p className="text-xl font-black text-white">{stats.pendingPayoutAmount.toLocaleString('fr-FR')} <span className="text-xs">XOF</span></p>
                            </div>
                        </div>
                        <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-[9px] uppercase font-black px-3">Audit</Badge>
                    </Card>
                )}

                {/* --- HISTORIQUE DES RETRAITS --- */}
                <section className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 text-slate-500 ml-2">
                        <History className="h-4 w-4" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Journal des retraits</h3>
                    </div>

                    {payoutRequests.length > 0 ? (
                        <div className="grid gap-3">
                            {payoutRequests.map(req => <PayoutRequestItem key={req.id} req={req} />)}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800/50 opacity-30">
                            <History className="h-10 w-10 mx-auto text-slate-700 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Aucun historique de retrait</p>
                        </div>
                    )}
                </section>

            </div>

            {/* --- MODAL DE RETRAIT --- */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDriveOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 rounded-[2.5rem] p-0 overflow-hidden sm:max-w-md">
                    <DialogHeader className="p-8 pb-4">
                        <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Retrait de fonds</DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium">Choisissez votre méthode préférée.</DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                        <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 text-center">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Montant à transférer</p>
                            <p className="text-3xl font-black text-primary">{stats.availableBalance.toLocaleString('fr-FR')} XOF</p>
                        </div>

                        <RadioGroup 
                            value={payoutMethod} 
                            onValueChange={(v: any) => setPayoutMethod(v)}
                            className="grid grid-cols-1 gap-3"
                        >
                            <label className={cn(
                                "flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer active:scale-95",
                                payoutMethod === 'mobile_money' ? "border-primary bg-primary/5 shadow-lg" : "border-slate-800 bg-slate-900/50"
                            )}>
                                <div className="flex items-center gap-4">
                                    <Smartphone className={cn("h-6 w-6", payoutMethod === 'mobile_money' ? "text-primary" : "text-slate-500")} />
                                    <div className="text-left">
                                        <p className="text-sm font-black text-white uppercase">Mobile Money</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase">Orange / MTN / Wave</p>
                                    </div>
                                </div>
                                <RadioGroupItem value="mobile_money" className="sr-only" />
                                {payoutMethod === 'mobile_money' && <CheckCircle2 className="h-5 w-5 text-primary" />}
                            </label>

                            <label className={cn(
                                "flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer active:scale-95",
                                payoutMethod === 'bank_transfer' ? "border-primary bg-primary/5 shadow-lg" : "border-slate-800 bg-slate-900/50"
                            )}>
                                <div className="flex items-center gap-4">
                                    <CreditCard className={cn("h-6 w-6", payoutMethod === 'bank_transfer' ? "text-primary" : "text-slate-500")} />
                                    <div className="text-left">
                                        <p className="text-sm font-black text-white uppercase">Virement Bancaire</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase">Standard International</p>
                                    </div>
                                </div>
                                <RadioGroupItem value="bank_transfer" className="sr-only" />
                                {payoutMethod === 'bank_transfer' && <CheckCircle2 className="h-5 w-5 text-primary" />}
                            </label>
                        </RadioGroup>

                        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                            <p className="text-[9px] font-bold text-amber-200/80 leading-relaxed uppercase">
                                Vérifiez que vos coordonnées sont à jour dans vos réglages avant de valider.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-slate-950/50 border-t border-white/5">
                        <Button 
                            onClick={handleRequestWithdrawal}
                            disabled={isSubmitting}
                            className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all"
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmer la demande"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function PayoutRequestItem({ req }: { req: PayoutRequest }) {
    const date = (req.createdAt as any)?.toDate?.() || new Date();
    
    const config = {
        pending: { label: 'En attente', class: 'bg-amber-500/10 text-amber-500', icon: Clock },
        approved: { label: 'Validé', class: 'bg-blue-500/10 text-blue-400', icon: CheckCircle2 },
        paid: { label: 'Payé', class: 'bg-emerald-500/10 text-emerald-500', icon: CheckCircle2 },
        rejected: { label: 'Rejeté', class: 'bg-red-500/10 text-red-500', icon: XCircle },
    }[req.status] || { label: req.status, class: 'bg-slate-800', icon: Clock };

    const Icon = config.icon;

    return (
        <Card className="bg-slate-900 border-slate-800 rounded-2xl overflow-hidden active:scale-[0.98] transition-all shadow-lg">
            <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", config.class)}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-bold text-white text-sm uppercase tracking-tight">Retrait {req.method === 'mobile_money' ? 'Momo' : 'Banque'}</p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase mt-0.5">
                            {format(date, "d MMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-white">-{req.amount.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-600">XOF</span></p>
                    <Badge className={cn("text-[8px] font-black uppercase border-none px-2 h-4", config.class)}>
                        {config.label}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}

function RevenueSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <Skeleton className="h-12 w-1/2 bg-slate-900" />
            <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" />
            <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-32 bg-slate-900 rounded-[2rem]" />
                <Skeleton className="h-32 bg-slate-900 rounded-[2rem]" />
            </div>
        </div>
    );
}
