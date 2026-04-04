'use client';

/**
 * @fileOverview Ndara Wallet Étudiant - V6.0 International Dynamique.
 * ✅ GESTION PAYS : Chargement dynamique des méthodes de paiement basées sur le pays de l'utilisateur.
 * ✅ SÉCURITÉ : Validation stricte des retours MeSomb et gestion du mode test.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, doc, getDocs } from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { 
    HelpCircle, 
    Wifi, 
    Loader2, 
    Smartphone, 
    Receipt, 
    CreditCard, 
    Check,
    SmartphoneNfc,
    Clock,
    Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, Country, PaymentMethod } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAwaitingUssd, setIsAwaitingUssd] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // --- ÉTAT INTERNATIONAL ---
    const [countryData, setCountryData] = useState<Country | null>(null);
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    const [isLoadingCountry, setIsLoadingCountry] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (snap.exists()) setLiveBalance(snap.data().balance || 0);
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
                        setSelectedMethodId(data.paymentMethods[0].id);
                    }
                }
            } catch (e) {
                console.error("Country Fetch Error", e);
            } finally {
                setIsLoadingCountry(false);
            }
        };

        fetchCountry();
    }, [currentUser?.countryCode, db, user?.uid]);

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

    const activeMethod = useMemo(() => 
        countryData?.paymentMethods.find(m => m.id === selectedMethodId),
    [countryData, selectedMethodId]);

    const handleRecharge = async () => {
        if (!user || selectedAmount < 100 || !activeMethod) {
            toast({ variant: 'destructive', title: "Données manquantes" });
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
            // Logique de dispatch selon le provider
            if (activeMethod.provider === 'mesomb') {
                const result = await initiateMeSombPayment({
                    amount: selectedAmount,
                    phoneNumber: cleanPhone,
                    service: activeMethod.name.toUpperCase().includes('MTN') ? 'MTN' : 'ORANGE',
                    userId: user.uid,
                    type: 'wallet_topup'
                });

                if (result.success) {
                    if (result.type === 'SIMULATED') setIsSuccess(true);
                    else {
                        setIsAwaitingUssd(true);
                        toast({ title: "Action requise !" });
                    }
                } else throw new Error(String(result.error));
            }
            // Autres providers à ajouter ici...
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erreur transaction", description: String(e.message) });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isUserLoading || isLoadingCountry) return <div className="h-screen bg-[#F5F5F5] flex items-center justify-center"><Loader2 className="animate-spin text-[#3F51B5]" /></div>;

    return (
        <div className="antialiased flex justify-center bg-black min-h-screen font-sans">
            <div className="grain-overlay"></div>

            <div className="w-full max-w-md min-h-screen bg-[#F5F5F5] relative flex flex-col shadow-2xl overflow-hidden">
                <header className="fixed top-0 w-full max-w-md z-40 bg-[#F5F5F5]/95 backdrop-blur-md safe-top border-b border-gray-200">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <h1 className="font-black text-xl text-[#212121] tracking-wide uppercase">{t('title')}</h1>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{countryData?.name || 'Afrique'}</span>
                            <span className="text-sm">{countryData?.flagEmoji}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto hide-scrollbar pt-24 pb-48 px-6 relative">
                    <div className="bg-gradient-to-br from-[#3F51B5] to-[#7986CB] rounded-4xl p-6 mb-8 shadow-2xl active:scale-95 transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
                        <div className="relative z-10">
                            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">{t('available_balance')}</p>
                            <h2 className="text-white font-black text-4xl tracking-tight">
                                {(liveBalance ?? 0).toLocaleString('fr-FR')} <span className="text-lg font-bold">{countryData?.currency || 'FCFA'}</span>
                            </h2>
                            <div className="flex items-center justify-between mt-8">
                                <p className="text-white font-bold text-sm tracking-wide uppercase">{currentUser?.fullName}</p>
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
                                        selectedAmount === val && !customAmount ? "bg-[#3F51B5] text-white border-[#3F51B5] shadow-lg" : "bg-white border-gray-200 text-[#212121] hover:border-indigo-200"
                                    )}
                                >
                                    {val.toLocaleString()} {countryData?.currency || 'F'}
                                </button>
                            ))}
                        </div>
                        <Input 
                            type="number" 
                            placeholder="Autre montant"
                            className="w-full h-16 bg-white border-2 border-gray-200 rounded-4xl px-6 text-[#212121] font-black text-lg focus:border-[#3F51B5]"
                            value={customAmount}
                            onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(Number(e.target.value) || 0); }}
                        />
                    </div>

                    <div className="mb-8">
                        <label className="block text-[#757575] text-[10px] font-black uppercase mb-3 ml-1 tracking-widest">Opérateur {countryData?.name}</label>
                        {countryData?.paymentMethods && countryData.paymentMethods.length > 0 ? (
                            <div className="grid grid-cols-3 gap-3">
                                {countryData.paymentMethods.filter(m => m.active).map(method => (
                                    <button 
                                        key={method.id}
                                        onClick={() => setSelectedMethodId(method.id)}
                                        className={cn(
                                            "bg-white rounded-3xl p-4 border-2 flex flex-col items-center gap-2 transition-all active:scale-95",
                                            selectedMethodId === method.id ? "border-[#3F51B5] bg-blue-50/20" : "border-gray-200"
                                        )}
                                    >
                                        <OperatorLogo operatorName={method.provider} size={32} />
                                        <span className="text-[#212121] text-[9px] font-black uppercase text-center truncate w-full">{method.name}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 bg-amber-50 rounded-3xl border-2 border-dashed border-amber-200 text-center">
                                <Globe className="mx-auto h-8 w-8 text-amber-400 mb-2" />
                                <p className="text-[10px] font-black text-amber-700 uppercase">Aucun moyen actif pour ce pays</p>
                            </div>
                        )}
                    </div>

                    <div className="mb-12">
                        <label className="block text-[#757575] text-[10px] font-black uppercase mb-3 ml-1 tracking-widest">Numéro Mobile Money ({countryData?.prefix})</label>
                        <div className="relative">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#3F51B5]"><SmartphoneNfc className="w-5 h-5" /></div>
                            <input 
                                type="tel"
                                placeholder="6xx xxx xxx"
                                className="w-full h-16 pl-14 rounded-4xl bg-white border-2 border-gray-200 font-mono text-lg text-[#212121] focus:border-[#3F51B5]"
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
                            {transactions.map(txn => (
                                <div key={txn.id} className="bg-white rounded-3xl p-5 shadow-sm flex items-center justify-between border-2 border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <OperatorLogo operatorName={txn.provider} size={40} />
                                        <div className="min-w-0">
                                            <p className="font-black text-[#212121] text-[11px] uppercase truncate max-w-[140px]">{txn.courseTitle || 'Recharge'}</p>
                                            <p className="text-[#757575] text-[10px] font-mono mt-1">{format((txn.date as any)?.toDate?.() || new Date(), 'dd MMM • HH:mm', { locale: fr })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn("font-mono font-black text-[15px]", txn.amount > 0 ? "text-emerald-600" : "text-red-500")}>
                                            {txn.amount.toLocaleString()} F
                                        </p>
                                        <Badge className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 mt-1", txn.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>{txn.status}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                <div className="fixed bottom-0 w-full max-md bg-gradient-to-t from-[#F5F5F5] via-[#F5F5F5] to-transparent pt-8 pb-8 px-6 z-40">
                    <Button 
                        onClick={handleRecharge}
                        disabled={isProcessing || !phoneNumber || !activeMethod}
                        className="w-full h-16 bg-[#3F51B5] hover:bg-[#303F9F] text-white rounded-4xl font-black text-sm uppercase flex items-center justify-center gap-3 shadow-2xl active:scale-95 animate-pulse-glow border-none"
                    >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                        <span>{t('action_button')}</span>
                    </Button>
                </div>
            </div>

            <Dialog open={isAwaitingUssd} onOpenChange={setIsAwaitingUssd}>
                <DialogContent className="sm:max-w-md bg-white border-none rounded-[2.5rem] p-10 text-center">
                    <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                <Loader2 className="h-12 w-12 animate-spin" />
                            </div>
                            <Smartphone className="absolute -bottom-2 -right-2 h-8 w-8 text-amber-600 bg-white rounded-full p-1.5 shadow-lg" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-900 uppercase">Confirmation Mobile</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium italic text-sm">
                            Veuillez valider le dépôt de <b>{selectedAmount.toLocaleString()} {countryData?.currency}</b> sur votre terminal.
                        </DialogDescription>
                        <Button variant="ghost" onClick={() => setIsAwaitingUssd(false)} className="w-full text-red-500 font-black uppercase text-[10px]">Annuler</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isSuccess} onOpenChange={setIsSuccess}>
                <DialogContent className="sm:max-w-md bg-white border-none rounded-[3rem] p-10 text-center">
                    <div className="flex flex-col items-center gap-8 animate-in zoom-in duration-700">
                        <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl animate-bounce">
                            <Check className="h-14 w-14 text-white" strokeWidth={4} />
                        </div>
                        <DialogTitle className="text-3xl font-black text-slate-900 uppercase">Succès !</DialogTitle>
                        <p className="text-slate-500 font-medium">Votre compte a été crédité.</p>
                        <Button onClick={() => setIsSuccess(false)} className="w-full h-16 rounded-[2rem] bg-slate-900 text-white font-black uppercase">Terminer</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
