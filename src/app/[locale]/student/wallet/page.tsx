
'use client';

/**
 * @fileOverview Ndara Wallet Étudiant V4 - Design Fintech Indigo.
 * ✅ DYNAMIQUE : Charge les pays et leurs méthodes de paiement depuis Firestore.
 * ✅ UX MOBILE : Bouton sticky et padding optimisé.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    ArrowDownLeft, 
    Smartphone, 
    Check, 
    Loader2, 
    History,
    Wallet as WalletIcon,
    ArrowLeft,
    ChevronDown,
    CircleDollarSign,
    ShoppingBag as ShoppingBagIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Payment, Country, PaymentMethod } from '@/lib/types';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { WalletCard } from '@/components/wallet/WalletCard';
import { PaymentMethodCard } from '@/components/wallet/PaymentMethodCard';

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000];

export default function NdaraWalletPage() {
    const { currentUser, isUserLoading, user } = useRole();
    const db = getFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const t = useTranslations('Wallet');
    
    const [transactions, setTransactions] = useState<Payment[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    const [selectedAmount, setSelectedAmount] = useState<number>(0);
    const [customAmount, setCustomAmount] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedCountryId, setSelectedCountryId] = useState<string>('');

    // 1. Écouteur des pays dynamiques
    useEffect(() => {
        const q = query(collection(db, 'countries'), where('active', '==', true));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => d.data() as Country);
            setCountries(list);
            if (list.length > 0 && !selectedCountryId) {
                setSelectedCountryId(list[0].id);
            }
        });
        return () => unsub();
    }, [db, selectedCountryId]);

    // 2. Écouteur des transactions
    useEffect(() => {
        if (!currentUser?.uid) return;

        const q = query(
            collection(db, 'payments'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc'),
            limit(10)
        );

        const unsub = onSnapshot(q, (snap) => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
            setIsLoading(false);
        });

        return () => unsub();
    }, [currentUser?.uid, db]);

    const activeCountry = useMemo(() => 
        countries.find(c => c.id === selectedCountryId), 
    [countries, selectedCountryId]);

    const availableMethods = useMemo(() => {
        if (!activeCountry) return [];
        return (activeCountry.paymentMethods || []).filter(m => m.active);
    }, [activeCountry]);

    const handleSelectAmount = (val: number) => {
        setSelectedAmount(val);
        setCustomAmount('');
    };

    const handleCustomAmountChange = (val: string) => {
        setCustomAmount(val);
        setSelectedAmount(val ? parseInt(val) : 0);
    };

    const handleRecharge = async () => {
        if (!user || selectedAmount <= 0 || !selectedMethod || phoneNumber.length < 8) {
            toast({ variant: 'destructive', title: "Erreur", description: t('validation_msg') });
            return;
        }

        setIsProcessing(true);
        try {
            // Utilise le provider configuré dans la méthode de paiement
            const result = await initiateMeSombPayment({
                amount: selectedAmount,
                phoneNumber: phoneNumber,
                service: selectedMethod.name.toLowerCase().includes('mtn') ? 'MTN' : 'ORANGE',
                courseId: 'WALLET_RECHARGE',
                userId: user.uid,
                type: 'wallet_topup' as any
            });

            if (result.success) {
                setShowSuccess(true);
            } else {
                throw new Error(result.error);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erreur", description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isUserLoading) return <WalletSkeleton />;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
            <div className="grain-overlay opacity-[0.03]" />

            <header className="fixed top-0 left-0 right-0 z-50 bg-indigo-700/95 backdrop-blur-md safe-area-pt border-b border-white/10">
                <div className="px-6 py-4 flex items-center justify-between">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90 transition">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="font-black text-lg text-white uppercase tracking-[0.2em]">{t('title')}</h1>
                    <div className="w-10" />
                </div>
            </header>

            <main className="flex-1 pt-24 pb-48 px-6 space-y-8 animate-in fade-in duration-700">
                
                {/* --- SHARED WALLET CARD --- */}
                <WalletCard 
                    balance={currentUser?.balance || 0} 
                    userName={currentUser?.fullName || 'Ndara'} 
                    variant="indigo"
                />

                {/* --- COUNTRY SELECTOR --- */}
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Région de recharge</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl z-10">{activeCountry?.flagEmoji || '🌍'}</span>
                        <select 
                            value={selectedCountryId}
                            onChange={(e) => { setSelectedCountryId(e.target.value); setSelectedMethod(null); }}
                            className="w-full h-14 pl-14 pr-10 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-900 uppercase tracking-widest appearance-none outline-none focus:border-indigo-500 transition-all"
                        >
                            {countries.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.currency})</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* --- AMOUNT SELECTION --- */}
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                            <CircleDollarSign size={20} />
                        </div>
                        <h2 className="text-slate-900 font-black text-xs uppercase tracking-widest">{t('amount_label')}</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {PRESET_AMOUNTS.map(val => (
                            <button 
                                key={val}
                                onClick={() => handleSelectAmount(val)}
                                className={cn(
                                    "py-4 rounded-xl border-2 font-black text-xs transition-all active:scale-95",
                                    selectedAmount === val && !customAmount
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg" 
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
                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                        className="h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-indigo-500 text-slate-900 font-black text-lg text-center"
                        placeholder={t('other_amount')}
                    />
                </div>

                {/* --- DYNAMIC PAYMENT METHODS --- */}
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                            <Smartphone size={20} />
                        </div>
                        <h2 className="text-slate-900 font-black text-xs uppercase tracking-widest">{t('method_label')}</h2>
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
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aucun moyen disponible</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('phone_label')}</label>
                        <div className="flex gap-2">
                            <div className="h-14 px-4 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-600 border border-slate-200">
                                {activeCountry?.prefix}
                            </div>
                            <Input 
                                type="tel" 
                                placeholder="Numéro sans préfixe" 
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="flex-1 h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-black text-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* --- RECENT HISTORY --- */}
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 space-y-6">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-slate-900 font-black text-xs uppercase tracking-widest">{t('recent_transactions')}</h3>
                        <button onClick={() => router.push('/student/paiements')} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">Voir tout</button>
                    </div>
                    <div className="space-y-3">
                        {isLoading ? <Skeleton className="h-20 w-full rounded-2xl" /> : transactions.length > 0 ? (
                            transactions.slice(0, 3).map(txn => (
                                <div key={txn.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl active:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                                            txn.amount > 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                        )}>
                                            {txn.amount > 0 ? <ArrowDownLeft size={20} /> : <ShoppingBagIcon size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px]">{txn.courseTitle || 'Recharge'}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{format((txn.date as any).toDate(), 'dd MMM', { locale: fr })}</p>
                                        </div>
                                    </div>
                                    <span className={cn("text-sm font-black", txn.amount > 0 ? "text-emerald-600" : "text-slate-900")}>
                                        {txn.amount > 0 ? '+' : '-'}{Math.abs(txn.amount).toLocaleString()}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="py-10 text-center opacity-20">
                                <History size={40} className="mx-auto mb-2 text-slate-400" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Zéro transaction</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* --- STICKY FOOTER --- */}
            <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-xl border-t border-slate-100 z-50 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="max-w-md mx-auto space-y-4">
                    <div className="flex justify-between items-end px-2">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total à régler</p>
                            <p className="text-3xl font-black text-slate-950 leading-none">
                                {selectedAmount.toLocaleString()} <span className="text-sm font-bold text-indigo-600">{activeCountry?.currency}</span>
                            </p>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px] uppercase px-3 h-6 mb-1">0 FRAIS</Badge>
                    </div>
                    <Button 
                        onClick={handleRecharge} 
                        disabled={isProcessing || selectedAmount <= 0 || !selectedMethod}
                        className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-sm tracking-widest shadow-2xl shadow-indigo-200 transition-all active:scale-95 border-none"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : <><Check size={20} className="mr-3" strokeWidth={3} /> Confirmer le paiement</>}
                    </Button>
                </div>
            </footer>

            {/* Success Overlay */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-500">
                    <div className="text-center space-y-8 animate-in zoom-in duration-700 max-w-sm w-full">
                        <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                            <Check className="h-12 w-12 text-slate-950" strokeWidth={4} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black text-white uppercase tracking-tight">{t('success_title')}</h3>
                            <p className="text-slate-400 text-sm font-medium italic">{t('success_desc')}</p>
                        </div>
                        <Button onClick={() => setShowSuccess(false)} className="w-full h-16 rounded-2xl bg-white text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl">
                            Continuer sur Ndara
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function WalletSkeleton() {
    return (
        <div className="p-6 space-y-8 pt-32">
            <Skeleton className="h-48 w-full rounded-[2.5rem] bg-slate-200" />
            <Skeleton className="h-32 w-full rounded-3xl bg-slate-200" />
            <Skeleton className="h-64 w-full rounded-3xl bg-slate-200" />
        </div>
    );
}
