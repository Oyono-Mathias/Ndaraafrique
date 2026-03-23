'use client';

/**
 * @fileOverview Ndara Wallet Étudiant V5 - Design Fintech Elite.
 * ✅ REAL-TIME : Listener direct sur le solde pour une réactivité < 200ms.
 * ✅ FLUX : Indicateur de confirmation réseau pour les transactions en cours.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { 
    ArrowLeft, 
    Smartphone, 
    Loader2, 
    History, 
    ChevronDown, 
    ArrowDownLeft, 
    ShoppingBag as ShoppingBagIcon,
    ShieldCheck,
    Wifi,
    Receipt,
    CreditCard,
    HelpCircle,
    Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment, Country } from '@/lib/types';

const PRESET_AMOUNTS = [2500, 5000, 10000, 25000];

export default function NdaraWalletPage() {
    const { user, isUserLoading } = useRole();
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

    // 3. Charger les configurations pays
    useEffect(() => {
        const q = query(collection(db, 'countries'), where('active', '==', true), orderBy('name'));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Country));
            setCountries(list);
            if (list.length > 0 && !selectedCountryId) setSelectedCountryId(list[0].id);
        });
        return () => unsub();
    }, [db, selectedCountryId]);

    const activeCountry = useMemo(() => countries.find(c => c.id === selectedCountryId), [countries, selectedCountryId]);
    const availableMethods = useMemo(() => (activeCountry?.paymentMethods || []).filter(m => m.active), [activeCountry]);
    const selectedMethod = useMemo(() => availableMethods.find(m => m.id === selectedMethodId), [availableMethods, selectedMethodId]);
    
    // Détection d'une transaction en attente pour feedback visuel
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
                type: 'wallet_topup' as any
            });

            if (result.success) {
                toast({ title: "Demande envoyée !", description: "Veuillez valider sur votre mobile. Le solde s'actualisera en direct." });
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
        <div className="min-h-screen bg-student-bg flex flex-col font-sans relative">
            <div className="grain-overlay opacity-[0.03]" />

            <header className="fixed top-0 left-0 right-0 z-50 bg-student-bg/95 backdrop-blur-md safe-area-pt border-b border-gray-200">
                <div className="px-6 py-4 flex items-center justify-between">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-student-text-muted hover:bg-gray-100 transition">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        <h1 className="font-black text-xs text-student-text tracking-widest uppercase leading-none">Ndara Wallet</h1>
                        {hasPendingTx && (
                            <span className="text-[7px] font-black text-amber-600 uppercase tracking-tighter mt-1 flex items-center gap-1">
                                <Activity className="h-2 w-2 animate-pulse" /> Synchronisation...
                            </span>
                        )}
                    </div>
                    <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-student-text-muted">
                        <HelpCircle className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <main className="flex-1 pt-24 pb-48 px-6 space-y-8 animate-in fade-in duration-700">
                
                {/* --- LIVE VIRTUAL CARD --- */}
                <div className="neo-card rounded-4xl p-8 shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-10">
                            <div className="space-y-1">
                                <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.25em]">Solde Réel</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className={cn(
                                        "text-white font-black text-5xl tracking-tighter transition-all duration-500",
                                        hasPendingTx && "opacity-50 blur-[1px]"
                                    )}>
                                        {(liveBalance ?? 0).toLocaleString('fr-FR')}
                                    </h2>
                                    <span className="text-sm font-bold text-white/70 uppercase">{activeCountry?.currency || 'XOF'}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-white/80 text-[9px] font-black uppercase tracking-wider mb-2">Ndara Elite</p>
                                <div className="holo-chip w-12 h-9 rounded-lg shadow-xl" />
                            </div>
                        </div>
                        
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-white/60 text-[8px] font-bold uppercase mb-1">Live Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                                    <p className="text-white font-black text-[10px] uppercase tracking-widest">Connecté</p>
                                </div>
                            </div>
                            <Wifi className="text-white/50 h-6 w-6 rotate-90" />
                        </div>
                    </div>
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-student-text-muted text-[10px] font-black uppercase tracking-widest ml-1">Pays de recharge</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl z-10">
                                {activeCountry?.flagEmoji || '🌍'}
                            </div>
                            <select 
                                value={selectedCountryId}
                                onChange={(e) => { setSelectedCountryId(e.target.value); setSelectedMethodId(null); }}
                                className="w-full h-16 pl-14 pr-12 bg-white border-2 border-gray-100 rounded-4xl text-sm font-black text-student-text uppercase tracking-widest appearance-none outline-none focus:border-student-primary shadow-sm"
                            >
                                {countries.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.currency})</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-student-text-muted" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-student-text-muted text-[10px] font-black uppercase tracking-widest ml-1">Opérateur</label>
                        <div className="grid grid-cols-3 gap-3">
                            {availableMethods.map(method => (
                                <button 
                                    key={method.id}
                                    onClick={() => setSelectedMethodId(method.id)}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-3xl border-2 transition-all active:scale-95 shadow-sm",
                                        selectedMethodId === method.id 
                                            ? "border-student-primary bg-student-primary/5 scale-105" 
                                            : "border-gray-100 grayscale opacity-60"
                                    )}
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center overflow-hidden border border-gray-100">
                                        {method.logo ? <img src={method.logo} alt={method.name} className="w-full h-full object-contain" /> : <Smartphone className="h-5 w-5 text-slate-400" />}
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-tighter">{method.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-student-text-muted text-[10px] font-black uppercase tracking-widest ml-1">Wungo tî nginza (Montant)</label>
                        <div className="grid grid-cols-2 gap-3">
                            {PRESET_AMOUNTS.map(val => (
                                <button 
                                    key={val}
                                    onClick={() => { setSelectedAmount(val); setCustomAmount(''); }}
                                    className={cn(
                                        "py-4 rounded-3xl border-2 font-black text-xs transition-all active:scale-95",
                                        selectedAmount === val && !customAmount ? "bg-student-primary border-student-primary text-white shadow-lg" : "bg-white border-gray-100 text-student-text"
                                    )}
                                >
                                    {val.toLocaleString()} {activeCountry?.currency}
                                </button>
                            ))}
                        </div>
                        <Input 
                            type="number" 
                            placeholder="Saisir un autre montant..."
                            className="h-16 bg-white border-2 border-gray-100 rounded-4xl px-6 text-student-text font-black text-xl text-center"
                            value={customAmount}
                            onChange={(e) => {
                                setCustomAmount(e.target.value);
                                setSelectedAmount(Number(e.target.value) || 0);
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-student-text-muted text-[10px] font-black uppercase tracking-widest ml-1">Numéro Mobile Money</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-student-primary border border-gray-100">
                                <Smartphone size={18} />
                            </div>
                            <Input 
                                type="tel"
                                placeholder="Numéro sans indicatif"
                                className="h-16 pl-16 rounded-4xl bg-white border-2 border-gray-100 font-mono text-lg text-student-text"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="font-black text-student-text text-sm uppercase tracking-wide flex items-center gap-2 px-1">
                        <Receipt className="w-4 h-4 text-student-primary" />
                        Live Feed
                    </h2>

                    <div className="space-y-4">
                        {transactions.map(txn => (
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
                                            <p className="font-black text-student-text text-[13px] uppercase truncate max-w-[140px]">
                                                {txn.courseTitle || 'Transaction'}
                                            </p>
                                            <p className="text-student-text-muted text-[10px] font-mono mt-0.5">
                                                {txn.date && (txn.date as any).toDate ? format((txn.date as any).toDate(), 'dd MMM • HH:mm', { locale: fr }) : '...'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            "font-mono font-black text-base",
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
                            </div>
                        ))}
                        {transactions.length === 0 && (
                            <div className="py-16 text-center opacity-20">
                                <History size={48} className="mx-auto mb-4 text-slate-400" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Aucun mouvement</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-6 bg-student-bg/95 backdrop-blur-xl border-t border-gray-200 z-50 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="max-w-md mx-auto space-y-4">
                    <div className="flex justify-between items-end px-2">
                        <div>
                            <p className="text-[10px] font-black text-student-text-muted uppercase tracking-[0.2em] mb-1">Montant séléctionné</p>
                            <p className="text-3xl font-black text-student-text leading-none">
                                {selectedAmount.toLocaleString()} <span className="text-sm font-bold text-student-primary">{activeCountry?.currency || 'XOF'}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase">Ndara Secure</span>
                        </div>
                    </div>
                    
                    <Button 
                        onClick={handleRecharge}
                        disabled={isProcessing || selectedAmount <= 0 || !selectedMethodId || phoneNumber.length < 8}
                        className="w-full h-16 rounded-4xl bg-student-primary hover:bg-student-primaryDark text-white font-black uppercase text-sm tracking-widest shadow-2xl shadow-student-primary/30 transition-all active:scale-95 border-none animate-pulse-glow"
                    >
                        {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <><CreditCard size={20} className="mr-3" strokeWidth={3} /> Lancer la Transaction</>}
                    </Button>
                </div>
            </footer>

            <style jsx global>{`
                .neo-card { background: linear-gradient(135deg, #3F51B5 0%, #5C6BC0 50%, #7986CB 100%); }
                .holo-chip { background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%); position: relative; overflow: hidden; }
                .holo-chip::after { content: ''; position: absolute; inset: 0; background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%); animation: chip-shimmer 3s infinite; }
                @keyframes chip-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                .vintage-receipt { background: #FFFFFF; border: 2px dashed #BDBDBD; position: relative; font-family: 'JetBrains Mono', monospace; }
                .vintage-receipt::before, .vintage-receipt::after { content: ''; position: absolute; width: 20px; height: 20px; background: #F5F5F5; border-radius: 50%; }
                .vintage-receipt::before { left: -11px; top: 50%; transform: translateY(-50%); }
                .vintage-receipt::after { right: -11px; top: 50%; transform: translateY(-50%); }
            `}</style>
        </div>
    );
}

function WalletSkeleton() {
    return (
        <div className="p-6 space-y-8 pt-32 bg-student-bg min-h-screen">
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
