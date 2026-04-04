'use client';

/**
 * @fileOverview Ndara Wallet Étudiant - V5.5 Redesign.
 * ✅ RÉSOLU : Suppression de l'UI corrompue via utilisation de Modals (Dialog).
 * ✅ SÉCURITÉ : Validation stricte des retours MeSomb et gestion du mode test.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { 
    HelpCircle, 
    Wifi, 
    Loader2, 
    Smartphone, 
    Receipt, 
    ArrowDownLeft, 
    CreditCard, 
    XCircle,
    Check,
    AlertCircle,
    SmartphoneNfc,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OperatorLogo } from '@/components/ui/OperatorLogo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const PRESET_AMOUNTS = [2500, 5000, 10000, 25000];

export default function NdaraWalletPage() {
    const { user, currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const { toast } = useToast();
    const t = useTranslations('Wallet');
    
    const [liveBalance, setLiveBalance] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<Payment[]>([]);
    const [selectedAmount, setSelectedAmount] = useState<number>(5000);
    const [customAmount, setCustomAmount] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<'orange' | 'mtn' | 'wave'>('orange');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAwaitingUssd, setIsAwaitingUssd] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (snap.exists()) setLiveBalance(snap.data().balance || 0);
        });
        return () => unsub();
    }, [user?.uid, db]);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, 'payments'),
            where('userId', '==', user.uid),
            orderBy('date', 'desc'),
            limit(10)
        );
        const unsub = onSnapshot(q, (snap) => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        });
        return () => unsub();
    }, [user?.uid, db]);

    const handleRecharge = async () => {
        if (!user || selectedAmount < 100) {
            toast({ variant: 'destructive', title: "Montant insuffisant" });
            return;
        }

        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length < 8) {
            toast({ variant: 'destructive', title: "Numéro invalide" });
            return;
        }
        
        setIsProcessing(true);
        setIsAwaitingUssd(false);

        try {
            const finalService = selectedMethod.toUpperCase() as 'MTN' | 'ORANGE';
            const result = await initiateMeSombPayment({
                amount: selectedAmount,
                phoneNumber: cleanPhone,
                service: finalService,
                courseId: 'WALLET_TOPUP',
                userId: user.uid,
                type: 'wallet_topup'
            });

            if (result.success) {
                if (result.type === 'SIMULATED') {
                    setIsSuccess(true);
                } else {
                    setIsAwaitingUssd(true);
                    toast({ title: "Action requise !", description: String(result.message) });
                }
                setCustomAmount('');
            } else {
                throw new Error(String(result.error));
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erreur transaction", description: String(e.message) });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isUserLoading) return <div className="h-screen bg-[#F5F5F5] flex items-center justify-center"><Loader2 className="animate-spin text-[#3F51B5]" /></div>;

    return (
        <div className="antialiased flex justify-center bg-black min-h-screen font-sans">
            <div className="grain-overlay"></div>

            <style jsx>{`
                .neo-card {
                    background: linear-gradient(135deg, #3F51B5 0%, #5C6BC0 50%, #7986CB 100%);
                    position: relative;
                    overflow: hidden;
                }
                .holo-chip {
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
                    position: relative;
                    overflow: hidden;
                }
                .vintage-receipt {
                    background: #FFFFFF;
                    border: 2px dashed #BDBDBD;
                    position: relative;
                    font-family: 'JetBrains Mono', monospace;
                }
                .grain-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100%; height: 100%;
                    pointer-events: none; z-index: 9999; opacity: 0.03;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                }
            `}</style>

            <div className="w-full max-w-md min-h-screen bg-[#F5F5F5] relative flex flex-col shadow-2xl overflow-hidden">
                <header className="fixed top-0 w-full max-w-md z-40 bg-[#F5F5F5]/95 backdrop-blur-md safe-top border-b border-gray-200">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <h1 className="font-black text-xl text-[#212121] tracking-wide uppercase">{t('title')}</h1>
                        <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#757575] hover:bg-gray-100 transition shadow-sm active:scale-90">
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto hide-scrollbar pt-24 pb-48 px-6 relative">
                    <div className="neo-card rounded-4xl p-6 mb-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-500 active:scale-95 transition-all">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">{t('available_balance')}</p>
                                    <h2 className="text-white font-black text-4xl tracking-tight">
                                        {(liveBalance ?? 0).toLocaleString('fr-FR')} <span className="text-lg font-bold">FCFA</span>
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider mb-2">Ndara Wallet</p>
                                    <div className="holo-chip w-12 h-9 rounded-lg shadow-inner"></div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-4">
                                <div>
                                    <p className="text-white/70 text-[9px] font-bold uppercase mb-1">Titulaire</p>
                                    <p className="text-white font-bold text-sm tracking-wide uppercase">{currentUser?.fullName || '---'}</p>
                                </div>
                                <Wifi className="text-white/70 text-xl rotate-90" />
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <label className="block text-[#757575] text-[10px] font-black uppercase mb-3 ml-1 tracking-widest">Recharger mon compte</label>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {PRESET_AMOUNTS.map(val => (
                                <button 
                                    key={val}
                                    onClick={() => { setSelectedAmount(val); setCustomAmount(''); }}
                                    className={cn(
                                        "border-2 rounded-3xl py-4 font-black text-sm transition-all active:scale-95",
                                        selectedAmount === val && !customAmount ? "bg-[#3F51B5] text-white border-[#3F51B5] shadow-lg shadow-indigo-200" : "bg-white border-gray-200 text-[#212121] hover:border-indigo-200"
                                    )}
                                >
                                    {val.toLocaleString()} XOF
                                </button>
                            ))}
                        </div>
                        <Input 
                            type="number" 
                            placeholder="Autre montant"
                            className="w-full h-16 bg-white border-2 border-gray-200 rounded-4xl px-6 text-[#212121] font-black text-lg focus:outline-none focus:border-[#3F51B5] shadow-sm transition-all"
                            value={customAmount}
                            onChange={(e) => {
                                setCustomAmount(e.target.value);
                                setSelectedAmount(Number(e.target.value) || 0);
                            }}
                        />
                    </div>

                    <div className="mb-8">
                        <label className="block text-[#757575] text-[10px] font-black uppercase mb-3 ml-1 tracking-widest">Opérateur</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button onClick={() => setSelectedMethod('orange')} className={cn("bg-white rounded-3xl p-4 border-2 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-sm", selectedMethod === 'orange' ? "border-[#3F51B5] bg-blue-50/20" : "border-gray-200")}>
                                <OperatorLogo operatorName="orange" size={32} />
                                <span className="text-[#212121] text-[9px] font-black uppercase">Orange</span>
                            </button>
                            <button onClick={() => setSelectedMethod('mtn')} className={cn("bg-white rounded-3xl p-4 border-2 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-sm", selectedMethod === 'mtn' ? "border-[#3F51B5] bg-blue-50/20" : "border-gray-200")}>
                                <OperatorLogo operatorName="mtn" size={32} />
                                <span className="text-[#212121] text-[9px] font-black uppercase">MTN</span>
                            </button>
                            <button onClick={() => setSelectedMethod('wave')} className={cn("bg-white rounded-3xl p-4 border-2 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-sm", selectedMethod === 'wave' ? "border-[#3F51B5] bg-blue-50/20" : "border-gray-200")}>
                                <OperatorLogo operatorName="wave" size={32} />
                                <span className="text-[#212121] text-[9px] font-black uppercase">Wave</span>
                            </button>
                        </div>
                    </div>

                    <div className="mb-12">
                        <label className="block text-[#757575] text-[10px] font-black uppercase mb-3 ml-1 tracking-widest">Numéro Mobile Money</label>
                        <div className="relative">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#3F51B5]"><SmartphoneNfc className="w-5 h-5" /></div>
                            <input 
                                type="tel"
                                placeholder="6xx xxx xxx"
                                className="w-full h-16 pl-14 rounded-4xl bg-white border-2 border-gray-200 font-mono text-lg text-[#212121] focus:outline-none focus:border-[#3F51B5] shadow-sm transition-all"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className="font-black text-[#212121] text-sm uppercase tracking-widest flex items-center gap-2 mb-6">
                            <Receipt className="w-4 h-4 text-[#3F51B5]" />
                            {t('history')}
                        </h2>
                        <div className="space-y-4">
                            {transactions.map(txn => {
                                const date = (txn.date as any)?.toDate?.() || new Date();
                                const isIncome = txn.amount > 0;
                                return (
                                    <div key={txn.id} className="vintage-receipt rounded-3xl p-5 shadow-sm flex items-center justify-between border-gray-300">
                                        <div className="flex items-center gap-4">
                                            <OperatorLogo operatorName={txn.provider} size={40} />
                                            <div className="min-w-0">
                                                <p className="font-black text-[#212121] text-[11px] uppercase truncate max-w-[140px] leading-tight">{txn.courseTitle || 'Recharge Wallet'}</p>
                                                <p className="text-[#757575] text-[10px] font-mono mt-1 font-bold">{format(date, 'dd MMM • HH:mm', { locale: fr })}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("font-mono font-black text-[15px]", isIncome ? "text-emerald-600" : "text-red-500")}>
                                                {isIncome ? '+' : ''}{txn.amount.toLocaleString()} F
                                            </p>
                                            <span className={cn(
                                                "text-[8px] font-black uppercase px-1.5 py-0.5 rounded ml-auto w-fit block mt-1",
                                                txn.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                            )}>{txn.status}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {transactions.length === 0 && <p className="text-center py-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Aucune transaction enregistrée</p>}
                        </div>
                    </div>
                </main>

                <div className="fixed bottom-0 w-full max-w-md bg-gradient-to-t from-[#F5F5F5] via-[#F5F5F5] to-transparent pt-8 pb-8 px-6 z-40">
                    <Button 
                        onClick={handleRecharge}
                        disabled={isProcessing || selectedAmount <= 0 || !phoneNumber}
                        className="w-full h-16 bg-[#3F51B5] hover:bg-[#303F9F] text-white rounded-4xl font-black text-sm uppercase flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 animate-pulse-glow border-none"
                    >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                        <span>{t('action_button')}</span>
                    </Button>
                </div>
            </div>

            {/* --- MODAL ATTENTE USSD --- */}
            <Dialog open={isAwaitingUssd} onOpenChange={setIsAwaitingUssd}>
                <DialogContent className="sm:max-w-md bg-white border-none rounded-[2.5rem] p-10 text-center">
                    <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                <Loader2 className="h-12 w-12 animate-spin" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg border border-amber-100">
                                <Smartphone className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">Confirmation Mobile</DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium leading-relaxed italic text-sm">
                                Veuillez saisir votre code PIN secret sur votre téléphone pour valider le dépôt de <b>{selectedAmount.toLocaleString()} F</b>.
                            </DialogDescription>
                        </div>
                        <div className="w-full py-4 border-t border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temps d'attente estimé : 30s</p>
                        </div>
                        <Button variant="ghost" onClick={() => setIsAwaitingUssd(false)} className="w-full h-12 rounded-2xl text-red-500 font-bold uppercase text-[10px] tracking-widest">
                            Annuler l'attente
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* --- MODAL SUCCÈS --- */}
            <Dialog open={isSuccess} onOpenChange={setIsSuccess}>
                <DialogContent className="sm:max-w-md bg-white border-none rounded-[3rem] p-10 text-center">
                    <div className="flex flex-col items-center gap-8 animate-in zoom-in duration-700">
                        <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-bounce">
                            <Check className="h-14 w-14 text-white" strokeWidth={4} />
                        </div>
                        <div className="space-y-3">
                            <DialogTitle className="text-3xl font-black text-slate-900 uppercase tracking-tight">Injection Réussie</DialogTitle>
                            <p className="text-slate-500 font-medium text-base">
                                Votre portefeuille Ndara a été crédité de <span className="text-emerald-600 font-black">{selectedAmount.toLocaleString()} XOF</span>.
                            </p>
                        </div>
                        <Button onClick={() => setIsSuccess(false)} className="w-full h-16 rounded-[2rem] bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-slate-200 transition-all active:scale-95">
                            Terminer
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
