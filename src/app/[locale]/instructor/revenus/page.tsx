'use client';

/**
 * @fileOverview Dashboard Financier de l'Instructeur V2 (Design Qwen Fintech Elite).
 * ✅ CALCULS : Revenus Formations, Revenus Parrainage, Solde Disponible.
 * ✅ DESIGN : Carte bancaire virtuelle Elite avec scintillement et Historique épuré.
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
    ShoppingBag,
    Download,
    Wifi,
    Check
} from 'lucide-react';
import { requestPayoutAction } from '@/actions/payoutActions';
import { useToast } from '@/hooks/use-toast';
import type { Payment, PayoutRequest } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [loadingStates, setLoadingStates] = useState({
        payments: true,
        payouts: true
    });

    useEffect(() => {
        if (!instructor?.uid) return;

        const instructorId = instructor.uid;

        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('instructorId', '==', instructorId), where('status', '==', 'Completed')),
            (snap) => {
                setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
                setLoadingStates(prev => ({ ...prev, payments: false }));
            }
        );

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
        const totalCoursesEarned = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
        const affiliateAvailable = instructor?.affiliateBalance || 0;
        const totalWithdrawn = payoutRequests
            .filter(p => p.status !== 'rejected')
            .reduce((acc, p) => acc + (p.amount || 0), 0);
        
        const availableBalance = (totalCoursesEarned + affiliateAvailable) - totalWithdrawn;

        return {
            totalCoursesEarned,
            availableBalance: Math.max(0, availableBalance)
        };
    }, [payments, payoutRequests, instructor]);

    const handleRequestWithdrawal = async () => {
        if (!instructor) return;
        const amountNum = parseFloat(withdrawAmount);
        
        if (isNaN(amountNum) || amountNum < 5000) {
            toast({ variant: 'destructive', title: "Montant invalide", description: "Le retrait minimum est de 5 000 XOF." });
            return;
        }
        
        if (amountNum > stats.availableBalance) {
            toast({ variant: 'destructive', title: "Solde insuffisant", description: "Le montant dépasse votre solde disponible." });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await requestPayoutAction({
                instructorId: instructor.uid,
                amount: amountNum,
                method: payoutMethod
            });

            if (result.success) {
                toast({ title: "Demande envoyée !", description: "Votre retrait sera traité sous 48h." });
                setIsDialogOpen(false);
                setWithdrawAmount('');
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
        <div className="flex flex-col gap-8 pb-32 bg-ndara-bg min-h-screen relative overflow-hidden bg-grainy">
            <div className="grain-overlay opacity-[0.04]" />

            <header className="fixed top-0 w-full max-w-md z-50 bg-ndara-bg/95 backdrop-blur-md safe-area-pt border-b border-white/5">
                <div className="px-6 py-6 flex items-center justify-between">
                    <h1 className="font-black text-2xl text-white tracking-wide uppercase">Trésorerie</h1>
                    <button className="w-10 h-10 rounded-full bg-ndara-surface flex items-center justify-center text-gray-400 hover:text-white transition active:scale-95 shadow-xl border border-white/5" onClick={() => toast({ title: "Génération du relevé..." })}>
                        <Download size={18} />
                    </button>
                </div>
            </header>

            <main className="flex-1 px-6 pt-32 space-y-8 animate-in fade-in duration-700">
                
                {/* --- ELITE VIRTUAL CARD --- */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="font-black text-white text-[10px] uppercase tracking-[0.3em]">Mon Portefeuille</h2>
                        <span className="text-ndara-emerald text-[10px] font-black uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-ndara-emerald rounded-full animate-pulse" /> Actif
                        </span>
                    </div>

                    <div className="virtual-card rounded-[2.5rem] p-8 shadow-2xl relative z-10 active:scale-[0.98] transition-all cursor-pointer group" onClick={() => setIsDialogOpen(true)}>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.25em] mb-1">Solde Disponible</p>
                                    <h2 className="text-white font-black text-4xl tracking-tight drop-shadow-md">
                                        {stats.availableBalance.toLocaleString('fr-FR')} <span className="text-lg font-bold">FCFA</span>
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-1">Ndara Elite</p>
                                    <Wifi className="text-white/70 h-8 w-8 mt-2 rotate-90 drop-shadow-md" />
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-emerald-200 text-[9px] font-bold uppercase mb-1 tracking-wider">Titulaire</p>
                                    <p className="text-white font-black text-sm uppercase tracking-widest drop-shadow-md">{instructor?.fullName}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CreditCard className="text-white h-8 w-8 opacity-90 drop-shadow-md" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button onClick={() => setIsDialogOpen(true)} className="w-full h-16 rounded-[2.5rem] bg-ndara-emerald hover:bg-emerald-400 text-ndara-bg font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all animate-pulse-glow border-none">
                        <Landmark className="mr-2 h-5 w-5" />
                        Demander un Virement
                    </Button>
                </div>

                {/* --- TRANSACTION HISTORY --- */}
                <div className="bg-ndara-surface border border-white/5 rounded-[2.5rem] p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-white text-[10px] uppercase tracking-[0.3em]">Historique des flux</h3>
                        <Button variant="ghost" className="text-ndara-emerald text-[10px] font-black uppercase h-8 px-3 rounded-xl hover:bg-emerald-500/5 transition">VOIR TOUT</Button>
                    </div>
                    
                    <div className="space-y-4">
                        {historyItems.length > 0 ? historyItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all active:scale-[0.98] group">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-inner transition-all group-hover:scale-110",
                                        item.amount > 0 ? "bg-ndara-emerald/10 text-ndara-emerald" : "bg-red-500/10 text-red-400"
                                    )}>
                                        {item.type === 'sale' ? <ShoppingCart size={20} /> : <ArrowUpRight size={20} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-white text-sm truncate uppercase tracking-tight">{item.title}</p>
                                        <p className="text-gray-500 text-[10px] font-bold uppercase mt-0.5">{format(item.date, 'dd MMM yyyy • HH:mm', { locale: fr })}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={cn(
                                        "font-black text-sm mb-1",
                                        item.amount > 0 ? "text-ndara-emerald" : "text-white"
                                    )}>
                                        {item.amount > 0 ? `+${item.amount.toLocaleString()}` : item.amount.toLocaleString()} F
                                    </p>
                                    <Badge className={cn(
                                        "text-[8px] font-black uppercase border-none px-2 py-0.5 h-4 rounded-full",
                                        item.status === 'Completed' || item.status === 'paid' ? "badge-success" :
                                        item.status === 'pending' || item.status === 'approved' ? "badge-audit" :
                                        "badge-rejected"
                                    )}>
                                        {item.status === 'Completed' || item.status === 'paid' ? 'Succès' : item.status === 'pending' ? 'Audit' : item.status === 'approved' ? 'Prêt' : 'Rejeté'}
                                    </Badge>
                                </div>
                            </div>
                        )) : (
                            <div className="py-12 text-center opacity-20">
                                <History size={40} className="mx-auto mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aucun mouvement</p>
                            </div>
                        )}
                    </div>
                </div>

            </main>

            {/* --- WITHDRAWAL MODAL (BOTTOM SHEET STYLE) --- */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-ndara-surface border-t border-white/5 rounded-t-[2.5rem] p-0 overflow-hidden sm:max-w-md fixed bottom-0 top-auto translate-y-0 sm:relative sm:rounded-[2.5rem] animate-in slide-in-from-bottom duration-300">
                    <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
                    <DialogHeader className="p-8 pb-4">
                        <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Demander un Virement</DialogTitle>
                        <DialogDescription className="text-gray-400 font-medium italic">Solde disponible : <span className="text-ndara-emerald font-bold">{stats.availableBalance.toLocaleString('fr-FR')} FCFA</span></DialogDescription>
                    </DialogHeader>
                    
                    <div className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Montant à retirer (XOF)</label>
                                <Input 
                                    type="number" 
                                    placeholder="Ex: 500000" 
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="h-14 bg-ndara-bg border-white/10 rounded-2xl text-white font-black text-xl px-6 focus-visible:border-ndara-emerald transition shadow-inner" 
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Méthode de versement</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button 
                                        onClick={() => setPayoutMethod('mobile_money')}
                                        className={cn(
                                            "rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95 border-2",
                                            payoutMethod === 'mobile_money' ? "bg-orange-500/10 border-ndara-orange text-orange-400" : "bg-ndara-bg border-white/5 text-slate-500 opacity-50 grayscale"
                                        )}
                                    >
                                        <Smartphone size={24} />
                                        <span className="text-[9px] font-black uppercase">Momo</span>
                                    </button>
                                    <button 
                                        onClick={() => setPayoutMethod('bank_transfer')}
                                        className={cn(
                                            "rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95 border-2",
                                            payoutMethod === 'bank_transfer' ? "bg-blue-500/10 border-blue-500 text-blue-400" : "bg-ndara-bg border-white/5 text-slate-500 opacity-50 grayscale"
                                        )}
                                    >
                                        <Landmark size={24} />
                                        <span className="text-[9px] font-black uppercase">Virement</span>
                                    </button>
                                    <div className="rounded-2xl p-4 flex flex-col items-center gap-2 bg-ndara-bg border border-white/5 text-slate-700 opacity-20 cursor-not-allowed">
                                        <CreditCard size={24} />
                                        <span className="text-[9px] font-black uppercase">Crypto</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-ndara-bg/50 border-t border-white/5 safe-area-pb flex gap-3">
                        <DialogClose asChild>
                            <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold text-slate-500 uppercase text-[10px] tracking-widest">Annuler</Button>
                        </DialogClose>
                        <Button 
                            onClick={handleRequestWithdrawal}
                            disabled={isSubmitting || !withdrawAmount || parseFloat(withdrawAmount) < 5000}
                            className="flex-1 h-14 rounded-2xl bg-ndara-emerald hover:bg-emerald-400 text-ndara-bg font-black uppercase text-[10px] tracking-widest shadow-xl transition-all"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Check size={16} className="mr-2" />}
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function RevenueSkeleton() {
    return (
        <div className="p-6 space-y-8 pt-32">
            <Skeleton className="h-10 w-1/2 bg-slate-900" />
            <Skeleton className="h-56 w-full rounded-[2.5rem] bg-slate-900" />
            <div className="space-y-4">
                <Skeleton className="h-24 w-full rounded-[2.5rem] bg-slate-900" />
                <Skeleton className="h-24 w-full rounded-[2.5rem] bg-slate-900" />
            </div>
        </div>
    );
}
