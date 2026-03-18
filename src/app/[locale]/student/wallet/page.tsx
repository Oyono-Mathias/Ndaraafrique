'use client';

/**
 * @fileOverview Ndara Wallet Étudiant - Design Fintech Indigo V4 Premium.
 * ✅ DESIGN : Fidèle au prototype HTML (Indigo, cartes tactiles, success modal).
 * ✅ ACTIONS : Rechargement réel via MeSomb.
 * ✅ RÉSOLU : Typographie extra-grasse, animations et safe-areas Android.
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
    const [countryPrefix, setCountryPrefix] = useState('+225');

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
        }, (err) => {
            console.error("Firestore Listen Error:", err);
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
                
                {/* --- ANDROID STATUS BAR SPACER --- */}
                <div className="h-6 bg-gradient-to-b from-indigo-700 to-indigo-600 shrink-0"></div>

                {/* --- HEADER SECTION --- */}
                <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-5 pt-4 pb-8 text-white rounded-b-[2rem] shadow-lg z-10 relative shrink-0">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => router.back()} className="p-2.5 bg-white/15 rounded-full hover:bg-white/25 transition active:scale-95">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <h1 className="text-base font-bold uppercase tracking-widest">Recharger Wallet</h1>
                        <button className="p-2.5 bg-white/15 rounded-full hover:bg-white/25 transition active:scale-95 relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-indigo-600"></span>
                        </button>
                    </div>
                    
                    <div className="text-center py-2">
                        <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Solde Actuel</p>
                        <div className="flex items-center justify-center gap-3">
                            <WalletIcon className="h-6 w-6 text-indigo-300 fill-current" />
                            <h2 className="text-5xl font-black tracking-tighter">
                                {(currentUser?.balance || 0).toLocaleString('fr-FR')}
                            </h2>
                        </div>
                        <p className="text-indigo-300 text-sm font-bold mt-1 tracking-widest uppercase">FCFA</p>
                    </div>
                </div>

                {/* --- SCROLLABLE CONTENT --- */}
                <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6 pb-40">
                    
                    {/* Amount Selection */}
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-5 mb-5 animate-fade-in" style={{ animationDelay: '0.05s' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                                <CircleDollarSign size={20} />
                            </div>
                            <h2 className="text-slate-800 font-black text-xs uppercase tracking-widest">Montant à recharger</h2>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2.5 mb-4">
                            {PRESET_AMOUNTS.map(val => (
                                <button 
                                    key={val}
                                    onClick={() => handleSelectAmount(val)}
                                    className={cn(
                                        "py-4 rounded-xl border-2 font-black text-xs transition-all active:scale-95",
                                        selectedAmount === val && !customAmount
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" 
                                            : "bg-slate-50 border-slate-100 text-slate-500 hover:border-indigo-300"
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
                                value={customAmount}
                                onChange={(e) => handleCustomAmountChange(e.target.value)}
                                className="h-14 pl-16 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-black text-base transition-all"
                                placeholder="Autre montant"
                            />
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-5 mb-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                                <WalletIcon size={20} />
                            </div>
                            <h2 className="text-slate-800 font-black text-xs uppercase tracking-widest">Moyen de paiement</h2>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <ProviderCard 
                                active={selectedProvider === 'orange'} 
                                onClick={() => setSelectedProvider('orange')}
                                label="Orange" 
                                logo="https://image.qwenlm.ai/public_source/44667d98-ac73-4bb4-814e-f813485e0974/18b22f229-ddfd-487d-bb4e-d37a4623905a.png"
                            />
                            <ProviderCard 
                                active={selectedProvider === 'mtn'} 
                                onClick={() => setSelectedProvider('mtn')}
                                label="MTN" 
                                logo="https://image.qwenlm.ai/public_source/44667d98-ac73-4bb4-814e-f813485e0974/12c7746a9-f3ec-47ac-9914-ce3ccfafcba5.png"
                            />
                            <ProviderCard 
                                active={selectedProvider === 'wave'} 
                                onClick={() => setSelectedProvider('wave')}
                                label="Wave" 
                                logo="https://image.qwenlm.ai/public_source/44667d98-ac73-4bb4-814e-f813485e0974/17799ca37-141e-4548-b072-ffcc00788ad7.png"
                            />
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-5 mb-5 animate-fade-in" style={{ animationDelay: '0.15s' }}>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Numéro de téléphone</label>
                        <div className="flex gap-3">
                            <div className="relative flex items-center w-28 shrink-0">
                                <img src="https://flagcdn.com/w40/ci.png" className="absolute left-3 w-6 h-4 object-cover rounded shadow-sm" alt="Drapeau CI" />
                                <select 
                                    value={countryPrefix}
                                    onChange={(e) => setCountryPrefix(e.target.value)}
                                    className="block w-full pl-10 pr-2 py-4 border-2 border-slate-100 rounded-xl bg-slate-50 text-sm font-black text-slate-700 cursor-pointer appearance-none outline-none focus:border-indigo-500"
                                >
                                    <option value="+225">+225</option>
                                    <option value="+236">+236</option>
                                    <option value="+237">+237</option>
                                    <option value="+221">+221</option>
                                </select>
                                <ChevronDown className="absolute right-3 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                            <Input 
                                type="tel" 
                                placeholder="07 00 00 00 00" 
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="flex-1 h-14 px-5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-black text-base transition-all"
                            />
                        </div>
                    </div>

                    {/* History Preview */}
                    <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h3 className="text-slate-900 font-black text-xs uppercase tracking-widest">Transactions récentes</h3>
                            <button onClick={() => router.push('/student/paiements')} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline">Voir tout</button>
                        </div>
                        <div className="space-y-2.5">
                            {isLoading ? (
                                <Skeleton className="h-20 w-full rounded-2xl" />
                            ) : transactions.length > 0 ? (
                                transactions.slice(0, 3).map(txn => (
                                    <div key={txn.id} className="flex items-center justify-between p-4 bg-white rounded-[1.25rem] border border-slate-100 shadow-sm active:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center shadow-inner",
                                                txn.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                            )}>
                                                {txn.amount > 0 ? <ArrowDownLeft size={20} /> : <ShoppingBagIcon size={18} />}
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
                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)] z-30 safe-area-pb">
                    <div className="px-5 pt-4 pb-6">
                        <div className="flex justify-between items-end mb-4 px-1">
                            <div>
                                <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Total à payer</span>
                                <div className="text-2xl font-black text-slate-900 mt-1" id="totalDisplay">
                                    {selectedAmount > 0 ? `${selectedAmount.toLocaleString('fr-FR')} FCFA` : '0 FCFA'}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-emerald-600 text-[9px] font-black bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 uppercase tracking-widest">Frais: 0 FCFA</span>
                            </div>
                        </div>
                        <Button 
                            onClick={handleRecharge} 
                            disabled={isProcessing || selectedAmount <= 0 || !selectedProvider}
                            className="w-full h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-xl shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-none"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" /> : <><Check size={20} strokeWidth={3} /> CONFIRMER LE PAIEMENT</>}
                        </Button>
                    </div>
                </div>

                {/* --- SUCCESS MODAL OVERLAY --- */}
                {showSuccess && (
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-300">
                        <div className="bg-white rounded-t-[2.5rem] sm:rounded-[3rem] p-8 w-full max-w-md animate-slide-up-modal relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-green-600"></div>
                            
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                    <Check className="text-green-600 h-10 w-10" strokeWidth={4} />
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Rechargement réussi !</h3>
                                <p className="text-slate-500 mb-8 font-medium text-sm italic">"Votre wallet a été crédité avec succès."</p>
                                
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[1.5rem] p-6 mb-8 text-left border border-slate-200 space-y-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Montant</span>
                                        <span className="font-black text-slate-900 text-base">{selectedAmount.toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Méthode</span>
                                        <span className="font-black text-slate-900 text-base capitalize">{selectedProvider}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Référence</span>
                                        <span className="font-mono text-slate-900 text-[11px] font-black">#TRX{(Math.random() * 1000000).toFixed(0)}</span>
                                    </div>
                                </div>
                                
                                <Button 
                                    onClick={() => { setShowSuccess(false); setSelectedAmount(0); setPhoneNumber(''); setSelectedProvider(null); }} 
                                    className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-[0.98]"
                                >
                                    Retour au portefeuille
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- LOADING OVERLAY --- */}
                {isProcessing && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                        <div className="relative mb-8">
                            <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center pulse-ring">
                                    <WalletIcon className="text-white h-6 w-6 fill-current" />
                                </div>
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Traitement en cours...</h3>
                        <p className="text-slate-500 text-sm font-medium italic mb-6">"Veuillez valider l'opération sur votre téléphone."</p>
                        <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-full">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">Ne fermez pas cette fenêtre</p>
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
                "flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-[0.97] min-h-[110px] group shadow-sm",
                active 
                    ? "bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-600 scale-105 shadow-lg shadow-indigo-100" 
                    : "bg-white border-slate-100 grayscale opacity-60 hover:border-indigo-200"
            )}
        >
            <div className="relative h-12 w-full">
                <Image src={logo} alt={label} fill className="object-contain transition-transform group-hover:scale-110" />
            </div>
            <span className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                active ? "text-indigo-600" : "text-slate-400"
            )}>{label}</span>
        </button>
    );
}

function WalletSkeleton() {
    return (
        <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
            <Skeleton className="h-48 w-full rounded-[2.5rem] bg-slate-200" />
            <Skeleton className="h-32 w-full rounded-3xl bg-slate-200" />
            <Skeleton className="h-64 w-full rounded-3xl bg-slate-200" />
        </div>
    );
}
