
'use client';

/**
 * @fileOverview Ndara Wallet Étudiant - Design Original Connecté Firestore.
 * ✅ DESIGN : Intégralité du template HTML/CSS fourni par l'utilisateur.
 * ✅ REAL-TIME : Listeners onSnapshot pour le solde et les reçus vintage.
 * ✅ FONCTIONNEL : Sélecteur natif et paiement MeSomb opérationnels.
 * ✅ I18N : Test du système de traduction sur les éléments clés.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { 
    HelpCircle, 
    Wifi, 
    CreditCard, 
    Loader2, 
    Smartphone, 
    Plus, 
    Receipt, 
    ArrowDownLeft, 
    ShoppingBag as ShoppingBagIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, Country } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const PRESET_AMOUNTS = [2500, 5000, 10000, 25000];

export default function NdaraWalletPage() {
    const { user, currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const router = useRouter();
    const locale = useLocale();
    const { toast } = useToast();
    const t = useTranslations('Wallet');
    
    // --- ÉTATS RÉELS ---
    const [liveBalance, setLiveBalance] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<Payment[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    
    // --- ÉTATS FORMULAIRE ---
    const [selectedAmount, setSelectedAmount] = useState<number>(5000);
    const [customAmount, setCustomAmount] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    const [selectedCountryId, setSelectedCountryId] = useState<string>('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // 1. Écouteur de solde (Real-time)
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (snap.exists()) {
                setLiveBalance(snap.data().balance || 0);
            }
        });
        return () => unsub();
    }, [user?.uid, db]);

    // 2. Écouteur d'historique (Real-time)
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

    // 3. Charger les pays
    useEffect(() => {
        const q = query(collection(db, 'countries'), where('active', '==', true), orderBy('name'));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Country));
            setCountries(list);
            if (list.length > 0 && !selectedCountryId) {
                const userCountry = list.find(c => c.code === currentUser?.countryCode);
                setSelectedCountryId(userCountry?.id || list[0].id);
            }
        });
        return () => unsub();
    }, [db, currentUser?.countryCode, selectedCountryId]);

    const activeCountry = useMemo(() => countries.find(c => c.id === selectedCountryId), [countries, selectedCountryId]);
    const availableMethods = useMemo(() => (activeCountry?.paymentMethods || []).filter(m => m.active), [activeCountry]);

    useEffect(() => {
        if (availableMethods.length > 0 && !selectedMethodId) {
            setSelectedMethodId(availableMethods[0].id);
        }
    }, [availableMethods, selectedMethodId]);

    const handleRecharge = async () => {
        if (!user || selectedAmount <= 0) {
            toast({ variant: 'destructive', title: "Montant invalide" });
            return;
        }
        if (phoneNumber.length < 8) {
            toast({ variant: 'destructive', title: "Numéro requis" });
            return;
        }

        setIsProcessing(true);
        try {
            const method = availableMethods.find(m => m.id === selectedMethodId);
            const result = await initiateMeSombPayment({
                amount: selectedAmount,
                phoneNumber: phoneNumber,
                service: method?.name.toLowerCase().includes('mtn') ? 'MTN' : 'ORANGE',
                courseId: 'WALLET_TOPUP',
                userId: user.uid,
                type: 'wallet_topup'
            });

            if (result.success) {
                toast({ title: "Demande initiée", description: "Validez le paiement sur votre mobile." });
                setCustomAmount('');
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

    if (isUserLoading) return <div className="h-screen bg-[#F5F5F5] flex items-center justify-center"><Loader2 className="animate-spin text-[#3F51B5]" /></div>;

    return (
        <div className="antialiased flex justify-center bg-black min-h-screen font-sans">
            {/* Grain Texture */}
            <div className="grain-overlay"></div>

            <style jsx>{`
                .neo-card {
                    background: linear-gradient(135deg, #3F51B5 0%, #5C6BC0 50%, #7986CB 100%);
                    position: relative;
                    overflow: hidden;
                }
                .neo-card::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -50%;
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%);
                    pointer-events: none;
                }
                .holo-chip {
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
                    position: relative;
                    overflow: hidden;
                }
                .holo-chip::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%);
                    animation: shimmer 3s infinite;
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .vintage-receipt {
                    background: #FFFFFF;
                    border: 2px dashed #BDBDBD;
                    position: relative;
                    font-family: 'JetBrains Mono', monospace;
                }
                .vintage-receipt::before, .vintage-receipt::after {
                    content: '';
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background: #F5F5F5;
                    border-radius: 50%;
                }
                .vintage-receipt::before { left: -11px; top: 50%; transform: translateY(-50%); }
                .vintage-receipt::after { right: -11px; top: 50%; transform: translateY(-50%); }
                .grain-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 9999;
                    opacity: 0.03;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                }
            `}</style>

            {/* Mobile Container */}
            <div className="w-full max-w-md min-h-screen bg-[#F5F5F5] relative flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <header className="fixed top-0 w-full max-w-md z-40 bg-[#F5F5F5]/95 backdrop-blur-md safe-top border-b border-gray-200">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <h1 className="font-black text-xl text-[#212121] tracking-wide uppercase">{t('title')}</h1>
                        <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#757575] hover:bg-gray-100 transition shadow-sm active:scale-90">
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto hide-scrollbar pt-24 pb-48 px-6 relative">
                    
                    {/* Neo Bank Card */}
                    <div className="neo-card rounded-4xl p-6 mb-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-500 active:scale-95 transition-all">
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
                                    <div className="holo-chip w-12 h-9 rounded-lg"></div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-4">
                                <div>
                                    <p className="text-white/70 text-[9px] font-bold uppercase mb-1">Titulaire</p>
                                    <p className="text-white font-bold text-sm tracking-wide uppercase">{currentUser?.fullName}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Wifi className="text-white/70 text-xl rotate-90" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Country Selector */}
                    <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                        <label className="block text-[#757575] text-[10px] font-bold uppercase mb-2 ml-1">Pays de Résidence</label>
                        <div className="relative">
                            <select 
                                value={selectedCountryId}
                                onChange={(e) => setSelectedCountryId(e.target.value)}
                                className="w-full bg-white border-2 border-gray-200 rounded-4xl px-4 py-4 pr-12 text-[#212121] font-bold text-sm focus:outline-none focus:border-[#3F51B5] appearance-none cursor-pointer"
                            >
                                {countries.map(c => (
                                    <option key={c.id} value={c.id}>{c.flagEmoji} {c.name} ({c.currency})</option>
                                ))}
                                {countries.length === 0 && <option>Chargement des pays...</option>}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#757575]">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </div>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-200">
                        <label className="block text-[#757575] text-[10px] font-bold uppercase mb-3 ml-1">Mode de Paiement</label>
                        <div className="grid grid-cols-3 gap-3">
                            {availableMethods.map(method => (
                                <button 
                                    key={method.id}
                                    onClick={() => setSelectedMethodId(method.id)}
                                    className={cn(
                                        "bg-white rounded-3xl p-4 border-2 flex flex-col items-center gap-2 transition-all active:scale-95",
                                        selectedMethodId === method.id ? "border-[#3F51B5] bg-[#3F51B5]/5" : "border-gray-200 opacity-60"
                                    )}
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center overflow-hidden">
                                        {method.logo ? (
                                            <img src={method.logo} alt={method.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <span className={cn("font-black text-xs", method.name.includes('Orange') ? 'text-[#FF7900]' : 'text-[#3F51B5]')}>
                                                {method.name.includes('Orange') ? 'OM' : method.name.includes('MTN') ? 'MTN' : 'W'}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[#212121] text-[10px] font-bold">{method.name}</span>
                                </button>
                            ))}
                            <button className="bg-white rounded-3xl p-4 border-2 border-gray-200 flex flex-col items-center gap-2 opacity-40">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <span className="text-[#757575] text-[10px] font-bold">Autre</span>
                            </button>
                        </div>
                    </div>

                    {/* Amount Selection */}
                    <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-300">
                        <label className="block text-[#757575] text-[10px] font-bold uppercase mb-3 ml-1">Montant à Recharger</label>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {PRESET_AMOUNTS.map(val => (
                                <button 
                                    key={val}
                                    onClick={() => { setSelectedAmount(val); setCustomAmount(''); }}
                                    className={cn(
                                        "border-2 rounded-3xl py-4 font-black text-sm transition-all active:scale-95",
                                        selectedAmount === val && !customAmount ? "bg-[#3F51B5] border-[#3F51B5] text-white shadow-lg" : "bg-white border-gray-200 text-[#212121]"
                                    )}
                                >
                                    {val.toLocaleString()} {activeCountry?.currency || 'FCFA'}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <Input 
                                type="number" 
                                placeholder="Autre montant"
                                className="w-full h-16 bg-white border-2 border-gray-200 rounded-4xl px-4 text-[#212121] font-bold text-sm focus:outline-none focus:border-[#3F51B5] shadow-sm"
                                value={customAmount}
                                onChange={(e) => {
                                    setCustomAmount(e.target.value);
                                    setSelectedAmount(Number(e.target.value) || 0);
                                }}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#757575] text-sm font-bold uppercase">{activeCountry?.currency || 'FCFA'}</div>
                        </div>
                    </div>

                    {/* Phone Number Input */}
                    <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-350">
                        <label className="block text-[#757575] text-[10px] font-bold uppercase mb-2 ml-1">Numéro de téléphone</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3F51B5]">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <input 
                                type="tel"
                                placeholder="Numéro pour débit"
                                className="w-full h-16 pl-12 rounded-4xl bg-white border-2 border-gray-200 font-mono text-lg text-[#212121] focus:outline-none focus:border-[#3F51B5]"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-400">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h2 className="font-black text-[#212121] text-sm uppercase tracking-wide flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-[#3F51B5]" />
                                Historique
                            </h2>
                            <button className="text-[#3F51B5] text-[10px] font-bold hover:underline transition">VOIR TOUT</button>
                        </div>

                        <div className="space-y-3">
                            {transactions.map(txn => {
                                const date = (txn.date as any)?.toDate?.() || new Date();
                                const isIncome = txn.amount > 0;
                                return (
                                    <div key={txn.id} className="vintage-receipt rounded-3xl p-4 active:scale-[0.98] transition-all shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", isIncome ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}>
                                                    {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ShoppingBagIcon className="w-4 h-4" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-[#212121] text-xs uppercase truncate max-w-[120px]">{txn.courseTitle || 'Transaction'}</p>
                                                    <p className="text-[#757575] text-[9px] font-mono mt-0.5">{format(date, 'dd MMM • HH:mm', { locale: fr })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn("font-mono font-black text-sm", isIncome ? "text-emerald-600" : "text-red-500")}>
                                                    {isIncome ? '+' : ''}{txn.amount.toLocaleString()} F
                                                </p>
                                                <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full", txn.status === 'completed' ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600 animate-pulse")}>
                                                    {txn.status === 'completed' ? 'Succès' : 'Audit'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="border-t-2 border-dashed border-gray-200 pt-2 mt-2">
                                            <p className="text-[#757575] text-[8px] font-mono uppercase truncate">REF: {txn.id}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {transactions.length === 0 && <p className="text-center py-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-50">Aucun mouvement</p>}
                        </div>
                    </div>

                </main>

                {/* Sticky Action Button */}
                <div className="fixed bottom-0 w-full max-w-md bg-gradient-to-t from-[#F5F5F5] via-[#F5F5F5] to-transparent pt-6 pb-6 px-6 safe-bottom z-40">
                    <Button 
                        onClick={handleRecharge}
                        disabled={isProcessing || selectedAmount <= 0}
                        className="w-full bg-[#3F51B5] hover:bg-[#303F9F] text-white py-7 rounded-4xl font-black text-sm uppercase tracking-wide transition shadow-2xl flex items-center justify-center gap-3 active:scale-95 animate-pulse-glow border-none"
                    >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                        <span>{t('action_button')}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
