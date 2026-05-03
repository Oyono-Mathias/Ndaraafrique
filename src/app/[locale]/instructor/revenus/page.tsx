'use client';

/**
 * @fileOverview Dashboard Financier de l'Expert v3.0 - Design Qwen Fintech Elite.
 * ✅ ANALYTICS : Ventilation Gains de Vente vs Gains Parrainage.
 * ✅ SÉCURITÉ : Suivi du séquestre (Fonds en attente d'audit).
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
    ShoppingCart,
    Download,
    Wifi,
    Check,
    AlertCircle,
    BadgeEuro,
    ShieldCheck
} from 'lucide-react';
import { requestPayoutAction } from '@/actions/payoutActions';
import { useToast } from '@/hooks/use-toast';
import type { Payment, PayoutRequest, NdaraUser, AffiliateTransaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { safeToDate } from '@/lib/date-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';

export default function InstructorRevenuePage() {
    const { currentUser: instructor, isUserLoading } = useRole();
    const db = getFirestore();
    const { toast } = useToast();
    const tActions = useTranslations('Actions');

    const [payments, setPayments] = useState<Payment[]>([]);
    const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
    const [affiliateTxns, setAffiliateTxns] = useState<AffiliateTransaction[]>([]);
    
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawMethod, setWithdrawMethod] = useState<'orange' | 'mtn' | 'wave'>('orange');
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [phoneValue, setPhoneValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!instructor?.uid) return;
        const instructorId = instructor.uid;

        // 1. Ventes directes
        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('instructorId', '==', instructorId), where('status', '==', 'completed')),
            (snap) => {
                setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
            }
        );

        // 2. Retraits
        const unsubPayouts = onSnapshot(
            query(collection(db, 'payout_requests'), where('instructorId', '==', instructorId), orderBy('createdAt', 'desc'), limit(20)),
            (snap) => {
                setPayoutRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest)));
            }
        );

        // 3. Commissions d'affiliation
        const unsubAff = onSnapshot(
            query(collection(db, 'affiliate_transactions'), where('affiliateId', '==', instructorId), orderBy('createdAt', 'desc'), limit(20)),
            (snap) => {
                setAffiliateTxns(snap.docs.map(d => ({ id: d.id, ...d.data() } as AffiliateTransaction)));
                setIsLoading(false);
            }
        );

        return () => { unsubPayments(); unsubPayouts(); unsubAff(); };
    }, [instructor?.uid, db]);

    const stats = useMemo(() => {
        const salesRevenue = payments.reduce((acc, p) => acc + (p.amount * 0.7), 0); // Part expert
        const affiliateRevenue = instructor?.affiliateBalance || 0;
        const pendingAffiliate = instructor?.pendingAffiliateBalance || 0;
        const totalPayouts = payoutRequests.filter(p => p.status !== 'rejected').reduce((acc, p) => acc + (p.amount || 0), 0);
        
        const availableBalance = (salesRevenue + affiliateRevenue) - totalPayouts;
        
        return { 
            salesRevenue, 
            affiliateRevenue, 
            pendingAffiliate,
            availableBalance: Math.max(0, availableBalance) 
        };
    }, [payments, payoutRequests, instructor]);

    const handleRequestWithdrawal = async () => {
        if (!instructor) return;
        const amountNum = parseFloat(withdrawAmount);
        
        if (isNaN(amountNum) || amountNum < 5000) {
            toast({ variant: 'destructive', title: tActions('error.payout_min_amount') });
            return;
        }
        
        if (amountNum > stats.availableBalance) {
            toast({ variant: 'destructive', title: tActions('error.insufficient_balance') });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await requestPayoutAction({
                instructorId: instructor.uid,
                amount: amountNum,
                method: 'mobile_money',
                requesterId: instructor.uid
            });

            if (result.success) {
                toast({ title: tActions('success.payout_requested') });
                setIsWithdrawModalOpen(false);
                setWithdrawAmount('');
            } else {
                toast({ variant: 'destructive', title: tActions('error.generic'), description: result.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: tActions('error.generic') });
        } finally {
            setIsSubmitting(false);
        }
    };

    const historyItems = useMemo(() => {
        const p = payments.map(item => ({ 
            id: item.id, type: 'sale', title: `Vente: ${item.courseTitle || 'Formation'}`, 
            amount: item.amount * 0.7, date: safeToDate(item.date), status: 'completed' 
        }));
        const pr = payoutRequests.map(item => ({ 
            id: item.id, type: 'payout', title: `Retrait Mobile Money`, 
            amount: -item.amount, date: safeToDate(item.createdAt), status: item.status 
        }));
        const af = affiliateTxns.map(item => ({
            id: item.id, type: 'commission', title: `Commission Parrainage: ${item.buyerName}`,
            amount: item.commissionAmount, date: safeToDate(item.createdAt), status: item.status
        }));

        return [...p, ...pr, ...af].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [payments, payoutRequests, affiliateTxns]);

    if (isUserLoading || isLoading) return <RevenueSkeleton />;

    return (
        <div className="flex flex-col gap-8 pb-32 bg-[#0f172a] min-h-screen relative overflow-hidden bg-grainy">
            <div className="grain-overlay opacity-[0.04]" />

            <header className="fixed top-0 w-full z-50 bg-[#0f172a]/95 backdrop-blur-md safe-area-pt border-b border-white/5">
                <div className="px-6 py-6 flex items-center justify-between">
                    <h1 className="font-black text-2xl text-white tracking-wide uppercase">Ma Trésorerie</h1>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-2 py-0.5">EXPERT ÉLITE</Badge>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-6 pt-32 space-y-8 animate-in fade-in duration-700">
                
                {/* --- TOTAL WALLET --- */}
                <div className="virtual-card rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10 space-y-8">
                        <div>
                            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.25em] mb-1">Total à décaisser</p>
                            <h2 className="text-white font-black text-5xl tracking-tighter">
                                {stats.availableBalance.toLocaleString('fr-FR')} <span className="text-lg opacity-60">XOF</span>
                            </h2>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10">
                                    <Smartphone size={20} />
                                </div>
                                <span className="text-[9px] font-bold text-emerald-100 uppercase tracking-widest">Compte GSM lié</span>
                            </div>
                            <Wifi className="text-white/40 h-6 w-6 rotate-90" />
                        </div>
                    </div>
                </div>

                {/* --- VENTILATION --- */}
                <section className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-white/5 rounded-[2rem] p-5 space-y-3 shadow-xl">
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest leading-none">Ventes de Cours</p>
                        <p className="text-xl font-black text-white">{stats.salesRevenue.toLocaleString()} F</p>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-2/3" />
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-white/5 rounded-[2rem] p-5 space-y-3 shadow-xl">
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest leading-none">Parrainages</p>
                        <p className="text-xl font-black text-blue-400">{stats.affiliateRevenue.toLocaleString()} F</p>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-1/3" />
                        </div>
                    </div>
                </section>

                {/* --- SÉQUESTRE / ANTI-FRAUDE --- */}
                {stats.pendingAffiliate > 0 && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-5 flex items-center justify-between shadow-inner">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                <Clock size={24} className="animate-pulse" />
                            </div>
                            <div>
                                <p className="text-white text-[11px] font-black uppercase tracking-widest">En Sécurisation</p>
                                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Libération sous 14 jours</p>
                            </div>
                        </div>
                        <p className="text-lg font-black text-amber-500">{stats.pendingAffiliate.toLocaleString()} F</p>
                    </div>
                )}

                <Button onClick={() => setIsWithdrawModalOpen(true)} className="w-full h-16 rounded-[2.5rem] bg-[#10b981] hover:bg-[#34d399] text-[#0f172a] font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-95 animate-pulse-glow border-none">
                    <Landmark className="mr-2 h-5 w-5" />
                    Lancer le Décaissement
                </Button>

                {/* --- HISTORIQUE --- */}
                <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-8 px-1">
                        <h3 className="font-black text-white text-[10px] uppercase tracking-[0.3em]">Journal des Revenus</h3>
                        <History size={14} className="text-slate-600" />
                    </div>
                    
                    <div className="space-y-4">
                        {historyItems.length > 0 ? historyItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-4 rounded-3xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                                        item.amount > 0 ? "bg-emerald-500/10 text-primary" : "bg-red-500/10 text-red-400"
                                    )}>
                                        {item.type === 'sale' ? <ShoppingCart size={20} /> : item.type === 'payout' ? <ArrowUpRight size={20} /> : <BadgeEuro size={20} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-white text-[13px] truncate uppercase tracking-tight">{item.title}</p>
                                        <p className="text-gray-500 text-[9px] font-black uppercase mt-1 tracking-widest">{format(item.date, 'dd MMM yyyy', { locale: fr })}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={cn("font-black text-sm mb-1", item.amount > 0 ? "text-emerald-400" : "text-white")}>
                                        {item.amount > 0 ? `+${item.amount.toLocaleString()}` : item.amount.toLocaleString()} F
                                    </p>
                                    <Badge className={cn(
                                        "text-[7px] font-black uppercase border-none px-2 py-0.5 rounded-full h-4",
                                        item.status === 'completed' || item.status === 'paid' || item.status === 'approved' ? "bg-emerald-500/10 text-emerald-500" :
                                        item.status === 'pending' ? "bg-amber-500/10 text-amber-400 animate-pulse" : 
                                        "bg-red-500/10 text-red-500"
                                    )}>
                                        {item.status === 'completed' || item.status === 'paid' ? 'Succès' : item.status === 'pending' ? 'Séquestre' : item.status === 'approved' ? 'Audit OK' : 'Rejeté'}
                                    </Badge>
                                </div>
                            </div>
                        )) : (
                            <div className="py-12 text-center opacity-20 border-2 border-dashed border-slate-800 rounded-3xl">
                                <AlertCircle size={40} className="mx-auto mb-3 text-slate-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aucun flux détecté</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* --- WITHDRAW MODAL (COPIE DE LA LOGIQUE DÉJÀ PRÉSENTE DANS LES FICHIERS PRÉCÉDENTS) --- */}
            <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
                <DialogContent className="bg-slate-900 border-white/5 rounded-t-[2.5rem] p-0 overflow-hidden sm:max-w-md fixed bottom-0 top-auto translate-y-0 sm:relative sm:rounded-[2.5rem]">
                    <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
                    <DialogHeader className="p-8 pb-4">
                        <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Virement Mobile Money</DialogTitle>
                        <DialogDescription className="text-gray-400 font-medium italic">Recevez vos gains sur votre compte personnel.</DialogDescription>
                    </DialogHeader>
                    <div className="p-8 space-y-6">
                        <div className="bg-slate-950 rounded-3xl p-5 border border-white/5 text-center shadow-inner">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Montant transférable</p>
                            <p className="text-3xl font-black text-primary">{stats.availableBalance.toLocaleString('fr-FR')} FCFA</p>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Opérateur local</label>
                            <div className="grid grid-cols-3 gap-2">
                                <ProviderBtn active={withdrawMethod === 'orange'} onClick={() => setWithdrawMethod('orange')} label="Orange" color="bg-orange-500" />
                                <ProviderBtn active={withdrawMethod === 'mtn'} onClick={() => setWithdrawMethod('mtn')} label="MTN" color="bg-yellow-500" />
                                <ProviderBtn active={withdrawMethod === 'wave'} onClick={() => setWithdrawMethod('wave')} label="Wave" color="bg-blue-500" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Numéro de téléphone</label>
                            <Input type="tel" placeholder="+237 ..." value={phoneValue} onChange={(e) => setPhoneValue(e.target.value)} className="h-14 bg-slate-950 border-white/5 rounded-2xl text-white font-mono text-lg px-6" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Montant du retrait</label>
                            <Input type="number" placeholder="5000" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="h-14 bg-slate-950 border-white/5 rounded-2xl text-white font-black text-xl px-6" />
                        </div>
                    </div>
                    <DialogFooter className="p-8 bg-slate-950/50 border-t border-white/5 flex gap-3">
                        <DialogClose asChild><Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold text-slate-500 uppercase text-[10px] tracking-widest">Annuler</Button></DialogClose>
                        <Button onClick={handleRequestWithdrawal} disabled={isSubmitting || !phoneValue || !withdrawAmount || stats.availableBalance < 5000} className="flex-1 h-14 rounded-2xl bg-primary hover:bg-emerald-400 text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl transition-all">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Check size={16} className="mr-2" />} Signer le Virement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ProviderBtn({ active, onClick, label, color }: any) {
    return (
        <button onClick={onClick} className={cn("flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all active:scale-95 gap-1", active ? "border-primary bg-primary/5" : "border-transparent bg-slate-950 grayscale opacity-50")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[10px]", color)}>{label.charAt(0)}</div>
            <span className="text-[8px] font-black text-white uppercase">{label}</span>
        </button>
    );
}

function RevenueSkeleton() {
    return (
        <div className="p-6 space-y-8 pt-32 bg-[#0f172a] min-h-screen">
            <Skeleton className="h-10 w-1/2 bg-slate-900 rounded-xl" />
            <Skeleton className="h-56 w-full rounded-[2.5rem] bg-slate-900" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-28 w-full rounded-[2rem] bg-slate-900" />
                <Skeleton className="h-28 w-full rounded-[2rem] bg-slate-900" />
            </div>
            <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" />
        </div>
    );
}
