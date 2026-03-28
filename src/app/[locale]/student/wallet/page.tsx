'use client';

/**
 * @fileOverview Ndara Wallet Étudiant - V4.6 Restaurée & Sécurisée.
 * ✅ DESIGN : Restauration de la structure HTML originale avec sélecteur natif.
 * ✅ DATA : Connexion Firestore Temps Réel pour le solde et l'historique.
 * ✅ FIX : Correction des imports Input/Button pour le build.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
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
    ShoppingBag as ShoppingBagIcon,
    CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const PRESET_AMOUNTS = [2500, 5000, 10000, 25000];

export default function NdaraWalletPage() {
    const { user, currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const { toast } = useToast();
    const t = useTranslations('Wallet');
    
    // États
    const [liveBalance, setLiveBalance] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<Payment[]>([]);
    const [selectedAmount, setSelectedAmount] = useState<number>(5000);
    const [customAmount, setCustomAmount] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedCountryCode, setSelectedCountryCode] = useState('cm');
    const [selectedMethod, setSelectedMethod] = useState('orange');
    const [isProcessing, setIsProcessing] = useState(false);

    // 1. Écouteur de solde Firestore
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (snap.exists()) setLiveBalance(snap.data().balance || 0);
        });
        return () => unsub();
    }, [user?.uid, db]);

    // 2. Écouteur d'historique Firestore
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
            toast({ variant: 'destructive', title: "Montant insuffisant", description: "Le minimum est de 100 FCFA." });
            return;
        }
        if (phoneNumber.length < 8) {
            toast({ variant: 'destructive', title: "Numéro invalide", description: "Veuillez entrer un numéro complet." });
            return;
        }

        setIsProcessing(true);
        try {
            const finalService = selectedMethod.toUpperCase() === 'MTN' || selectedMethod === 'momo' ? 'MTN' : 'ORANGE';

            const result = await initiateMeSombPayment({
                amount: selectedAmount,
                phoneNumber: phoneNumber,
                service: finalService,
                courseId: 'WALLET_TOPUP',
                userId: user.uid,
                type: 'wallet_topup'
            });

            if (result.success) {
                toast({ 
                    title: "Demande envoyée !", 
                    description: "Validez maintenant sur votre téléphone avec votre code PIN." 
                });
                setCustomAmount('');
            } else {
                throw new Error(result.error);
            }
        } catch (e: any) {
            toast({ 
                variant: 'destructive', 
                title: "Échec du paiement", 
                description: e.message || "Une erreur est survenue." 
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isUserLoading) return <div className="h-screen bg-[#F5F5F5] flex items-center justify-center"><Loader2 className="animate-spin text-[#3F51B5]" /></div>;

    const currencyLabel = selectedCountryCode === 'cm' || selectedCountryCode === 'ga' ? 'XAF' : 'XOF';

    return (
        <div className="antialiased flex justify-center bg-black min-h-screen font-sans">
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
                .payment-method.selected {
                    border-color: #3F51B5;
                    background: rgba(63, 81, 181, 0.05);
                }
                .amount-pill.selected {
                    background: #3F51B5;
                    color: #FFFFFF;
                    border-color: #3F51B5;
                }
            `}</style>

            <div className="w-full max-w-md min-h-screen bg-[#F5F5F5] relative flex flex-col shadow-2xl overflow-hidden">
                {/* Header original */}
                <header className="fixed top-0 w-full max-w-md z-40 bg-[#F5F5F5]/95 backdrop-blur-md safe-top border-b border-gray-200">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <h1 className="font-black text-xl text-[#212121] tracking-wide uppercase">{t('title')}</h1>
                        <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#757575] hover:bg-gray-100 transition shadow-sm active:scale-90">
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto hide-scrollbar pt-24 pb-48 px-6 relative">
                    {/* Carte Solde original */}
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
                                    <p className="text-white font-bold text-sm tracking-wide uppercase">{currentUser?.fullName || 'Chargement...'}</p>
                                </div>
                                <Wifi className="text-white/70 text-xl rotate-90" />
                            </div>
                        </div>
                    </div>

                    {/* Sélecteur de Pays original */}
                    <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                        <label className="block text-[#757575] text-[10px] font-bold uppercase mb-2 ml-1">Pays de Résidence</label>
                        <div className="relative">
                            <select 
                                value={selectedCountryCode}
                                onChange={(e) => setSelectedCountryCode(e.target.value)}
                                className="w-full bg-white border-2 border-gray-200 rounded-4xl px-4 py-4 pr-12 text-[#212121] font-bold text-sm focus:outline-none focus:border-[#3F51B5] appearance-none cursor-pointer"
                            >
                                <option value="cm">🇨🇲 Cameroun (XAF)</option>
                                <option value="ci">🇨🇮 Côte d'Ivoire (XOF)</option>
                                <option value="sn">🇸🇳 Sénégal (XOF)</option>
                                <option value="ga">🇬🇦 Gabon (XAF)</option>
                                <option value="ml">🇲🇱 Mali (XOF)</option>
                                <option value="tg">🇹🇬 Togo (XOF)</option>
                                <option value="bj">🇧🇯 Bénin (XOF)</option>
                                <option value="bf">🇧🇫 Burkina Faso (XOF)</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#757575]">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </div>
                        </div>
                    </div>

                    {/* Modes de Paiement original */}
                    <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-200">
                        <label className="block text-[#757575] text-[10px] font-bold uppercase mb-3 ml-1">Mode de Paiement</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button 
                                onClick={() => setSelectedMethod('orange')}
                                className={cn("payment-method bg-white rounded-3xl p-4 border-2 flex flex-col items-center gap-2 transition-all active:scale-95", selectedMethod === 'orange' ? "selected" : "border-gray-200")}
                            >
                                <div className="w-10 h-10 rounded-full bg-[#FF7900]/20 flex items-center justify-center">
                                    <span className="text-[#FF7900] font-black text-xs">OM</span>
                                </div>
                                <span className="text-[#212121] text-[10px] font-bold">Orange</span>
                            </button>
                            <button 
                                onClick={() => setSelectedMethod('mtn')}
                                className={cn("payment-method bg-white rounded-3xl p-4 border-2 flex flex-col items-center gap-2 transition-all active:scale-95", selectedMethod === 'mtn' ? "selected" : "border-gray-200")}
                            >
                                <div className="w-10 h-10 rounded-full bg-[#FFCC00]/20 flex items-center justify-center">
                                    <span className="text-[#FFCC00] font-black text-xs">MTN</span>
                                </div>
                                <span className="text-[#212121] text-[10px] font-bold">MoMo</span>
                            </button>
                            <button 
                                onClick={() => setSelectedMethod('wave')}
                                className={cn("payment-method bg-white rounded-3xl p-4 border-2 flex flex-col items-center gap-2 transition-all active:scale-95", selectedMethod === 'wave' ? "selected" : "border-gray-200")}
                            >
                                <div className="w-10 h-10 rounded-full bg-[#1DC0F1]/20 flex items-center justify-center">
                                    <span className="text-[#1DC0F1] font-black text-xs">W</span>
                                </div>
                                <span className="text-[#212121] text-[10px] font-bold">Wave</span>
                            </button>
                        </div>
                    </div>

                    {/* Montants original */}
                    <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-300">
                        <label className="block text-[#757575] text-[10px] font-bold uppercase mb-3 ml-1">Montant à Recharger</label>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {PRESET_AMOUNTS.map(val => (
                                <button 
                                    key={val}
                                    onClick={() => { setSelectedAmount(val); setCustomAmount(''); }}
                                    className={cn(
                                        "amount-pill border-2 rounded-3xl py-4 font-black text-sm transition-all active:scale-95",
                                        selectedAmount === val && !customAmount ? "selected" : "bg-white border-gray-200 text-[#212121]"
                                    )}
                                >
                                    {val.toLocaleString()} {currencyLabel}
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
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{currencyLabel}</div>
                        </div>
                    </div>

                    {/* Téléphone original */}
                    <div className="mb-10 animate-in slide-in-from-bottom-4 duration-500 delay-350">
                        <label className="block text-[#757575] text-[10px] font-bold uppercase mb-2 ml-1">Numéro de téléphone (avec code pays)</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3F51B5]">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <input 
                                type="tel"
                                placeholder="ex: 237690000000"
                                className="w-full h-16 pl-12 rounded-4xl bg-white border-2 border-gray-200 font-mono text-lg text-[#212121] focus:outline-none focus:border-[#3F51B5] shadow-sm"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Historique original */}
                    <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-400">
                        <h2 className="font-black text-[#212121] text-sm uppercase tracking-wide flex items-center gap-2 mb-4">
                            <Receipt className="w-4 h-4 text-[#3F51B5]" />
                            {t('history')}
                        </h2>
                        <div className="space-y-3">
                            {transactions.map(txn => {
                                const date = (txn.date as any)?.toDate?.() || new Date();
                                const isIncome = txn.amount > 0;
                                return (
                                    <div key={txn.id} className="vintage-receipt rounded-3xl p-4 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", isIncome ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}>
                                                    {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ShoppingBagIcon className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#212121] text-xs uppercase truncate max-w-[150px]">{txn.courseTitle || 'Recharge'}</p>
                                                    <p className="text-[#757575] text-[9px] font-mono">{format(date, 'dd MMM • HH:mm', { locale: fr })}</p>
                                                </div>
                                            </div>
                                            <p className={cn("font-mono font-black text-sm", isIncome ? "text-emerald-600" : "text-red-500")}>
                                                {isIncome ? '+' : ''}{txn.amount.toLocaleString()} F
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            {transactions.length === 0 && <p className="text-center py-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucune transaction</p>}
                        </div>
                    </div>
                </main>

                {/* Bouton Fixe original */}
                <div className="fixed bottom-0 w-full max-w-md bg-gradient-to-t from-[#F5F5F5] via-[#F5F5F5] to-transparent pt-6 pb-6 px-6 z-40">
                    <Button 
                        onClick={handleRecharge}
                        disabled={isProcessing || selectedAmount <= 0 || !phoneNumber}
                        className="w-full h-16 bg-[#3F51B5] hover:bg-[#303F9F] text-white rounded-4xl font-black text-sm uppercase flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 animate-pulse-glow"
                    >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                        <span>{t('action_button')}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
