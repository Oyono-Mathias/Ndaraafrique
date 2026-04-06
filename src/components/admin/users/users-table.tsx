'use client';

/**
 * @fileOverview Répertoire des Membres Ndara Afrique - Cockpit Admin v2.5.
 * ✅ RÉSOLU : Utilisation de onSelect pour la compatibilité Dropdown/Dialog.
 * ✅ SÉCURITÉ : Validation serveur sur chaque action critique.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import type { NdaraUser } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  MoreVertical,
  User as UserProfileIcon,
  Trash2,
  Loader2,
  MessageSquare,
  Gift,
  Ban,
  UserCheck,
  ShieldAlert,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Unlock
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { startChat } from '@/lib/chat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
    rechargeUserWalletAction, 
    debitUserWalletAction, 
    toggleUserStatusAction, 
    softDeleteUserAction,
    applyUserRestrictionsAction,
    removeUserRestrictionsAction
} from '@/actions/adminActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { africanCountries } from '@/lib/countries';
import { GrantCourseModal } from './GrantCourseModal';
import { UserDetailsModal } from './UserDetailsModal';

const UserCard = ({ user: targetUser }: { user: NdaraUser }) => {
    const { currentUser: adminUser } = useRole();
    const { toast } = useToast();
    const router = useRouter();
    
    const [modals, setModals] = useState({
        recharge: false,
        debit: false,
        restrict: false,
        details: false,
        grant: false,
    });

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ amount: 0, reason: '' });
    const [restrictions, setRestrictions] = useState(targetUser.restrictions || {
        canWithdraw: true,
        canSendMessage: true,
        canBuyCourse: true,
        canSellCourse: true,
        canAccessPlatform: true
    });

    const toggleModal = (key: keyof typeof modals, val: boolean) => setModals(m => ({ ...m, [key]: val }));

    const handleSimpleAction = async (actionFn: () => Promise<any>, successMsg: string) => {
        if (!adminUser) return;
        setLoading(true);
        try {
            const res = await actionFn();
            if (res.success) toast({ title: successMsg });
            else throw new Error(res.error);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erreur", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleFinanceAction = async (type: 'recharge' | 'debit') => {
        if (!adminUser || formData.amount <= 0) return;
        setLoading(true);
        try {
            const res = type === 'recharge' 
                ? await rechargeUserWalletAction({ adminId: adminUser.uid, targetUserId: targetUser.uid, amount: formData.amount, reason: formData.reason })
                : await debitUserWalletAction({ adminId: adminUser.uid, targetUserId: targetUser.uid, amount: formData.amount, reason: formData.reason });
            
            if (res.success) {
                toast({ title: type === 'recharge' ? "Crédit effectué" : "Débit effectué" });
                toggleModal(type, false);
                setFormData({ amount: 0, reason: '' });
            } else throw new Error(res.error);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erreur", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleApplyRestrictions = async () => {
        if (!adminUser) return;
        setLoading(true);
        const res = await applyUserRestrictionsAction({
            adminId: adminUser.uid,
            targetUserId: targetUser.uid,
            restrictions,
            reason: formData.reason || "Mesure administrative."
        });
        if (res.success) {
            toast({ title: "Restrictions appliquées" });
            toggleModal('restrict', false);
        }
        setLoading(false);
    };

    const handleContact = async () => {
        if (!adminUser) return;
        setLoading(true);
        try {
            const chatId = await startChat(adminUser.uid, targetUser.uid);
            router.push(`/admin/messages?chatId=${chatId}`);
        } catch (e) {
            toast({ variant: 'destructive', title: "Erreur messagerie" });
        } finally {
            setLoading(false);
        }
    };

    const createdAt = (targetUser.createdAt as any)?.toDate?.() || null;
    const country = africanCountries.find(c => c.code === targetUser.countryCode);

    return (
        <div className={cn(
            "bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-4 relative overflow-hidden transition-all group shadow-xl",
            targetUser.status === 'suspended' && "opacity-60 grayscale"
        )}>
            {/* Recharge Modal */}
            <Dialog open={modals.recharge} onOpenChange={(v) => toggleModal('recharge', v)}>
                <DialogContent className="bg-slate-900 border-slate-800 rounded-[2rem] text-white">
                    <DialogHeader><DialogTitle className="uppercase font-black flex items-center gap-2"><ArrowUpRight className="text-primary"/> Injecter des fonds</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-500">Montant (XOF)</Label>
                            <Input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-14 text-2xl font-black text-primary" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-500">Motif</Label>
                            <Input placeholder="Ex: Correction manuelle..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="bg-slate-950 border-slate-800" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => handleFinanceAction('recharge')} disabled={loading} className="w-full h-14 rounded-2xl bg-primary text-slate-950 font-black uppercase text-xs">
                            {loading ? <Loader2 className="animate-spin" /> : "Confirmer la recharge"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Debit Modal */}
            <Dialog open={modals.debit} onOpenChange={(v) => toggleModal('debit', v)}>
                <DialogContent className="bg-slate-900 border-slate-800 rounded-[2rem] text-white">
                    <DialogHeader><DialogTitle className="uppercase font-black flex items-center gap-2"><ArrowDownRight className="text-red-500"/> Débiter le compte</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-500">Montant à retirer (XOF)</Label>
                            <Input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-14 text-2xl font-black text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-500">Raison</Label>
                            <Input placeholder="Ex: Erreur de saisie précédente..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="bg-slate-950 border-slate-800" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => handleFinanceAction('debit')} disabled={loading} className="w-full h-14 rounded-2xl bg-red-600 text-white font-black uppercase text-xs">
                            {loading ? <Loader2 className="animate-spin" /> : "Confirmer le débit"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <GrantCourseModal isOpen={modals.grant} onOpenChange={(v) => toggleModal('grant', v)} targetUser={targetUser} />
            <UserDetailsModal isOpen={modals.details} onOpenChange={(v) => toggleModal('details', v)} user={targetUser} />

            <div className="flex items-start gap-4 relative z-10">
                <div className="relative flex-shrink-0">
                    <div className={cn(
                        "w-14 h-14 rounded-full overflow-hidden border-2",
                        targetUser.role === 'admin' ? "border-purple-500" : targetUser.role === 'instructor' ? "border-primary" : "border-slate-700"
                    )}>
                        <Avatar className="h-full w-full">
                            <AvatarImage src={targetUser.profilePictureURL} className="object-cover" />
                            <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">{targetUser.fullName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                    {targetUser.isOnline && <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full border-2 border-slate-950 animate-pulse" />}
                </div>

                <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-black text-white text-base truncate uppercase tracking-tight">{targetUser.fullName}</h3>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="text-slate-500 hover:text-white transition p-1"><MoreVertical size={20} /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 bg-slate-950 border-slate-800 text-slate-300 rounded-2xl p-2 shadow-2xl">
                                <DropdownMenuGroup>
                                    <DropdownMenuItem onSelect={() => toggleModal('details', true)} className="gap-3 py-3 cursor-pointer rounded-xl"><UserProfileIcon size={16} /> Voir Profil</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={handleContact} className="gap-3 py-3 cursor-pointer rounded-xl"><MessageSquare size={16} /> Messagerie</DropdownMenuItem>
                                </DropdownMenuGroup>

                                <DropdownMenuSeparator className="bg-slate-900" />

                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-600 px-3 py-2">Finance</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={() => toggleModal('recharge', true)} className="gap-3 py-3 cursor-pointer rounded-xl text-emerald-400"><ArrowUpRight size={16} /> Créditer</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => toggleModal('debit', true)} className="gap-3 py-3 cursor-pointer rounded-xl text-red-400"><ArrowDownRight size={16} /> Débiter</DropdownMenuItem>
                                </DropdownMenuGroup>

                                <DropdownMenuSeparator className="bg-slate-900" />

                                <DropdownMenuGroup>
                                    <DropdownMenuItem onSelect={() => toggleModal('grant', true)} className="gap-3 py-3 cursor-pointer rounded-xl"><Gift size={16} /> Offrir cours</DropdownMenuItem>
                                </DropdownMenuGroup>

                                <DropdownMenuSeparator className="bg-slate-900" />

                                <DropdownMenuGroup>
                                    {targetUser.status === 'active' ? (
                                        <DropdownMenuItem onSelect={() => handleSimpleAction(() => toggleUserStatusAction({ adminId: adminUser!.uid, targetUserId: targetUser.uid, status: 'suspended', reason: 'Action admin' }), "Compte suspendu")} className="gap-3 py-3 cursor-pointer rounded-xl text-red-500"><Ban size={16} /> Suspendre</DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem onSelect={() => handleSimpleAction(() => toggleUserStatusAction({ adminId: adminUser!.uid, targetUserId: targetUser.uid, status: 'active', reason: 'Réactivation' }), "Compte réactivé")} className="gap-3 py-3 cursor-pointer rounded-xl text-emerald-500"><UserCheck size={16} /> Réactiver</DropdownMenuItem>
                                    )}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    
                    <p className="text-primary text-[10px] font-black uppercase tracking-widest mb-3">@{targetUser.username}</p>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge className={cn(
                            "border-none text-[8px] font-black uppercase px-2 py-0.5",
                            targetUser.role === 'admin' ? "bg-purple-500/20 text-purple-400" : targetUser.role === 'instructor' ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"
                        )}>
                            {targetUser.role}
                        </Badge>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                            <span>{country?.emoji || '🌍'}</span>
                            <span className="truncate max-w-[80px]">{targetUser.countryName || 'Afrique'}</span>
                        </div>
                        {createdAt && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase ml-auto">
                                <Clock size={10} />
                                {format(createdAt, 'MMM yyyy', { locale: fr })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export function UsersTable() {
    const db = getFirestore();
    const usersQuery = useMemo(() => query(collection(db, 'users'), orderBy('createdAt', 'desc')), [db]);
    const { data: users, isLoading } = useCollection<NdaraUser>(usersQuery);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(u => 
            (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    if (isLoading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[2rem] bg-slate-900" />)}</div>;

    return (
        <div className="space-y-6">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                <Input 
                    placeholder="Chercher un membre, email..." 
                    className="h-14 pl-12 bg-slate-900/50 border-white/5 rounded-full text-white placeholder:text-slate-600 focus-visible:ring-primary/20 shadow-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="grid gap-4">
                {filteredUsers.map(user => <UserCard key={user.uid} user={user} />)}
            </div>
        </div>
    );
}
