'use client';

/**
 * @fileOverview Ndara Wallet Étudiant V5 - Design Fintech Elite.
 * ✅ REAL-TIME : Connecté à Firestore (Balance & Transactions).
 * ✅ INTERACTION : Sélecteur de pays optimisé via ShadCN pour mobile.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { 
    Smartphone, 
    Loader2, 
    History, 
    ArrowDownLeft, 
    ShoppingBag as ShoppingBagIcon,
    Wifi,
    CreditCard,
    HelpCircle,
    Plus,
    Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, Country } from '@/lib/types';

const PRESET_AMOUNTS = [2500, 5000, 10000, 25000];

export default function NdaraWalletPage() {
    const { user, currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const router = useRouter();
    const locale = useLocale();
    const { toast } = useToast();
    
    // --- ÉTATS RÉELS (LIVE) ---
    const [liveBalance, setLiveBalance] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<Payment[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    
    // --- ÉTATS UI ---
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedAmount, setSelectedAmount] = useState<number>(5000);
    const [customAmount, setCustomAmount] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedCountryId, setSelectedCountryId] = useState<string>('');

    // 1. Écouteur direct du solde (Ultra-réactif)
    useEffect(() => {
        if (!user?.uid) return;
        const userRef = doc(db, 'users', user.uid);
        const unsub = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                setLiveBalance(snap.data().balance || 0);
            }
            setIsLoadingInitial(false);
        });
        return () => unsub();
    }, [user?.uid, db]);

    // 2. Écouteur des transactions
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

    // 3. Charger les configurations pays (Liste stable)
    useEffect(() => {
        const q = query(collection(db, 'countries'), where('active', '==', true), orderBy('name'));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Country));
            setCountries(list);
        });
        return () => unsub();
    }, [db]);

    // 4. Initialisation de la sélection par défaut (Une seule fois au chargement)
    useEffect(() => {
        if (countries.length > 0 && !selectedCountryId) {
            const userCountry = countries.find(c => c.code === currentUser?.countryCode);
            setSelectedCountryId(userCountry?.id || countries[0].id);
        }
    }, [countries, currentUser?.countryCode, selectedCountryId]);

    const activeCountry = useMemo(() => countries.find(c => c.id === selectedCountryId), [countries, selectedCountryId]);
    const availableMethods = useMemo(() => (activeCountry?.paymentMethods || []).filter(m => m.active), [activeCountry]);
    
    // Auto-sélection de la première méthode si le pays change
    useEffect(() => {
        if (availableMethods.length > 0) {
            setSelectedMethodId(availableMethods[0].id);
        } else {
            setSelectedMethodId(null);
        }
    }, [availableMethods]);

    const selectedMethod = useMemo(() => availableMethods.find(m => m.id === selectedMethodId), [availableMethods, selectedMethodId]);
    const hasPendingTx = useMemo(() => transactions.some(t => t.status === 'pending'), [transactions]);

    const handleRecharge = async () => {
        if (!user || selectedAmount <= 0 || !selectedMethodId) {
            toast({ variant: 'destructive', title: "Données manquantes" });
            return;
        }

        setIsProcessing(true);
        try {
            const result = await initiateMeSombPayment({
                amount: selectedAmount,
                phoneNumber: phoneNumber,
                service: selectedMethod?.name.toLowerCase().includes('mtn') ? 'MTN' : 'ORANGE',
                courseId: 'WALLET_RECHARGE',
                userId: user.uid,
                type: 'wallet_topup'
            });

            if (result.success) {
                toast({ title: "Demande envoyée !", description: "Veuillez valider sur votre mobile." });
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

    if (isUserLoading || isLoadingInitial) return <WalletSkeleton />;

    return (
        <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-sans relative text-[#212121]">
            <div className="grain-overlay" />

            <header className="fixed top-0 left-0 right-0 z-50 bg-[#F5F5F5]/95 backdrop-blur-md safe-area-pt border-b border-gray-200">
                <div className="px-6 py-4 flex items-center justify-between">
                    <h1 className="font-black text-xl text-[#212121] tracking-wide">MON PORTEFEUILLE</h1>
                    <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#757575] hover:bg-gray-100 transition shadow-sm">
                        <HelpCircle className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <main className="flex-1 pt-24 pb-48 px-6 space-y-8 animate-in fade-in duration-700">
                
                {/* --- NEO BANK CARD --- */}
                <div className="neo-card rounded-4xl p-8 shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-all">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">Solde Disponible</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className={cn(
                                        "text-white font-black text-5xl tracking-tighter transition-all duration-500",
                                        hasPendingTx && "opacity-50 blur-[1px]"
                                    )}>
                                        {(liveBalance ?? 0).toLocaleString('fr-FR')}
                                    </h2>
                                    <span className="text-lg font-bold text-white/70 uppercase">{activeCountry?.currency || 'FCFA'}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider mb-2">Ndara Wallet</p>
                                <div className="holo-chip w-12 h-9 rounded-lg shadow-xl" />
                            </div>
                        </div>
                        
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-white/70 text-[9px] font-bold uppercase mb-1">Titulaire</p>
                                <p className="text-white font-bold text-sm tracking-wide uppercase">{currentUser?.fullName}</p>
                            </div>
                            <Wifi className="text-white/70 h-6 w-6 rotate-90" />
                        </div>
                    </div>
                </div>

                {/* --- SELECTION PAYS (OPTIMISÉ SHADCN) --- */}
                <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-500">
                    <label className="block text-[#757575] text-[10px] font-bold uppercase mb-2 ml-1">Pays de Résidence</label>
                    <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
                        <SelectTrigger className="w-full h-16 bg-white border-2 border-gray-200 rounded-4xl px-4 text-sm font-bold text-[#212121] shadow-sm focus:ring-0 focus:border-[#3F51B5]">
                            <SelectValue placeholder="Sélectionnez votre pays" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 rounded-2xl shadow-2xl z-[100]">
                            {countries.map(c => (
                                <SelectItem key={c.id} value={c.id} className="py-4 font-bold text-sm">
                                    <span className="mr-3">{c.flagEmoji}</span>
                                    {c.name} ({c.currency})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* --- MODES DE PAIEMENT --- */}
                <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '0.1s' }}>
                    <label className="block text-[#757575] text-[10px] font-bold uppercase mb-3 ml-1">Mode de Paiement</label>
                    <div className="grid grid-cols-3 gap-3">
                        {availableMethods.map(method => (
                            <button 
                                key={method.id}
                                onClick={() => setSelectedMethodId(method.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-3xl border-2 transition-all active:scale-95 shadow-sm",
                                    selectedMethodId === method.id 
                                        ? "border-[#3F51B5] bg-[#3F51B5]/5 scale-105" 
                                        : "border-gray-200 grayscale opacity-60"
                                )}
                            >
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center overflow-hidden">
                                    {method.logo ? (
                                        <img src={method.logo} alt={method.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="text-[#3F51B5] font-black text-xs">
                                            {method.name.includes('Orange') ? 'OM' : method.name.includes('MTN') ? 'MTN' : 'PAY'}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[#212121] text-[10px] font-bold">{method.name}</span>
                            </button>
                        ))}
                        <button className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-3xl border-2 border-gray-200 grayscale opacity-60">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-gray-400" />
                            </div>
                            <span className="text-[#757575] text-[10px] font-bold">Autre</span>
                        </button>
                    </div>
                </div>

                {/* --- MONTANT --- */}
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '0.2s' }}>
                    <label className="block text-[#757575] text-[10px] font-bold uppercase mb-3 ml-1">Montant à Recharger</label>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {PRESET_AMOUNTS.map(val => (
                            <button 
                                key={val}
                                onClick={() => { setSelectedAmount(val); setCustomAmount(''); }}
                                className={cn(
                                    "py-4 rounded-3xl border-2 font-black text-sm transition-all active:scale-95",
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
                            className="w-full h-16 bg-white border-2 border-gray-200 rounded-4xl px-4 text-[#212121] font-bold text-sm focus:ring-0 focus:border-[#3F51B5] shadow-sm"
                            value={customAmount}
                            onChange={(e) => {
                                setCustomAmount(e.target.value);
                                setSelectedAmount(Number(e.target.value) || 0);
                            }}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#757575] text-sm font-bold">{activeCountry?.currency || 'FCFA'}</div>
                    </div>
                </div>

                {/* --- NUMERO --- */}
                <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '0.25s' }}>
                    <label className="block text-[#757575] text-[10px] font-bold uppercase mb-2 ml-1">Numéro Mobile Money</label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#3F51B5] border border-gray-100">
                            <Smartphone size={18} />
                        </div>
                        <input 
                            type="tel"
                            placeholder="Numéro sans indicatif"
                            className="w-full h-16 pl-16 rounded-4xl bg-white border-2 border-gray-200 font-mono text-lg text-[#212121] focus:outline-none focus:border-[#3F51B5]"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                    </div>
                </div>

                {/* --- HISTORIQUE (VINTAGE RECEIPTS) --- */}
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center justify-between px-1">
                        <h2 className="font-black text-[#212121] text-sm uppercase tracking-wide flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-[#3F51B5]" />
                            Historique
                        </h2>
                        <button className="text-[#3F51B5] text-[10px] font-bold hover:text-[#303F9F] transition">VOIR TOUT</button>
                    </div>

                    <div className="space-y-4">
                        {transactions.map(txn => {
                            const date = txn.date && (txn.date as any).toDate ? (txn.date as any).toDate() : new Date();
                            return (
                                <div key={txn.id} className="vintage-receipt rounded-3xl p-5 shadow-sm active:scale-[0.98] transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center",
                                                txn.amount > 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                            )}>
                                                {txn.amount > 0 ? <ArrowDownLeft size={20} /> : <ShoppingBagIcon size={20} />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-[#212121] text-[13px] uppercase truncate max-w-[140px]">
                                                    {txn.courseTitle || 'Transaction'}
                                                </p>
                                                <p className="text-[#757575] text-[10px] font-mono mt-0.5">
                                                    {format(date, 'dd MMM • HH:mm', { locale: fr })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(
                                                "font-mono font-black text-base leading-none mb-1",
                                                txn.amount > 0 ? "text-emerald-600" : "text-red-500"
                                            )}>
                                                {txn.amount > 0 ? `+${txn.amount.toLocaleString()}` : txn.amount.toLocaleString()} F
                                            </p>
                                            <span className={cn(
                                                "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                                                txn.status === 'completed' ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600 animate-pulse"
                                            )}>
                                                {txn.status === 'completed' ? 'Succès' : 'Audit'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="border-t-2 border-dashed border-gray-200 pt-2">
                                        <p className="text-[#757575] text-[8px] font-mono uppercase truncate">REF: {txn.id}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {transactions.length === 0 && (
                            <div className="py-16 text-center opacity-20">
                                <History size={48} className="mx-auto mb-4 text-slate-400" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Aucun mouvement</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Sticky Action Button */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F5F5F5] via-[#F5F5F5] to-transparent z-40 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="max-w-md mx-auto">
                    <Button 
                        onClick={handleRecharge}
                        disabled={isProcessing || selectedAmount <= 0 || !selectedMethodId || phoneNumber.length < 8}
                        className="w-full h-16 rounded-4xl bg-[#3F51B5] hover:bg-[#303F9F] text-white font-black uppercase text-sm tracking-widest shadow-2xl shadow-[#3F51B5]/30 transition-all active:scale-95 border-none"
                    >
                        {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <><CreditCard size={20} className="mr-3" /> Lancer la Transaction</>}
                    </Button>
                </div>
            </div>

            <style jsx global>{`
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
                    background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 75%);
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
                .vintage-receipt::before,
                .vintage-receipt::after {
                    content: '';
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background: #F5F5F5;
                    border-radius: 50%;
                }
                .vintage-receipt::before { left: -11px; top: 50%; transform: translateY(-50%); }
                .vintage-receipt::after { right: -11px; top: 50%; transform: translateY(-50%); }
            `}</style>
        </div>
    );
}

function WalletSkeleton() {
    return (
        <div className="p-6 space-y-8 pt-32 bg-[#F5F5F5] min-h-screen">
            <Skeleton className="h-56 w-full rounded-4xl bg-slate-200" />
            <Skeleton className="h-16 w-full rounded-4xl bg-slate-200" />
            <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-20 bg-slate-200 rounded-3xl" />
                <Skeleton className="h-20 bg-slate-200 rounded-3xl" />
                <Skeleton className="h-20 bg-slate-200 rounded-3xl" />
            </div>
        </div>
    );
}
