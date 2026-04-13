'use client';

/**
 * @fileOverview Ndara Wallet Étudiant - V6.5 Elite Fintech.
 * ✅ TRANSPARENCE : Affichage séparé du Solde Réel et des Crédits de Simulation.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, doc, getDocs } from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { 
    Wifi, 
    Loader2, 
    Smartphone, 
    Receipt, 
    CreditCard, 
    Check,
    SmartphoneNfc,
    Globe,
    Zap,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, Country } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OperatorLogo } from '@/components/ui/OperatorLogo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const PRESET_AMOUNTS = [2500, 5000, 10000, 25000];

export default function NdaraWalletPage() {
    const { user, currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const { toast } = useToast();
    const t = useTranslations('Wallet');
    
    const [liveData, setLiveData] = useState({ balance: 0, virtualBalance: 0 });
    const [transactions, setTransactions] = useState<Payment[]>([]);
    const [selectedAmount, setSelectedAmount] = useState<number>(5000);
    const [customAmount, setCustomAmount] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAwaitingUssd, setIsAwaitingUssd] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [countryData, setCountryData] = useState<Country | null>(null);
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    const [isLoadingCountry, setIsLoadingCountry] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setLiveData({
                    balance: data.balance || 0,
                    virtualBalance: data.virtualBalance || 0
                });
            }
        });
        return () => unsub();
    }, [user?.uid, db]);

    useEffect(() => {
        if (!user?.uid || !currentUser?.countryCode) return;

        const fetchCountry = async () => {
            setIsLoadingCountry(true);
            try {
                const q = query(collection(db, 'countries'), where('code', '==', currentUser.countryCode), where('active', '==', true), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as Country;
                    setCountryData(data);
                    if (data.paymentMethods.length > 0) setSelectedMethodId(data.paymentMethods[0].id);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoadingCountry(false);
            }
        };
        fetchCountry();
    }, [currentUser?.countryCode, db, user?.uid]);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, 'payments'), where('userId', '==', user.uid), orderBy('date', 'desc'), limit(10));
        const unsub = onSnapshot(q, (snap) => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        });
        return () => unsub();
    }, [user?.uid, db]);

    const activeMethod = useMemo(() => countryData?.paymentMethods.find(m => m.id === selectedMethodId), [countryData, selectedMethodId]);

    const handleRecharge = async () => {
        if (!user || selectedAmount < 100 || !activeMethod) return;
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length < 8) {
            toast({ variant: 'destructive', title: "Numéro invalide" });
            return;
        }
        
        setIsProcessing(true);
        try {
            const result = await initiateMeSombPayment({
                amount: selectedAmount,
                phoneNumber: cleanPhone,
                service: activeMethod.name.toUpperCase().includes('MTN') ? 'MTN' : activeMethod.name.toUpperCase().includes('WAVE') ? 'WAVE' : 'ORANGE',
                userId: user.uid,
                type: 'wallet_topup'
            });

            if (result.success) {
                if (result.type === 'SIMULATED') setIsSuccess(true);
                else setIsAwaitingUssd(true);
            } else {
                throw new Error(String(result.error));
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Échec", description: String(e.message) });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isUserLoading || isLoadingCountry) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="flex justify-center bg-slate-950 min-h-screen font-sans relative">
            <div className="grain-overlay opacity-[0.03]"></div>

            <div className="w-full max-w-md bg-slate-950 relative flex flex-col pb-32">
                <header className="fixed top-0 w-full max-w-md z-40 bg-slate-950/90 backdrop-blur-md safe-area-pt border-b border-white/5">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <h1 className="font-black text-xl text-white tracking-wide uppercase">Ndara Wallet</h1>
                        <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase px-2">{countryData?.flagEmoji} {countryData?.name}</Badge>
                    </div>
                </header>

                <main className="flex-1 pt-24 px-6 space-y-8 animate-in fade-in duration-700">
                    
                    {/* --- REAL BALANCE CARD --- */}
                    <div className="virtual-card rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.25em] mb-1">Solde de Production</p>
                            <h2 className="text-white font-black text-4xl tracking-tight">
                                {liveData.balance.toLocaleString('fr-FR')} <span className="text-lg font-bold opacity-60">XOF</span>
                            </h2>
                            <div className="flex items-center justify-between mt-8">
                                <p className="text-white font-black text-sm uppercase tracking-widest">{currentUser?.fullName}</p>
                                <Wifi className="text-white/50 h-6 w-6 rotate-90" />
                            </div>
                        </div>
                    </div>

                    {/* --- SIMULATED / PROMO BALANCE --- */}
                    {liveData.virtualBalance > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 flex items-center justify-between shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
                                    <Zap size={20} className="fill-current" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Crédits de Simulation</p>
                                    <p className="text-lg font-black text-white">{liveData.virtualBalance.toLocaleString()} <span className="text-[10px] opacity-40">FCFA</span></p>
                                </div>
                            </div>
                            <Badge className="bg-amber-500 text-slate-950 border-none font-black text-[8px] uppercase px-2">DEMO</Badge>
                        </div>
                    )}

                    <section className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Recharger le solde réel</label>
                        <div className="grid grid-cols-2 gap-3">
                            {PRESET_AMOUNTS.map(val => (
                                <button 
                                    key={val}
                                    onClick={() => { setSelectedAmount(val); setCustomAmount(''); }}
                                    className={cn(
                                        "py-4 rounded-[1.5rem] border-2 font-black text-sm transition-all active:scale-95",
                                        selectedAmount === val && !customAmount ? "bg-primary text-slate-950 border-primary shadow-xl" : "bg-slate-900 border-white/5 text-slate-400"
                                    )}
                                >
                                    {val.toLocaleString()} F
                                </button>
                            ))}
                        </div>
                        <Input 
                            type="number" 
                            placeholder="Saisir montant personnalisé..."
                            className="h-16 bg-slate-900 border-white/5 rounded-[1.5rem] text-white font-black text-xl text-center focus-visible:ring-primary/30"
                            value={customAmount}
                            onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(Number(e.target.value) || 0); }}
                        />
                    </section>

                    <section className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Méthode de paiement</label>
                        <div className="grid grid-cols-3 gap-3">
                            {countryData?.paymentMethods.filter(m => m.active).map(method => (
                                <button 
                                    key={method.id}
                                    onClick={() => setSelectedMethodId(method.id)}
                                    className={cn(
                                        "bg-slate-900 rounded-3xl p-4 border-2 flex flex-col items-center gap-2 transition-all active:scale-95",
                                        selectedMethodId === method.id ? "border-primary bg-primary/5" : "border-white/5"
                                    )}
                                >
                                    <OperatorLogo operatorName={method.provider} size={32} />
                                    <span className="text-white text-[9px] font-black uppercase text-center truncate w-full">{method.name}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Numéro Mobile Money ({countryData?.prefix})</label>
                        <div className="relative">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary"><SmartphoneNfc size={20} /></div>
                            <input 
                                type="tel"
                                placeholder="6xx xxx xxx"
                                className="w-full h-16 pl-14 rounded-3xl bg-slate-900 border-white/5 font-mono text-lg text-white focus:border-primary outline-none transition-all"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                            />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="font-black text-white text-xs uppercase tracking-widest flex items-center gap-2 px-1">
                            <History size={14} className="text-slate-600" />
                            Dernières opérations
                        </h2>
                        <div className="space-y-3">
                            {transactions.map(txn => (
                                <div key={txn.id} className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <OperatorLogo operatorName={txn.provider} size={32} />
                                        <div>
                                            <p className="font-bold text-white text-xs uppercase truncate max-w-[120px]">{txn.courseTitle || 'Recharge'}</p>
                                            <p className="text-slate-600 text-[9px] font-bold uppercase mt-0.5">{format((txn.date as any)?.toDate?.() || new Date(), 'dd MMM • HH:mm', { locale: fr })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn("font-black text-sm", txn.amount > 0 ? "text-emerald-500" : "text-red-500")}>
                                            {txn.amount.toLocaleString()} F
                                        </p>
                                        <Badge className={cn("text-[7px] font-black uppercase px-1.5 py-0 border-none h-4", txn.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500")}>{txn.status}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>

                <div className="fixed bottom-0 w-full max-w-md bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pt-10 pb-8 px-6 z-40 safe-area-pb">
                    <Button 
                        onClick={handleRecharge}
                        disabled={isProcessing || !phoneNumber || !activeMethod}
                        className="w-full h-16 bg-primary hover:bg-emerald-400 text-slate-950 rounded-[2.5rem] font-black text-sm uppercase flex items-center justify-center gap-3 shadow-2xl active:scale-95 animate-pulse-glow border-none"
                    >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                        <span>Lancer la Recharge</span>
                    </Button>
                </div>
            </div>

            <Dialog open={isAwaitingUssd} onOpenChange={setIsAwaitingUssd}>
                <DialogContent className="bg-slate-900 border-white/10 rounded-[3rem] p-10 text-center sm:max-w-md">
                    <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Loader2 className="h-12 w-12 animate-spin" />
                            </div>
                            <Smartphone className="absolute -bottom-2 -right-2 h-8 w-8 text-primary bg-slate-950 rounded-full p-1.5 border border-white/10 shadow-lg" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Validation USSD</DialogTitle>
                        <p className="text-slate-400 font-medium italic text-sm">
                            Veuillez valider le débit de <b>{selectedAmount.toLocaleString()} XOF</b> sur votre téléphone.
                        </p>
                        <Button variant="ghost" onClick={() => setIsAwaitingUssd(false)} className="w-full text-slate-500 font-black uppercase text-[10px] tracking-widest mt-4">Annuler</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isSuccess} onOpenChange={setIsSuccess}>
                <DialogContent className="bg-slate-900 border-white/10 rounded-[3rem] p-10 text-center sm:max-w-md">
                    <div className="flex flex-col items-center gap-8 animate-in zoom-in duration-700">
                        <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-2xl animate-bounce shadow-primary/40">
                            <Check className="h-14 w-14 text-slate-950" strokeWidth={4} />
                        </div>
                        <DialogTitle className="text-3xl font-black text-white uppercase tracking-tight">C'est fait !</DialogTitle>
                        <p className="text-slate-400 font-medium italic">Votre portefeuille a été crédité avec succès.</p>
                        <Button onClick={() => setIsSuccess(false)} className="w-full h-16 rounded-[2rem] bg-white text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl">Continuer</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function SmartphoneNfc(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="12" x="2" y="6" rx="1" />
      <path d="M13 8.32a7.43 7.43 0 0 1 0 7.36" />
      <path d="M16.46 6.21a11.76 11.76 0 0 1 0 11.58" />
      <path d="M19.91 4.1a15.91 15.91 0 0 1 .01 15.8" />
    </svg>
  )
}
