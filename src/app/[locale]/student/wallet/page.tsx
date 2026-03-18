'use client';

/**
 * @fileOverview Ndara Wallet Étudiant - Design Fintech Indigo V2.
 * ✅ DESIGN : Fidèle au prototype HTML (Indigo, cartes tactiles, ticket de caisse).
 * ✅ ACTIONS : Rechargement réel via MeSomb.
 */

import { useRole } from '@/context/RoleContext';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    User, 
    Bell, 
    ArrowDownLeft, 
    ArrowUpRight, 
    Smartphone, 
    Check, 
    Loader2, 
    ArrowRight,
    ShoppingBag,
    History,
    Wallet as WalletIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Payment } from '@/lib/types';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

const PRESET_AMOUNTS = [1000, 2000, 5000];

export default function NdaraWalletPage() {
    const { currentUser, isUserLoading, user } = useRole();
    const db = getFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const [transactions, setTransactions] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    const [selectedAmount, setSelectedAmount] = useState<number>(0);
    const [customAmount, setCustomAmount] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<'orange' | 'mtn' | 'wave' | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [countryPrefix, setCountryPrefix] = useState('+236');

    // Écoute de l'historique financier
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

    const handleSelectAmount = (val: number) => {
        setSelectedAmount(val);
        setCustomAmount('');
    };

    const handleCustomAmountChange = (val: string) => {
        setCustomAmount(val);
        setSelectedAmount(val ? parseInt(val) : 0);
    };

    const handleRecharge = async () => {
        if (!user || selectedAmount <= 0 || !selectedProvider || phoneNumber.length < 8) {
            toast({ variant: 'destructive', title: "Données incomplètes", description: "Vérifiez le montant, l'opérateur et le numéro." });
            return;
        }

        setIsProcessing(true);
        try {
            const service = selectedProvider === 'orange' ? 'ORANGE' : 'MTN';
            const result = await initiateMeSombPayment({
                amount: selectedAmount,
                phoneNumber: phoneNumber,
                service: service as any,
                courseId: 'WALLET_RECHARGE',
                userId: user.uid,
                type: 'wallet_topup' as any
            });

            if (result.success) {
                if (result.transactionId === "SUCCESS" || result.transactionId === "SIMULATED") {
                    setShowSuccess(true);
                } else {
                    toast({ title: "Demande envoyée !", description: "Veuillez valider sur votre téléphone." });
                }
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-0 sm:p-4 font-sans">
            <div className="bg-white w-full max-w-md shadow-2xl overflow-hidden relative min-h-screen sm:min-h-[850px] flex flex-col sm:rounded-[3rem]">
                
                {/* --- HEADER INDIGO --- */}
                <div className="bg-indigo-600 p-6 pt-12 text-white rounded-b-[2.5rem] shadow-lg z-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/50 flex items-center justify-center border-2 border-indigo-400 shadow-inner">
                                <User className="text-white h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] text-indigo-200 uppercase font-black tracking-widest">Bonjour,</p>
                                <p className="font-bold text-sm uppercase">{currentUser?.fullName?.split(' ')[0]}</p>
                            </div>
                        </div>
                        <button className="p-2.5 bg-indigo-500/50 rounded-full hover:bg-indigo-400 transition shadow-md">
                            <Bell size={18} />
                        </button>
                    </div>
                    
                    <div className="text-center mb-4 relative z-10">
                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-[0.2em] mb-2 opacity-80">Solde Actuel</p>
                        <h1 className="text-5xl font-black tracking-tighter">
                            {(currentUser?.balance || 0).toLocaleString('fr-FR')} <span className="text-lg font-medium opacity-60">FCFA</span>
                        </h1>
                    </div>
                </div>

                {/* --- SCROLLABLE CONTENT --- */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-6 pb-40 relative -mt-6 z-0 bg-white rounded-t-[2.5rem]">
                    
                    {/* Amount Selection */}
                    <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <h2 className="text-slate-800 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                            Montant à recharger
                        </h2>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            {PRESET_AMOUNTS.map(val => (
                                <button 
                                    key={val}
                                    onClick={() => handleSelectAmount(val)}
                                    className={cn(
                                        "py-4 rounded-2xl border-2 font-black text-xs transition-all active:scale-95 shadow-sm",
                                        selectedAmount === val && !customAmount
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-200" 
                                            : "bg-slate-50 border-slate-100 text-slate-500 hover:border-indigo-200"
                                    )}
                                >
                                    {val.toLocaleString()}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="text-slate-400 font-bold text-xs">FCFA</span>
                            </div>
                            <Input 
                                type="number" 
                                placeholder="Autre montant" 
                                value={customAmount}
                                onChange={(e) => handleCustomAmountChange(e.target.value)}
                                className="h-14 pl-14 pr-12 bg-slate-50 border-slate-100 rounded-2xl text-slate-900 font-black text-base focus-visible:ring-indigo-500"
                            />
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <span className="text-slate-400 text-[10px] font-bold uppercase">Min 500</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                        <h2 className="text-slate-800 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                            Moyen de paiement
                        </h2>
                        <div className="grid grid-cols-3 gap-3">
                            <ProviderCard 
                                active={selectedProvider === 'orange'} 
                                onClick={() => setSelectedProvider('orange')}
                                label="Orange" 
                                logo="https://image.qwenlm.ai/public_source/44667d98-ac73-4bb4-814e-f813485e0974/1b101b06f-f395-4e75-b731-584a462178e9.png"
                            />
                            <ProviderCard 
                                active={selectedProvider === 'mtn'} 
                                onClick={() => setSelectedProvider('mtn')}
                                label="MTN" 
                                logo="https://image.qwenlm.ai/public_source/44667d98-ac73-4bb4-814e-f813485e0974/138af1ab9-d75d-4eaf-9777-fb56d6dc6b99.png"
                            />
                            <ProviderCard 
                                active={selectedProvider === 'wave'} 
                                onClick={() => setSelectedProvider('wave')}
                                label="Wave" 
                                logo="https://image.qwenlm.ai/public_source/44667d98-ac73-4bb4-814e-f813485e0974/1bf87fca6-9f32-44b7-8212-132689d013ee.png"
                            />
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Numéro de téléphone</label>
                        <div className="flex space-x-2">
                            <div className="relative flex items-center w-28 flex-shrink-0">
                                <select 
                                    value={countryPrefix}
                                    onChange={(e) => setCountryPrefix(e.target.value)}
                                    className="block w-full pl-4 pr-8 py-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-black text-slate-700 appearance-none focus:outline-none focus:border-indigo-500 transition-all"
                                >
                                    <option value="+236">🇨🇫 +236</option>
                                    <option value="+237">🇨🇲 +237</option>
                                    <option value="+225">🇨🇮 +225</option>
                                    <option value="+221">🇸🇳 +221</option>
                                </select>
                                <div className="absolute right-3 pointer-events-none text-slate-400">
                                    <ArrowRight size={14} className="rotate-90" />
                                </div>
                            </div>
                            <Input 
                                type="tel" 
                                placeholder="07 00 00 00 00" 
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="flex-1 h-14 px-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-black text-base focus-visible:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* History Preview */}
                    <div className="animate-in fade-in duration-700 delay-300">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h2 className="text-slate-800 font-black text-xs uppercase tracking-widest">Derniers flux</h2>
                            <button onClick={() => router.push('/student/paiements')} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline">Voir tout</button>
                        </div>
                        
                        <div className="space-y-3">
                            {isLoading ? (
                                <Skeleton className="h-20 w-full rounded-2xl" />
                            ) : transactions.length > 0 ? (
                                transactions.slice(0, 3).map(txn => (
                                    <div key={txn.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                                        <div className="flex items-center space-x-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center shadow-inner",
                                                txn.amount > 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                            )}>
                                                {txn.amount > 0 ? <ArrowDownLeft size={20} /> : <ShoppingBag size={18} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-[150px]">
                                                    {txn.metadata?.type === 'wallet_topup' ? 'Rechargement' : (txn.courseTitle || 'Achat')}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                    {txn.date && typeof (txn.date as any).toDate === 'function' ? format((txn.date as any).toDate(), 'dd MMM, HH:mm', { locale: fr }) : '...'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "text-sm font-black",
                                            txn.amount > 0 ? "text-emerald-600" : "text-slate-900"
                                        )}>
                                            {txn.amount > 0 ? '+' : '-'}{Math.abs(txn.amount).toLocaleString()}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 opacity-20">
                                    <History size={40} className="mx-auto mb-2 text-slate-400" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Aucune transaction</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- BOTTOM ACTION BAR --- */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20 safe-area-pb">
                    <div className="flex justify-between items-center mb-5 px-1">
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total à payer</span>
                        <span className={cn(
                            "text-2xl font-black transition-colors",
                            selectedAmount > 0 ? "text-slate-900" : "text-slate-300"
                        )}>
                            {selectedAmount.toLocaleString('fr-FR')} <span className="text-sm">FCFA</span>
                        </span>
                    </div>
                    <Button 
                        onClick={handleRecharge} 
                        disabled={isProcessing || selectedAmount <= 0 || !selectedProvider}
                        className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-none"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : <><Check size={20} strokeWidth={3} /> RECHARGER MAINTENANT</>}
                    </Button>
                </div>

                {/* --- OVERLAYS --- */}
                {isProcessing && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                        <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Traitement Sécurisé</h3>
                        <p className="text-slate-500 text-sm mt-2 font-medium italic">Veuillez valider l'opération sur votre téléphone.</p>
                    </div>
                )}

                {showSuccess && (
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md z-[60] flex items-center justify-center p-6 animate-in fade-in duration-500">
                        <div className="bg-white rounded-[3rem] p-10 w-full max-w-xs text-center shadow-2xl animate-in zoom-in duration-700">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                                <Check className="text-emerald-600 h-10 w-10" strokeWidth={4} />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Succès !</h3>
                            <p className="text-slate-500 text-sm mb-8 font-medium">Votre wallet a été crédité instantanément.</p>
                            
                            <div className="bg-slate-50 rounded-3xl p-5 mb-8 text-left space-y-3 border border-slate-100">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-400">Montant</span>
                                    <span className="text-slate-900">{selectedAmount.toLocaleString()} F</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-400">Méthode</span>
                                    <span className="text-indigo-600">{selectedProvider}</span>
                                </div>
                            </div>
                            
                            <Button 
                                onClick={() => { setShowSuccess(false); setSelectedAmount(0); setPhoneNumber(''); }} 
                                className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                            >
                                Terminer
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ProviderCard({ active, onClick, label, logo }: { active: boolean, onClick: () => void, label: string, logo: string }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center gap-3 p-4 rounded-3xl border-2 transition-all active:scale-95 shadow-sm",
                active 
                    ? "bg-indigo-50 border-indigo-600 scale-105 shadow-indigo-100" 
                    : "bg-white border-slate-50 hover:border-indigo-100 grayscale opacity-60"
            )}
        >
            <div className="relative h-10 w-10">
                <Image src={logo} alt={label} fill className="object-contain" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{label}</span>
        </button>
    );
}

function WalletSkeleton() {
    return (
        <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
            <Skeleton className="h-48 w-full rounded-[2.5rem]" />
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
    );
}
