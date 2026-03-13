'use client';

/**
 * @fileOverview Dashboard Financier de l'Instructeur V2 (Design Qwen Fintech).
 * ✅ CALCULS : Revenus Formations, Revenus Parrainage, Solde Disponible.
 * ✅ DESIGN : Carte bancaire virtuelle Elite et Historique épuré.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Wallet, 
    ArrowUpRight, 
    History, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Landmark,
    Smartphone,
    CreditCard,
    Loader2,
    ArrowDown,
    ShoppingCart,
    Download
} from 'lucide-react';
import { requestPayoutAction } from '@/actions/payoutActions';
import { useToast } from '@/hooks/use-toast';
import type { Payment, PayoutRequest } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';

export default function InstructorRevenuePage() {
    const { currentUser: instructor, isUserLoading } = useRole();
    const db = getFirestore();
    const { toast } = useToast();

    const [payments, setPayments] = useState<Payment[]>([]);
    const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [payoutMethod, setPayoutMethod] = useState<'mobile_money' | 'bank_transfer'>('mobile_money');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [loadingStates, setLoadingStates] = useState({
        payments: true,
        payouts: true
    });

    useEffect(() => {
        if (!instructor?.uid) return;

        const instructorId = instructor.uid;

        // 1. Écouter les paiements (Ventes directes)
        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('instructorId', '==', instructorId), where('status', '==', 'Completed')),
            (snap) => {
                setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
                setLoadingStates(prev => ({ ...prev, payments: false }));
            }
        );

        // 2. Écouter les demandes de retrait (Payouts)
        const unsubPayouts = onSnapshot(
            query(collection(db, 'payout_requests'), where('instructorId', '==', instructorId), orderBy('createdAt', 'desc'), limit(50)),
            (snap) => {
                setPayoutRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest)));
                setLoadingStates(prev => ({ ...prev, payouts: false }));
            }
        );

        return () => {
            unsubPayments();
            unsubPayouts();
        };
    }, [instructor?.uid, db]);

    const stats = useMemo(() => {
        // Revenus des formations
        const totalCoursesEarned = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
        
        // Revenus d'affiliation (si applicable)
        const affiliateAvailable = instructor?.affiliateBalance || 0;
        
        // Total déjà retiré ou en cours
        const totalWithdrawn = payoutRequests
            .filter(p => p.status !== 'rejected')
            .reduce((acc, p) => acc + (p.amount || 0), 0);
        
        // Solde final disponible
        const availableBalance = (totalCoursesEarned + affiliateAvailable) - totalWithdrawn;

        return {
            totalCoursesEarned,
            availableBalance: Math.max(0, availableBalance)
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
                setIsDialogOpen(false);
            } else {
                toast({ variant: 'destructive', title: "Erreur", description: result.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erreur technique" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const historyItems = useMemo(() => {
        const p = payments.map(item => ({ 
            id: item.id, 
            type: 'sale', 
            title: `Vente: ${item.courseTitle || 'Formation'}`, 
            amount: item.amount, 
            date: (item.date as any)?.toDate() || new Date(),
            status: 'Completed' 
        }));
        const pr = payoutRequests.map(item => ({ 
            id: item.id, 
            type: 'payout', 
            title: `Virement ${item.method === 'mobile_money' ? 'Momo' : 'Bancaire'}`, 
            amount: -item.amount, 
            date: (item.createdAt as any)?.toDate() || new Date(),
            status: item.status 
        }));
        return [...p, ...pr].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [payments, payoutRequests]);

    const isLoadingData = loadingStates.payments || loadingStates.payouts;

    if (isUserLoading || isLoadingData) return <RevenueSkeleton />;

    return (
        <div className="flex flex-col gap-8 pb-32 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
            <div className="grain-overlay opacity-[0.04]" />

            <header className="px-6 pt-8">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="font-black text-2xl text-white tracking-wide uppercase">Trésorerie</h1>
                    <button className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white transition active:scale-95 shadow-xl border border-white/5">
                        <Download size={18} />
                    </button>
                </div>
                <p className="text-slate-500 text-xs font-medium italic">Gérez vos revenus et demandes de versement.</p>
            </header>

            <main className="px-6 space-y-8 animate-in fade-in duration-700">
                
                {/* --- ELITE VIRTUAL CARD --- */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="font-black text-white text-[10px] uppercase tracking-[0.3em]">Mon Portefeuille</h2>
                        <span className="text-[#10b981] text-[10px] font-black uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse" /> Actif
                        </span>
                    </div>

                    <div className="virtual-card rounded-[2.5rem] p-8 shadow-2xl relative z-10 active:scale-[0.98] transition-all cursor-pointer group" onClick={() => setIsDialogOpen(true)}>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.25em] mb-1">Solde Retirable</p>
                                    <h2 className="text-white font-black text-4xl tracking-tight">
                                        {stats.availableBalance.toLocaleString('fr-FR')} <span className="text-lg opacity-60">FCFA</span>
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest">Ndara Elite</p>
                                    <Landmark className="text-white/40 h-8 w-8 mt-2" />
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-emerald-200 text-[9px] font-bold uppercase mb-1">Titulaire</p>
                                    <p className="text-white font-black text-sm uppercase tracking-widest">{instructor?.fullName}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-6 bg-white/10 rounded border border-white/20 backdrop-blur-sm" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button onClick={() => setIsDialogOpen(true)} className="w-full h-16 rounded-[2.5rem] bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl shadow-[#10b981]/20 active:scale-95 transition-all">
                        <Landmark className="mr-2 h-5 w-5" />
                        Demander un Virement
                    </Button>
                </div>

                {/* --- TRANSACTION HISTORY --- */}
                <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-white text-[10px] uppercase tracking-[0.3em]">Historique des flux</h3>
                        <Button variant="ghost" className="text-[#10b981] text-[10px] font-black uppercase h-8 px-3 rounded-xl hover:bg-[#10b981]/5">VOIR TOUT</Button>
                    </div>
                    
                    <div className="space-y-4">
                        {historyItems.length > 0 ? historyItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all active:scale-[0.98]">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                                        item.type === 'sale' ? "bg-[#10b981]/10 text-[#10b981]" : "bg-amber-500/10 text-amber-500"
                                    )}>
                                        {item.type === 'sale' ? <ShoppingCart size={18} /> : <ArrowUpRight size={18} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-white text-xs truncate uppercase tracking-tight">{item.title}</p>
                                        <p className="text-slate-600 text-[9px] font-bold uppercase mt-0.5">{format(item.date, 'dd MMM yyyy • HH:mm', { locale: fr })}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={cn(
                                        "font-black text-sm mb-1",
                                        item.amount > 0 ? "text-[#10b981]" : "text-white"
                                    )}>
                                        {item.amount > 0 ? `+${item.amount.toLocaleString()}` : item.amount.toLocaleString()} F
                                    </p>
                                    <Badge className={cn(
                                        "text-[8px] font-black uppercase border-none px-2 py-0 h-4",
                                        item.status === 'Completed' || item.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                                        item.status === 'pending' || item.status === 'approved' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                                        "bg-red-500/10 text-red-500 border border-red-500/20"
                                    )}>
                                        {item.status === 'Completed' || item.status === 'paid' ? 'Succès' : item.status === 'pending' ? 'Audit' : item.status === 'approved' ? 'Prêt' : 'Rejeté'}
                                    </Badge>
                                </div>
                            </div>
                        )) : (
                            <div className="py-12 text-center opacity-20">
                                <History size={40} className="mx-auto mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Aucun mouvement</p>
                            </div>
                        )}
                    </div>
                </div>

            </main>

            {/* --- WITHDRAWAL MODAL --- */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-slate-900 border-white/5 rounded-t-[2.5rem] p-0 overflow-hidden sm:max-w-md fixed bottom-0 top-auto translate-y-0 sm:relative sm:rounded-[2.5rem]">
                    <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
                    <DialogHeader className="p-8 pb-4">
                        <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Virement de fonds</DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium italic">Recevez vos gains instantanément.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="p-8 space-y-6">
                        <div className="bg-slate-950 rounded-3xl p-6 border border-white/5 text-center shadow-inner">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Montant transférable</p>
                            <p className="text-3xl font-black text-[#10b981]">{stats.availableBalance.toLocaleString('fr-FR')} FCFA</p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Méthode de versement</label>
                            <RadioGroup value={payoutMethod} onValueChange={(v: any) => setPayoutMethod(v)} className="grid grid-cols-1 gap-3">
                                <label className={cn(
                                    "flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer",
                                    payoutMethod === 'mobile_money' ? "border-[#10b981] bg-[#10b981]/5" : "border-slate-800 bg-slate-950/50"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <Smartphone className={cn("h-6 w-6", payoutMethod === 'mobile_money' ? "text-[#10b981]" : "text-slate-500")} />
                                        <div className="text-left"><p className="text-sm font-black text-white uppercase tracking-tight">Mobile Money</p><p className="text-[9px] text-slate-500 font-bold uppercase">Auto & Sécurisé</p></div>
                                    </div>
                                    <RadioGroupItem value="mobile_money" className="sr-only" />
                                    {payoutMethod === 'mobile_money' && <CheckCircle2 className="h-5 w-5 text-[#10b981]" />}
                                </label>
                                <label className={cn(
                                    "flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer opacity-50",
                                    payoutMethod === 'bank_transfer' ? "border-[#10b981] bg-[#10b981]/5" : "border-slate-800 bg-slate-950/50"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <CreditCard className={cn("h-6 w-6", payoutMethod === 'bank_transfer' ? "text-[#10b981]" : "text-slate-500")} />
                                        <div className="text-left"><p className="text-sm font-black text-white uppercase tracking-tight">Virement</p><p className="text-[9px] text-slate-500 font-bold uppercase">Standard Bancaire</p></div>
                                    </div>
                                    <RadioGroupItem value="bank_transfer" className="sr-only" />
                                </label>
                            </RadioGroup>
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-slate-950/50 border-t border-white/5 safe-area-pb">
                        <Button 
                            onClick={handleRequestWithdrawal}
                            disabled={isSubmitting || stats.availableBalance < 5000}
                            className="w-full h-16 rounded-[2rem] bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-black uppercase text-sm tracking-widest shadow-xl shadow-[#10b981]/20 transition-all active:scale-95"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-5 w-5"/> : "Confirmer le retrait"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function RevenueSkeleton() {
    return (
        <div className="p-6 space-y-8 pt-12">
            <Skeleton className="h-10 w-1/2 bg-slate-900" />
            <Skeleton className="h-56 w-full rounded-[2.5rem] bg-slate-900" />
            <div className="space-y-4">
                <Skeleton className="h-20 w-full rounded-2xl bg-slate-900" />
                <Skeleton className="h-20 w-full rounded-2xl bg-slate-900" />
            </div>
        </div>
    );
}
