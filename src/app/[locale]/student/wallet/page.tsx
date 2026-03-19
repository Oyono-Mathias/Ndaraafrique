'use client';

/**
 * @fileOverview Ndara Wallet Étudiant V5 - Fintech Dynamic.
 * ✅ DESIGN : Respect des couleurs PRD (#3F51B5, #F5F5F5).
 * ✅ DYNAMIQUE : Chargement des pays et modes de paiement depuis Firestore.
 * ✅ UX : Bouton sticky en bas de l'écran pour mobile.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { 
    ArrowLeft, 
    Smartphone, 
    Check, 
    Loader2, 
    History, 
    ChevronDown, 
    CircleDollarSign, 
    ArrowDownLeft, 
    ShoppingBag as ShoppingBagIcon,
    ShieldCheck,
    Globe,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WalletCard } from '@/components/wallet/WalletCard';
import { PaymentMethodCard } from '@/components/wallet/PaymentMethodCard';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, Country, PaymentMethod } from '@/lib/types';

const PRESET_AMOUNTS = [2500, 5000, 10000, 25000];

export default function NdaraWalletPage() {
    const { currentUser, user, isUserLoading } = useRole();
    const db = getFirestore();
    const router = useRouter();
    const locale = useLocale();
    const { toast } = useToast();
    const t = useTranslations('Wallet');
    
    const [transactions, setTransactions] = useState<Payment[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    const [isLoadingCountries, setIsLoadingCountries] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [selectedAmount, setSelectedAmount] = useState<number>(0);
    const [customAmount, setCustomAmount] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedCountryId, setSelectedCountryId] = useState<string>('');

    // 1. Écouteur des pays et de leurs modes de paiement (Temps Réel)
    useEffect(() => {
        const q = query(collection(db, 'countries'), where('active', '==', true), orderBy('name'));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Country));
            setCountries(list);
            if (list.length > 0 && !selectedCountryId) {
                setSelectedCountryId(list[0].id);
            }
            setIsLoadingCountries(false);
        });
        return () => unsub();
    }, [db, selectedCountryId]);

    // 2. Écouteur des transactions de l'utilisateur
    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, 'payments'),
            where('userId', '==', user.uid),
            where('metadata.type', '==', 'wallet_topup'),
            orderBy('date', 'desc'),
            limit(10)
        );

        const unsub = onSnapshot(q, (snap) => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        });

        return () => unsub();
    }, [user?.uid, db]);

    const activeCountry = useMemo(() => 
        countries.find(c => c.id === selectedCountryId), 
    [countries, selectedCountryId]);

    const availableMethods = useMemo(() => {
        if (!activeCountry) return [];
        return (activeCountry.paymentMethods || []).filter(m => m.active);
    }, [activeCountry]);

    const handleRecharge = async () => {
        if (!user || selectedAmount <= 0 || !selectedMethod) {
            toast({ variant: 'destructive', title: "Données manquantes", description: "Veuillez choisir un montant et un moyen de paiement." });
            return;
        }

        setIsProcessing(true);
        try {
            // Création de l'audit de transaction
            await addDoc(collection(db, 'payments'), {
                userId: user.uid,
                amount: selectedAmount,
                currency: activeCountry?.currency || 'XOF',
                provider: selectedMethod.provider,
                status: 'Pending',
                date: serverTimestamp(),
                courseTitle: 'Recharge Wallet Ndara',
                metadata: {
                    userId: user.uid,
                    type: 'wallet_topup',
                    courseId: 'WALLET_RECHARGE'
                }
            });

            // Appel de la passerelle réelle (MeSomb / Moneroo)
            const result = await initiateMeSombPayment({
                amount: selectedAmount,
                phoneNumber: phoneNumber,
                service: selectedMethod.name.toLowerCase().includes('mtn') ? 'MTN' : 'ORANGE',
                courseId: 'WALLET_RECHARGE',
                userId: user.uid,
                type: 'wallet_topup' as any
            });

            if (result.success) {
                toast({ title: "Demande envoyée !", description: "Veuillez valider l'opération sur votre téléphone." });
                setCustomAmount('');
                setSelectedAmount(0);
                setPhoneNumber('');
            } else {
                throw new Error(result.error);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Échec", description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isUserLoading || isLoadingCountries) return <WalletSkeleton />;

    return (
        <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-sans relative">
            <div className="grain-overlay opacity-[0.03]" />

            <header className="fixed top-0 left-0 right-0 z-50 bg-[#3F51B5] backdrop-blur-md safe-area-pt border-b border-white/10 shadow-lg">
                <div className="px-6 py-4 flex items-center justify-between">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90 transition">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="font-black text-lg text-white uppercase tracking-[0.2em]">Ndara Wallet</h1>
                    <div className="w-10" />
                </div>
            </header>

            <main className="flex-1 pt-24 pb-48 px-6 space-y-8 animate-in fade-in duration-700">
                
                <WalletCard 
                    balance={currentUser?.balance || 0} 
                    userName={currentUser?.fullName || 'Ndara'} 
                    variant="indigo"
                    className="bg-[#3F51B5]"
                />

                {/* --- SELECTION PAYS --- */}
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Région de recharge</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl z-10">{activeCountry?.flagEmoji || '🌍'}</span>
                        <select 
                            value={selectedCountryId}
                            onChange={(e) => { setSelectedCountryId(e.target.value); setSelectedMethod(null); }}
                            className="w-full h-14 pl-14 pr-10 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-900 uppercase tracking-widest appearance-none outline-none focus:border-[#3F51B5] transition-all"
                        >
                            {countries.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.currency})</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* --- MONTANT --- */}
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#3F51B5] flex items-center justify-center shadow-inner">
                            <CircleDollarSign size={20} />
                        </div>
                        <h2 className="text-slate-900 font-black text-xs uppercase tracking-widest">Wungo tî nginza</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {PRESET_AMOUNTS.map(val => (
                            <button 
                                key={val}
                                onClick={() => { setSelectedAmount(val); setCustomAmount(''); }}
                                className={cn(
                                    "py-4 rounded-xl border-2 font-black text-xs transition-all active:scale-95",
                                    selectedAmount === val && !customAmount
                                        ? "bg-[#3F51B5] border-[#3F51B5] text-white shadow-lg shadow-indigo-200" 
                                        : "bg-slate-50 border-slate-100 text-slate-500 hover:border-indigo-300"
                                )}
                            >
                                {val.toLocaleString()} {activeCountry?.currency}
                            </button>
                        ))}
                    </div>
                    
                    <Input 
                        type="number" 
                        value={customAmount}
                        onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(parseInt(e.target.value) || 0); }}
                        className="h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-[#3F51B5] text-slate-900 font-black text-lg text-center"
                        placeholder="Autre montant..."
                    />
                </div>

                {/* --- METHODES DYNAMIQUES --- */}
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#3F51B5] flex items-center justify-center shadow-inner">
                            <Smartphone size={20} />
                        </div>
                        <h2 className="text-slate-900 font-black text-xs uppercase tracking-widest">Lêge tî futa nginza</h2>
                    </div>
                    
                    {availableMethods.length > 0 ? (
                        <div className="grid grid-cols-3 gap-3">
                            {availableMethods.map(method => (
                                <PaymentMethodCard 
                                    key={method.id}
                                    active={selectedMethod?.id === method.id}
                                    onClick={() => setSelectedMethod(method)}
                                    label={method.name}
                                    logo={method.logo}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Aucun moyen pour ce pays</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Numéro de téléphone</label>
                        <div className="flex gap-2">
                            <div className="h-14 px-4 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-600 border border-slate-200">
                                {activeCountry?.prefix || '+'}
                            </div>
                            <Input 
                                type="tel" 
                                placeholder="Numéro Mobile Money" 
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="flex-1 h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-black text-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* --- HISTORIQUE VINTAGE --- */}
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 space-y-6">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-slate-900 font-black text-xs uppercase tracking-widest">Kua tî nginza</h3>
                        <History size={14} className="text-slate-300" />
                    </div>
                    <div className="space-y-3">
                        {transactions.length > 0 ? (
                            transactions.map(txn => (
                                <div key={txn.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                                            txn.status === 'Completed' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                                        )}>
                                            <ArrowDownLeft size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-[140px]">Recharge</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">
                                                {txn.date && (txn.date as any).toDate ? format((txn.date as any).toDate(), 'dd MMM HH:mm', { locale: fr }) : '...'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900">+{txn.amount.toLocaleString()} F</p>
                                        <span className={cn("text-[8px] font-black uppercase", txn.status === 'Pending' ? "text-amber-500 animate-pulse" : "text-slate-400")}>
                                            {txn.status === 'Pending' ? 'Audit' : 'Validé'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-10 text-center opacity-20">
                                <History size={40} className="mx-auto mb-2 text-slate-400" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Aucune transaction</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* --- STICKY FOOTER PREMIUM --- */}
            <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-xl border-t border-slate-100 z-50 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="max-w-md mx-auto space-y-4">
                    <div className="flex justify-between items-end px-2">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Injection totale</p>
                            <p className="text-3xl font-black text-slate-950 leading-none">
                                {selectedAmount.toLocaleString()} <span className="text-sm font-bold text-[#3F51B5]">{activeCountry?.currency || 'XOF'}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase">Ndara Secure</span>
                        </div>
                    </div>
                    <Button 
                        onClick={handleRecharge} 
                        disabled={isProcessing || selectedAmount <= 0 || !selectedMethod || phoneNumber.length < 8}
                        className="w-full h-16 rounded-2xl bg-[#3F51B5] hover:bg-[#303F9F] text-white font-black uppercase text-sm tracking-widest shadow-2xl shadow-indigo-200 transition-all active:scale-95 border-none"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : <><Check size={20} className="mr-3" strokeWidth={3} /> Lancer la transaction</>}
                    </Button>
                </div>
            </footer>
        </div>
    );
}

function WalletSkeleton() {
    return (
        <div className="p-6 space-y-8 pt-32 bg-[#F5F5F5] min-h-screen">
            <Skeleton className="h-48 w-full rounded-[2.5rem] bg-slate-200" />
            <Skeleton className="h-32 w-full rounded-3xl bg-slate-200" />
            <Skeleton className="h-64 w-full rounded-3xl bg-slate-200" />
        </div>
    );
}
