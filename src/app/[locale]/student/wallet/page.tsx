'use client';

/**
 * @fileOverview Ndara Wallet Étudiant - V6.9 Elite Fintech.
 * ✅ LOGOS : Utilisation dynamique des logos par pays et métadonnées.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, limit, onSnapshot, doc, getDocs } from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { 
    Wifi, 
    Loader2, 
    Smartphone, 
    Check,
    SmartphoneNfc,
    Zap,
    History,
    AlertCircle,
    CreditCard,
    ArrowRight
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const PRESET_AMOUNTS = [2500, 5000, 10000, 25000];

export default function NdaraWalletPage() {
    const { user, currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const { toast } = useToast();
    
    const [liveData, setLiveData] = useState({ balance: 0, virtualBalance: 0 });
    const [rawTransactions, setRawTransactions] = useState<Payment[]>([]);
    const [selectedAmount, setSelectedAmount] = useState<number>(5000);
    const [customAmount, setCustomAmount] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAwaitingUssd, setIsAwaitingUssd] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [countryData, setCountryData] = useState<Country | null>(null);
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    const [isLoadingCountry, setIsLoadingCountry] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // 1. Écouteur de solde live
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

    // 2. Chargement configuration pays
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
                    if (data.paymentMethods.length > 0) {
                        const firstActive = data.paymentMethods.find(m => m.active);
                        if (firstActive) setSelectedMethodId(firstActive.id);
                    }
                }
            } catch (e) {
                console.error("Config fetch error:", e);
            } finally {
                setIsLoadingCountry(false);
            }
        };
        fetchCountry();
    }, [currentUser?.countryCode, db, user?.uid]);

    // 3. Écouteur historique des transactions (SÉCURISÉ)
    useEffect(() => {
        if (!user?.uid) return;
        setIsLoadingHistory(true);
        const q = query(collection(db, 'payments'), where('userId', '==', user.uid), limit(50));
        
        const unsub = onSnapshot(q, (snap) => {
            const txns = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
            setRawTransactions(txns);
            setIsLoadingHistory(false);
        }, (err) => {
            console.error("History loading error:", err);
            setIsLoadingHistory(false);
        });
        return () => unsub();
    }, [user?.uid, db]);

    // 4. Tri en mémoire
    const sortedTransactions = useMemo(() => {
        return [...rawTransactions].sort((a, b) => {
            const dateA = (a.date as any)?.toDate?.() || new Date(a.date as any || 0);
            const dateB = (b.date as any)?.toDate?.() || new Date(b.date as any || 0);
            return dateB.getTime() - dateA.getTime();
        });
    }, [rawTransactions]);

    const activeMethod = useMemo(() => countryData?.paymentMethods.find(m => m.id === selectedMethodId), [countryData, selectedMethodId]);

    const handleRecharge = async () => {
        if (!user || selectedAmount < 100 || !activeMethod || !countryData) return;
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
                country: countryData.code,
                currency: countryData.currency,
                type: 'wallet_topup',
                courseTitle: 'Recharge Portefeuille'
            });

            if (result.success) {
                if (result.type === 'SIMULATED') {
                    setIsSuccess(true);
                } else {
                    setIsAwaitingUssd(true);
                }
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

    const currencySymbol = countryData?.currency || 'XOF';

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
                    
                    <div className="virtual-card rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.25em] mb-1">Solde de Production</p>
                            <h2 className="text-white font-black text-4xl tracking-tight">
                                {liveData.balance.toLocaleString('fr-FR')} <span className="text-lg font-bold opacity-60">{currencySymbol}</span>
                            </h2>
                            <div className="flex items-center justify-between mt-8">
                                <p className="text-white font-black text-sm uppercase tracking-widest">{currentUser?.fullName}</p>
                                <Wifi className="text-white/50 h-6 w-6 rotate-90" />
                            </div>
                        </div>
                    </div>

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
                            className="h-16 bg-slate-900 border-white/5 rounded-[1.5rem] text-white font-black text-xl text-center"
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
                                    <OperatorLogo logo={method.logo} operatorName={method.provider} size={32} />
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
                                className="w-full h-16 pl-14 rounded-3xl bg-slate-900 border-white/5 font-mono text-lg text-white outline-none"
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
                            {isLoadingHistory ? (
                                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-slate-900" />)
                            ) : sortedTransactions.length > 0 ? (
                                sortedTransactions.map(txn => {
                                    const status = (txn.status || 'pending').toLowerCase();
                                    // ✅ Intelligence : Utilise l'opérateur des métadonnées si présent
                                    const opName = txn.metadata?.operator || txn.provider;
                                    return (
                                        <div key={txn.id} className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 flex items-center justify-between group active:scale-[0.98] transition-all">
                                            <div className="flex items-center gap-4">
                                                <OperatorLogo operatorName={opName} size={42} className="bg-slate-950 p-1" />
                                                <div>
                                                    <p className="font-bold text-white text-xs uppercase truncate max-w-[120px]">{txn.courseTitle || 'Recharge'}</p>
                                                    <p className="text-slate-600 text-[9px] font-bold uppercase mt-0.5">{format((txn.date as any)?.toDate?.() || new Date(txn.date as any || 0), 'dd MMM • HH:mm', { locale: fr })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn("font-black text-sm", status === 'completed' ? "text-emerald-500" : status === 'failed' ? "text-red-500" : "text-amber-500")}>
                                                    {txn.amount.toLocaleString()} F
                                                </p>
                                                <Badge className={cn(
                                                    "text-[7px] font-black uppercase px-1.5 py-0 border-none h-4", 
                                                    status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : 
                                                    status === 'failed' ? "bg-red-500/10 text-red-500" : 
                                                    "bg-amber-500/10 text-amber-500"
                                                )}>{status === 'completed' ? 'Réussi' : status === 'failed' ? 'Échec' : 'Audit'}</Badge>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-12 text-center opacity-20 border-2 border-dashed border-slate-800 rounded-3xl">
                                    <AlertCircle size={32} className="mx-auto mb-2 text-slate-600" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aucune opération</p>
                                </div>
                            )}
                        </div>
                    </section>
                </main>

                <div className="fixed bottom-0 w-full max-w-md bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-10 pb-8 px-6 z-40 safe-area-pb">
                    <Button 
                        onClick={handleRecharge}
                        disabled={isProcessing || !phoneNumber || !activeMethod}
                        className="w-full h-16 bg-primary hover:bg-emerald-400 text-slate-950 rounded-[2.5rem] font-black text-sm uppercase flex items-center justify-center gap-3 shadow-2xl active:scale-90 animate-pulse-glow border-none"
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
                        </div>
                        <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Paiement en cours</DialogTitle>
                        <p className="text-slate-300 font-medium italic text-sm">
                            Veuillez valider le débit de <b>{selectedAmount.toLocaleString()} {currencySymbol}</b> via le prompt USSD sur votre téléphone.
                        </p>
                        <Button variant="ghost" onClick={() => setIsAwaitingUssd(false)} className="w-full text-slate-500 font-black uppercase text-[10px] tracking-widest mt-4">Fermer</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
