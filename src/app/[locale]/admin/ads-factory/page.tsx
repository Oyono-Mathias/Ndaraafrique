'use client';

/**
 * @fileOverview Usine à Ndara (Ads Factory).
 * ✅ CEO FEATURE: Création instantanée de comptes gonflés pour publicités.
 * ✅ SECURE: Réservé aux administrateurs.
 */

import { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { createEliteDemoAccountAction, rechargeVirtualBalanceAction } from '@/actions/userActions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Zap, 
    Rocket, 
    ShieldCheck, 
    Users, 
    Landmark, 
    Loader2, 
    Copy, 
    Check, 
    Sparkles, 
    UserPlus,
    Coins,
    Search
} from 'lucide-react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, limit } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function AdsFactoryPage() {
    const { currentUser } = useRole();
    const { toast } = useToast();
    const db = getFirestore();
    
    const [isCreating, setIsCreating] = useState(false);
    const [isRecharging, setIsRecharging] = useState<string | null>(null);
    const [createdAccount, setCreatedAccount] = useState<any>(null);
    const [rechargeAmount, setRechargeAmount] = useState(1000000);
    const [searchTerm, setSearchTerm] = useState('');

    // On affiche les comptes de démo existants
    const demoQuery = query(collection(db, 'users'), where('isDemoAccount', '==', true), limit(10));
    const { data: demoUsers, isLoading: demoLoading } = useCollection<any>(demoQuery);

    const handleCreateDemo = async (role: 'student' | 'instructor') => {
        if (!currentUser) return;
        setIsCreating(true);
        const result = await createEliteDemoAccountAction({ role, adminId: currentUser.uid });
        if (result.success) {
            setCreatedAccount(result);
            toast({ title: "Ndara Demo Créé !", description: "Le compte est prêt pour vos publicités." });
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsCreating(false);
    };

    const handleRecharge = async (userId: string) => {
        if (!currentUser) return;
        setIsRecharging(userId);
        const result = await rechargeVirtualBalanceAction({ 
            userId, 
            amount: rechargeAmount, 
            adminId: currentUser.uid 
        });
        if (result.success) {
            toast({ title: "Solde gonflé !", description: `+${rechargeAmount.toLocaleString()} XOF ajoutés.` });
        }
        setIsRecharging(null);
    };

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <header className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-primary">
                    <Rocket className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Marketing & Visuals</span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Usine à Ndara (Ads Factory)</h1>
                <p className="text-slate-400 text-sm font-medium">Générez des comptes à fort impact visuel pour vos captures publicitaires.</p>
            </header>

            <div className="grid lg:grid-cols-2 gap-8">
                
                {/* --- COMPTEUR DE CRÉATION --- */}
                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                    <div className="absolute top-0 right-0 p-6 opacity-5"><Zap size={120} /></div>
                    <CardHeader className="bg-primary/10 p-8 border-b border-white/5">
                        <CardTitle className="text-xl font-black text-white uppercase flex items-center gap-3">
                            <UserPlus className="text-primary" /> 
                            Générateur de Profils
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl">
                            <p className="text-xs text-slate-400 leading-relaxed font-medium italic">
                                "Ceci crée un compte fonctionnel avec des statistiques d'affiliation et de réussite pré-remplies. Idéal pour filmer le dashboard."
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button 
                                onClick={() => handleCreateDemo('student')} 
                                disabled={isCreating}
                                className="h-16 rounded-2xl bg-white text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                            >
                                {isCreating ? <Loader2 className="animate-spin" /> : <><Users size={16} className="mr-2"/> Étudiant Elite</>}
                            </Button>
                            <Button 
                                onClick={() => handleCreateDemo('instructor')} 
                                disabled={isCreating}
                                className="h-16 rounded-2xl bg-primary text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                            >
                                {isCreating ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={16} className="mr-2"/> Expert Ndara</>}
                            </Button>
                        </div>

                        {createdAccount && (
                            <div className="p-6 bg-slate-950 rounded-2xl border border-primary/30 animate-in zoom-in duration-500 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-primary uppercase">Identifiants Demo</span>
                                    <Badge className="bg-primary text-slate-950 border-none text-[8px] font-black">CRÉÉ</Badge>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-mono text-slate-300">Email: {createdAccount.email}</p>
                                    <p className="text-xs font-mono text-slate-300">Pass: {createdAccount.password}</p>
                                </div>
                                <Button variant="outline" className="w-full h-10 border-slate-800 text-[10px] font-black uppercase" onClick={() => { navigator.clipboard.writeText(createdAccount.email); toast({ title: "Copié" }); }}>
                                    Copier l'email
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* --- GESTION SOLDE VIRTUEL --- */}
                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="bg-amber-500/10 p-8 border-b border-white/5">
                        <CardTitle className="text-xl font-black text-white uppercase flex items-center gap-3">
                            <Coins className="text-amber-500" /> 
                            Recharge Virtuelle
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Montant à injecter (XOF)</label>
                            <Input 
                                type="number" 
                                value={rechargeAmount} 
                                onChange={(e) => setRechargeAmount(Number(e.target.value))}
                                className="h-14 bg-slate-950 border-slate-800 rounded-xl text-2xl font-black text-amber-500"
                            />
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Comptes Demo Actifs</h3>
                            {demoLoading ? <Skeleton className="h-40 w-full rounded-2xl bg-slate-800" /> : (
                                <div className="space-y-2">
                                    {demoUsers?.map(user => (
                                        <div key={user.uid} className="flex items-center justify-between p-3 bg-slate-950/50 border border-white/5 rounded-2xl group">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border border-slate-800">
                                                    <AvatarImage src={user.profilePictureURL} />
                                                    <AvatarFallback className="bg-slate-800 font-bold">{user.fullName?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-white truncate uppercase">{user.fullName}</p>
                                                    <p className="text-[9px] font-black text-primary uppercase">{(user.virtualBalance || 0).toLocaleString()} XOF</p>
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleRecharge(user.uid)}
                                                disabled={isRecharging === user.uid}
                                                className="h-9 px-4 rounded-xl bg-amber-500 text-slate-950 font-black uppercase text-[9px] tracking-widest"
                                            >
                                                {isRecharging === user.uid ? <Loader2 className="animate-spin" /> : "GIBIER"}
                                            </Button>
                                        </div>
                                    ))}
                                    {demoUsers?.length === 0 && <p className="text-center py-10 text-[10px] text-slate-600 font-black uppercase tracking-widest">Aucun compte démo</p>}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- VISUALS TIP --- */}
            <div className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-8 flex items-start gap-6 shadow-2xl">
                <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                    <Sparkles size={32} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Secret Marketing</h3>
                    <p className="text-slate-400 text-sm leading-relaxed font-medium italic">
                        "Pour vos vidéos publicitaires, utilisez ces comptes démo. Le solde virtuel permet de montrer des transactions réussies en temps réel sur le mobile sans frais bancaires réels. Capturez l'excitation du gain !"
                    </p>
                </div>
            </div>
        </div>
    );
}
