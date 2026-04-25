'use client';

/**
 * @fileOverview Ndara Wallet Étudiant - V8.0 Elite Fintech.
 * ✅ SÉCURITÉ : Restriction stricte aux numéros de téléphone certifiés.
 * ✅ UX : Écoute en temps réel de Firestore pour validation automatique.
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
    ArrowRight,
    X,
    ShieldCheck,
    PhoneCall,
    RefreshCw,
    XCircle,
    ShieldAlert,
    ExternalLink
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const PRESET_AMOUNTS = [2500, 5000, 10000, 25000];

export default function NdaraWalletPage() {
    const { user, currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const { toast } = useToast();
    
    const [liveData, setLiveData] = useState({ balance: 0, virtualBalance: 0 });
    const [rawTransactions, setRawTransactions] = useState<Payment[]>([]);
    const [selectedAmount, setSelectedAmount] = useState<number>(5000);
    const [customAmount, setCustomAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAwaitingUssd, setIsAwaitingUssd] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string; title: string }>({
        isOpen: false,
        message: '',
        title: 'Échec du paiement'
    });

    const [countryData, setCountryData] = useState<Country | null>(null);
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    const [isLoadingCountry, setIsLoadingCountry] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

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

    useEffect(() => {
        if (!user?.uid) return;
        setIsLoadingHistory(true);
        const q = query(collection(db, 'payments'), where('userId', '==', user.uid), limit(50));
        
        const unsub = onSnapshot(q, (snap) => {
            const txns = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
            setRawTransactions(txns);
            setIsLoadingHistory(false);
        }, (err) => {
            setIsLoadingHistory(false);
        });
        return () => unsub();
    }, [user?.uid, db]);

    const sortedTransactions = useMemo(() => {
        return [...rawTransactions].sort((a, b) => {
            const dateA = (a.date as any)?.toDate?.() || new Date(a.date as any || 0);
            const dateB = (b.date as any)?.toDate?.() || new Date(b.date as any || 0);
            return dateB.getTime() - dateA.getTime();
        });
    }, [rawTransactions]);

    const activeMethod = useMemo(() => countryData?.paymentMethods.find(m => m.id === selectedMethodId), [countryData, selectedMethodId]);

    // 🛡️ REQUISITION DU NUMÉRO CERTIFIÉ
    const certifiedNumber = useMemo(() => {
        if (!currentUser || !currentUser.countryCode) return null;
        return currentUser.certifiedMobileNumbers?.[currentUser.countryCode] || null;
    }, [currentUser]);

    const ussdInstruction = useMemo(() => {
        if (!activeMethod) return "Veuillez valider le paiement sur votre téléphone";
        const op = activeMethod.name.toUpperCase();
        if (op.includes('MTN')) return "Composez *126# puis validez le paiement sur votre téléphone";
        if (op.includes('ORANGE')) return "Composez #150*50# puis validez le paiement";
        return "Veuillez valider le paiement sur votre téléphone";
    }, [activeMethod]);

    const handleRecharge = async () => {
        if (!user || selectedAmount < 100 || !activeMethod || !countryData || !certifiedNumber) {
            if (!certifiedNumber) toast({ variant: 'destructive', title: "Certification requise", description: "Veuillez enregistrer votre numéro Mobile Money dans votre profil." });
            return;
        }
        
        setIsAwaitingUssd(true);
        setIsProcessing(true);

        try {
            const result = await initiateMeSombPayment({
                amount: selectedAmount,
                phoneNumber: certifiedNumber,
                service: activeMethod.name.toUpperCase().includes('MTN') ? 'MTN' : activeMethod.name.toUpperCase().includes('WAVE') ? 'WAVE' : 'ORANGE',
                userId: user.uid,
                country: countryData.code,
                currency: countryData.currency,
                type: 'wallet_topup',
                courseTitle: 'Recharge Portefeuille'
            });

            if (result.success) {
                if (result.type === 'SIMULATED') {
                    setIsAwaitingUssd(false);
                    setIsSuccess(true);
                } else if (result.type === 'REAL' && result.transactionId) {
                    const paymentRef = doc(db, 'payments', result.transactionId);
                    const unsubscribe = onSnapshot(paymentRef, (snap) => {
                        if (snap.exists()) {
                            const data = snap.data();
                            if (data.status === 'completed') {
                                setIsAwaitingUssd(false);
                                setIsSuccess(true);
                                unsubscribe();
                            } else if (data.status === 'failed') {
                                setIsAwaitingUssd(false);
                                setErrorModal({
                                    isOpen: true,
                                    title: "Paiement échoué",
                                    message: data.metadata?.errorMessage || "La transaction a été rejetée ou a expiré."
                                });
                                unsubscribe();
                            }
                        }
                    });
                }
            } else {
                throw new Error(String(result.error));
            }
        } catch (e: any) {
            setIsAwaitingUssd(false);
            setErrorModal({ isOpen: true, message: e.message || "Erreur de connexion.", title: "Erreur de paiement" });
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
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Montant à recharger</label>
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
                                    <OperatorLogo logo={method.logo} operatorName={method.name} size={32} />
                                    <span className="text-white text-[9px] font-black uppercase text-center truncate w-full">{method.name}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* 🛡️ SECTION NUMÉRO CERTIFIÉ */}
                    <section className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Compte de débit certifié</label>
                        
                        {certifiedNumber ? (
                            <div className="p-5 bg-[#10b981]/5 border border-[#10b981]/20 rounded-3xl flex items-center justify-between shadow-inner group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-[#10b981]/10 flex items-center justify-center text-[#10b981]">
                                        <Smartphone size={20} />
                                    </div>
                                    <div>
                                        <p className="font-mono text-lg font-black text-white tracking-widest">{certifiedNumber}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <ShieldCheck size={12} className="text-[#10b981]" />
                                            <span className="text-[8px] font-black text-[#10b981] uppercase tracking-widest">Numéro Certifié Ndara</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2 bg-slate-900 rounded-lg text-slate-700">
                                    <Lock size={16} />
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl flex flex-col items-center text-center space-y-4 animate-pulse">
                                <ShieldAlert className="h-10 w-10 text-red-500" />
                                <div className="space-y-1">
                                    <p className="text-white font-bold text-sm uppercase">Numéro non certifié</p>
                                    <p className="text-slate-500 text-[10px] font-medium leading-relaxed italic">
                                        Vous devez enregistrer votre numéro Mobile Money dans votre profil avant de pouvoir recharger.
                                    </p>
                                </div>
                                <Button asChild className="h-11 rounded-xl bg-slate-900 border border-white/5 text-xs font-black uppercase tracking-widest">
                                    <Link href="/account">Certifier mon numéro <ExternalLink size={12} className="ml-2" /></Link>
                                </Button>
                            </div>
                        )}
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
                                    const opName = txn.metadata?.operator || txn.provider;
                                    return (
                                        <div key={txn.id} className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 flex items-center justify-between group active:scale-[0.98] transition-all">
                                            <div className="flex items-center gap-4">
                                                <OperatorLogo operatorName={opName} size={42} className="bg-slate-950 p-1" />
                                                <div>
                                                    <p className="font-bold text-white text-xs uppercase truncate max-w-[120px]">{txn.courseTitle || 'Transaction'}</p>
                                                    <p className="text-slate-600 text-[9px] font-bold uppercase mt-0.5">{format((txn.date as any)?.toDate?.() || new Date(txn.date as any || 0), 'dd MMM • HH:mm', { locale: fr })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn("font-black text-sm", status === 'completed' ? "text-emerald-500" : status === 'failed' ? "text-red-500" : "text-amber-500")}>
                                                    {txn.amount.toLocaleString()} F
                                                </p>
                                                <Badge className={cn(
                                                    "text-[7px] font-black uppercase px-1.5 py-0.5 border-none h-4", 
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
                        disabled={isProcessing || !certifiedNumber || !activeMethod}
                        className="w-full h-16 bg-primary hover:bg-emerald-400 text-slate-950 rounded-[2.5rem] font-black text-sm uppercase flex items-center justify-center gap-3 shadow-2xl active:scale-90 animate-pulse-glow border-none"
                    >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                        <span>Lancer la Recharge</span>
                    </Button>
                </div>
            </div>

            {/* 🔥 MODAL USSD */}
            <Dialog open={isAwaitingUssd} onOpenChange={setIsAwaitingUssd}>
                <DialogContent className="bg-slate-900/90 backdrop-blur-2xl border-white/10 rounded-t-[3rem] p-0 overflow-hidden sm:max-w-md fixed bottom-0 top-auto translate-y-0 sm:relative sm:rounded-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                    <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
                    <div className="p-8 pb-10 flex flex-col items-center text-center space-y-8 animate-in slide-up-modal">
                        <div className="w-full flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Ndara Secure</span>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                            <div className="w-24 h-24 rounded-full bg-slate-950 border-2 border-primary/30 flex items-center justify-center relative z-10 shadow-2xl">
                                <Loader2 className="h-14 w-14 animate-spin text-primary opacity-20 absolute" />
                                <PhoneCall className="h-8 w-8 text-primary animate-bounce" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight leading-none">Validation USSD</DialogTitle>
                            <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                                <p className="text-primary text-sm font-bold leading-relaxed italic">
                                    "{ussdInstruction}"
                                </p>
                            </div>
                        </div>
                        <div className="w-full pt-4">
                            <Button 
                                variant="ghost" 
                                onClick={() => setIsAwaitingUssd(false)} 
                                className="w-full h-14 rounded-2xl text-slate-500 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all"
                            >
                                <X className="mr-2 h-4 w-4" /> Annuler l'opération
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ❌ MODAL D'ERREUR FINTECH */}
            <Dialog open={errorModal.isOpen} onOpenChange={(o) => setErrorModal(prev => ({ ...prev, isOpen: o }))}>
                <DialogContent className="bg-[#0f172a] border-white/5 rounded-t-[3rem] p-0 overflow-hidden sm:max-w-md fixed bottom-0 top-auto translate-y-0 sm:relative sm:rounded-[2.5rem]">
                    <div className="p-8 flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border-2 border-red-500/20 shadow-2xl">
                            <XCircle className="h-10 w-10 text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">{errorModal.title}</DialogTitle>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed italic">"{errorModal.message}"</p>
                        </div>
                    </div>
                    <DialogFooter className="p-8 pt-0 flex flex-col gap-3">
                        <Button 
                            onClick={() => { setErrorModal(prev => ({ ...prev, isOpen: false })); handleRecharge(); }}
                            className="w-full h-16 rounded-2xl bg-white text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
                        </Button>
                        <Button 
                            variant="ghost"
                            onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                            className="w-full h-12 rounded-xl text-slate-500 font-bold uppercase text-[10px] tracking-widest"
                        >
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 animate-in fade-in duration-500">
                    <div className="bg-slate-900 rounded-[3rem] p-10 text-center space-y-8 max-w-sm shadow-2xl border border-primary/20">
                        <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce shadow-primary/40">
                            <Check className="h-14 w-14 text-slate-950" strokeWidth={4} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black text-white uppercase tracking-tight">C'est crédité !</h3>
                            <p className="text-slate-400 font-medium italic text-sm">Votre solde a été mis à jour instantanément.</p>
                        </div>
                        <Button onClick={() => setIsSuccess(false)} className="w-full h-16 rounded-2xl bg-primary text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl">
                            Continuer mes études
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function BadgeEuroIcon() {
    return (
        <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-primary shadow-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
            </svg>
        </div>
    );
}