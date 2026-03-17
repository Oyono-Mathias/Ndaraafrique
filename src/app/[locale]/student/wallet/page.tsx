'use client';

/**
 * @fileOverview Ndara Wallet - Espace de Gestion Financière.
 * ✅ DESIGN : Esthétique Fintech Neo-Banque.
 * ✅ ACTIONS : Rechargement via MoMo (MeSomb) implémenté.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Wallet, 
    ArrowUpRight, 
    History, 
    Smartphone, 
    CheckCircle2, 
    Plus, 
    ArrowLeft,
    TrendingUp,
    CreditCard,
    BadgeEuro,
    Landmark,
    ShieldCheck,
    Loader2,
    Check,
    Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Payment } from '@/lib/types';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function NdaraWalletPage() {
    const { currentUser, isUserLoading, user } = useRole();
    const db = getFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const [transactions, setTransactions] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [rechargePhone, setRechargePhone] = useState('');
    const [rechargeMethod, setRechargeMethod] = useState<'ORANGE' | 'MTN'>('ORANGE');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const q = query(
            collection(db, 'payments'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc'),
            limit(20)
        );

        const unsub = onSnapshot(q, (snap) => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
            setIsLoading(false);
        }, (err) => {
            console.error("Wallet history error:", err);
            setIsLoading(false);
        });

        return () => unsub();
    }, [currentUser?.uid, db]);

    const handleRecharge = async () => {
        if (!user) return;
        const amountNum = parseFloat(rechargeAmount);
        if (isNaN(amountNum) || amountNum < 100) {
            toast({ variant: 'destructive', title: "Montant invalide", description: "Minimum 100 XOF." });
            return;
        }
        if (!rechargePhone || rechargePhone.length < 8) {
            toast({ variant: 'destructive', title: "Numéro requis" });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await initiateMeSombPayment({
                amount: amountNum,
                phoneNumber: rechargePhone,
                service: rechargeMethod,
                courseId: 'WALLET_RECHARGE',
                userId: user.uid,
                type: 'wallet_topup' as any // Force metadata type
            });

            if (result.success) {
                toast({ title: "Demande envoyée !", description: result.message || "Validez sur votre téléphone." });
                setIsRechargeModalOpen(false);
                setRechargeAmount('');
            } else {
                throw new Error(result.error);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Échec recharge", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isUserLoading) return <WalletSkeleton />;

    return (
        <div className="flex flex-col gap-8 pb-32 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
            <div className="grain-overlay opacity-[0.04]" />

            <header className="fixed top-0 w-full z-50 bg-slate-950/95 backdrop-blur-md safe-area-pt border-b border-white/5">
                <div className="px-6 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 active:scale-90 transition">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="font-black text-xl text-white uppercase tracking-tight">Mon Wallet</h1>
                    </div>
                    <BadgeEuro className="text-primary h-6 w-6" />
                </div>
            </header>

            <main className="flex-1 px-6 pt-32 space-y-8 animate-in fade-in duration-700">
                
                {/* --- ELITE NEO-CARD --- */}
                <div className="bg-gradient-to-br from-primary via-[#047857] to-[#065f46] rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-primary/20 group">
                    <div className="absolute -right-6 -top-6 h-40 w-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000" />
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.25em] mb-1">Solde Disponible</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-5xl font-black text-white leading-none">{(currentUser?.balance || 0).toLocaleString('fr-FR')}</h2>
                                    <span className="text-sm font-bold text-white/70 uppercase">XOF</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                                <Wallet size={24} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-200 text-[9px] font-bold uppercase mb-1 tracking-wider">Membre Ndara</p>
                                <p className="text-white text-sm font-black uppercase tracking-widest">{currentUser?.fullName?.split(' ')[0]}</p>
                            </div>
                            <div className="flex items-center gap-3 text-white/80">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Button 
                        onClick={() => setIsRechargeModalOpen(true)} 
                        className="h-16 rounded-[2rem] bg-white text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all border-none"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Recharger
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => router.push('/student/ambassadeur')} 
                        className="h-16 rounded-[2rem] border-white/5 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                    >
                        <TrendingUp className="mr-2 h-4 w-4 text-primary" /> Affiliation
                    </Button>
                </div>

                {/* --- HISTORY --- */}
                <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-white text-[10px] uppercase tracking-widest flex items-center gap-2">
                            <History size={14} className="text-primary" />
                            Flux financiers
                        </h3>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">30 JOURS</span>
                    </div>

                    <div className="space-y-4">
                        {isLoading ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-800" />)
                        ) : transactions.length > 0 ? transactions.map(txn => {
                            const date = (txn.date as any)?.toDate?.() || new Date();
                            const isIncoming = txn.metadata?.type === 'wallet_topup' || txn.metadata?.type === 'commission' || txn.instructorId === currentUser?.uid;
                            
                            return (
                                <div key={txn.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-inner",
                                            isIncoming ? "bg-emerald-500/10 text-primary" : "bg-blue-500/10 text-blue-400"
                                        )}>
                                            {isIncoming ? <ArrowUpRight size={20} /> : <CreditCard size={20} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-white text-sm truncate uppercase tracking-tight group-hover:text-primary transition-colors">
                                                {txn.courseTitle || 'Transaction'}
                                            </p>
                                            <p className="text-slate-600 text-[9px] font-black uppercase tracking-tighter mt-0.5">
                                                {format(date, 'dd MMM à HH:mm', { locale: fr })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={cn(
                                            "font-black text-sm",
                                            isIncoming ? "text-primary" : "text-white"
                                        )}>
                                            {isIncoming ? '+' : '-'}{txn.amount.toLocaleString()} F
                                        </p>
                                        <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">{txn.provider}</p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-12 text-center opacity-20">
                                <Landmark size={40} className="mx-auto mb-3 text-slate-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aucun mouvement</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- SECURITY BANNER --- */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] p-6 flex items-start gap-4">
                    <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
                    <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight mb-1">Fonds Sécurisés</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">"Vos avoirs Ndara sont protégés par notre infrastructure bancaire certifiée et audités en temps réel."</p>
                    </div>
                </div>

            </main>

            {/* --- RECHARGE DIALOG --- */}
            <Dialog open={isRechargeModalOpen} onOpenChange={setIsRechargeModalOpen}>
                <DialogContent className="bg-slate-900 border-white/5 rounded-[2.5rem] p-0 overflow-hidden sm:max-w-md fixed bottom-0 top-auto translate-y-0 sm:relative">
                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Recharge Wallet</DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium italic">Créditez votre compte instantanément.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="p-8 space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Opérateur</label>
                            <div className="grid grid-cols-2 gap-3">
                                <ProviderBtn active={rechargeMethod === 'ORANGE'} onClick={() => setRechargeMethod('ORANGE')} label="Orange" color="bg-orange-500" />
                                <ProviderBtn active={rechargeMethod === 'MTN'} onClick={() => setRechargeMethod('MTN')} label="MTN" color="bg-yellow-500" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Numéro de téléphone</label>
                            <div className="relative">
                                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
                                <Input 
                                    type="tel" 
                                    placeholder="+236..." 
                                    value={rechargePhone}
                                    onChange={(e) => setRechargePhone(e.target.value)}
                                    className="h-14 pl-12 bg-slate-950 border-white/5 rounded-2xl text-white font-mono text-lg" 
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Montant à créditer (XOF)</label>
                            <Input 
                                type="number" 
                                placeholder="1000" 
                                value={rechargeAmount}
                                onChange={(e) => setRechargeAmount(e.target.value)}
                                className="h-16 bg-slate-950 border-white/5 rounded-2xl text-white font-black text-3xl px-6 text-center" 
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-slate-950/50 border-t border-white/5 gap-3">
                        <DialogClose asChild>
                            <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold text-slate-500 uppercase text-[10px] tracking-widest">Annuler</Button>
                        </DialogClose>
                        <Button 
                            onClick={handleRecharge}
                            disabled={isSubmitting || !rechargePhone || !rechargeAmount}
                            className="flex-1 h-14 rounded-2xl bg-primary hover:bg-emerald-400 text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl transition-all"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Lock size={16} className="mr-2" />}
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ProviderBtn({ active, onClick, label, color }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex items-center justify-center p-4 rounded-2xl border-2 transition-all active:scale-95 gap-3",
                active ? "border-primary bg-primary/5" : "border-transparent bg-slate-950 grayscale opacity-50"
            )}
        >
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[10px]", color)}>
                {label.charAt(0)}
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{label}</span>
        </button>
    );
}

function WalletSkeleton() {
    return (
        <div className="p-6 space-y-8 pt-32 bg-slate-950 min-h-screen">
            <Skeleton className="h-56 w-full rounded-[2.5rem] bg-slate-900" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-16 rounded-[2rem] bg-slate-900" />
                <Skeleton className="h-16 rounded-[2rem] bg-slate-900" />
            </div>
            <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" />
        </div>
    );
}