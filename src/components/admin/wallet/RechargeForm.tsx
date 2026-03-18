'use client';

/**
 * @fileOverview Formulaire de recharge sécurisé (Design Fintech Android).
 */

import { useState, useMemo, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { rechargeUserWallet } from '@/actions/userActions';
import { useToast } from '@/hooks/use-toast';
import { 
    Search, 
    User, 
    Check, 
    Loader2, 
    ArrowRight, 
    Smartphone, 
    CheckCircle2, 
    AlertCircle,
    X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { NdaraUser } from '@/lib/types';

const PRESET_AMOUNTS = [5000, 10000, 25000];

export function RechargeForm() {
    const { currentUser: admin } = useRole();
    const { toast } = useToast();
    const db = getFirestore();

    const [searchTerm, setSearchTerm] = useState('');
    const [foundUsers, setFoundUsers] = useState<NdaraUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<NdaraUser | null>(null);
    const [amount, setAmount] = useState<number>(0);
    const [reason, setReason] = useState('Recharge manuelle (Audit Admin)');
    
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Recherche d'utilisateur en temps réel
    useEffect(() => {
        if (searchTerm.length < 3 || selectedUser) return;
        
        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const q = query(
                    collection(db, 'users'),
                    where('email', '>=', searchTerm),
                    where('email', '<=', searchTerm + '\uf8ff'),
                    limit(5)
                );
                const snap = await getDocs(q);
                setFoundUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as NdaraUser)));
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, db, selectedUser]);

    const handleRecharge = async () => {
        if (!admin || !selectedUser || amount <= 0) return;

        setIsSubmitting(true);
        try {
            const result = await rechargeUserWallet({
                userId: selectedUser.uid,
                amount,
                adminId: admin.uid,
                reason
            });

            if (result.success) {
                setShowSuccess(true);
                toast({ title: "Injonction de fonds réussie !" });
            } else {
                toast({ variant: 'destructive', title: "Échec de l'action", description: result.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erreur technique" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setSelectedUser(null);
        setSearchTerm('');
        setAmount(0);
        setShowSuccess(false);
    };

    return (
        <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
            <div className="grain-overlay opacity-[0.03]" />
            
            {/* Header Form */}
            <div className="bg-primary/10 p-8 border-b border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                            <User className="text-primary h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Signataire</p>
                            <p className="text-white font-bold text-sm uppercase">{admin?.fullName?.split(' ')[0] || 'Admin'}</p>
                        </div>
                    </div>
                    <BadgeEuroIcon />
                </div>
                
                <div className="text-center py-2">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Montant à injecter</p>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        {amount.toLocaleString('fr-FR')} <span className="text-lg font-bold text-primary">XOF</span>
                    </h2>
                </div>
            </div>

            <div className="p-8 space-y-8 relative z-10">
                
                {/* 1. SELECTION UTILISATEUR */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bénéficiaire Ndara</label>
                    
                    {selectedUser ? (
                        <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-2xl animate-in zoom-in duration-300">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-primary/30">
                                    <AvatarImage src={selectedUser.profilePictureURL} />
                                    <AvatarFallback className="bg-slate-800 text-slate-500 font-bold">{selectedUser.fullName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="font-bold text-white text-sm truncate uppercase">{selectedUser.fullName}</p>
                                    <p className="text-[10px] text-primary font-black truncate uppercase">Solde: {(selectedUser.balance || 0).toLocaleString()} F</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="p-2 text-slate-500 hover:text-white transition">
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-primary transition-colors" />
                            <Input 
                                placeholder="Email ou nom de l'étudiant..." 
                                className="h-14 pl-12 bg-slate-950 border-white/5 rounded-2xl text-white font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                            
                            {!selectedUser && foundUsers.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                                    {foundUsers.map(user => (
                                        <button 
                                            key={user.uid}
                                            onClick={() => setSelectedUser(user)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                        >
                                            <Avatar className="h-8 w-8"><AvatarImage src={user.profilePictureURL} /></Avatar>
                                            <div className="text-left flex-1 min-w-0">
                                                <p className="text-xs font-bold text-white truncate uppercase">{user.fullName}</p>
                                                <p className="text-[9px] text-slate-500 truncate">{user.email}</p>
                                            </div>
                                            <ArrowRight size={14} className="text-slate-600" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. CHOIX MONTANT */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Volume de la recharge</label>
                    <div className="grid grid-cols-3 gap-2">
                        {PRESET_AMOUNTS.map(val => (
                            <button 
                                key={val}
                                onClick={() => setAmount(val)}
                                className={cn(
                                    "py-3 rounded-xl border font-black text-[10px] tracking-widest transition-all active:scale-95",
                                    amount === val ? "bg-primary text-slate-950 border-primary shadow-lg" : "bg-slate-950 border-white/5 text-slate-500 hover:border-primary/30"
                                )}
                            >
                                {val.toLocaleString()}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <Input 
                            type="number"
                            placeholder="Saisir un autre montant..."
                            className="h-14 bg-slate-950 border-white/5 rounded-2xl text-white font-black text-xl px-6 text-center"
                            onChange={(e) => setAmount(Number(e.target.value))}
                            value={amount || ''}
                        />
                    </div>
                </div>

                {/* 3. MOTIF */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Motif de l'opération</label>
                    <Input 
                        placeholder="Ex: Correction bug, Dépôt physique..."
                        className="h-12 bg-slate-950 border-white/5 rounded-xl text-xs text-slate-300 italic"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>

                <Button 
                    onClick={handleRecharge}
                    disabled={!selectedUser || amount <= 0 || isSubmitting}
                    className="w-full h-16 rounded-[2rem] bg-primary hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-95 animate-pulse-glow border-none"
                >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    Signer la Recharge
                </Button>
            </div>

            {/* Success Overlay */}
            {showSuccess && (
                <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-500">
                    <div className="text-center space-y-6 animate-in zoom-in duration-700">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto border-2 border-primary shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                            <Check className="h-10 w-10 text-primary" strokeWidth={4} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Injection Validée</h3>
                            <p className="text-slate-400 text-sm font-medium italic">Le solde de {selectedUser?.fullName} a été crédité.</p>
                        </div>
                        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 text-left space-y-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                <span className="text-slate-500">Nouveau Solde</span>
                                <span className="text-primary">+ {amount.toLocaleString()} XOF</span>
                            </div>
                        </div>
                        <Button onClick={resetForm} className="w-full h-14 rounded-2xl bg-white text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl">
                            Continuer
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
