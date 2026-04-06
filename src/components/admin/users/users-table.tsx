'use client';

/**
 * @fileOverview Répertoire des Membres Ndara Afrique - Cockpit Admin v2.5.
 * ✅ DESIGN : Cartes tactiles avec menu d'actions complet segmenté.
 * ✅ SÉCURITÉ : Boîtes de dialogue de confirmation pour chaque action critique.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import type { NdaraUser, UserRole } from '@/lib/types';
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
  UserCog,
  Ban,
  UserCheck,
  Plus,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  History,
  Unlock,
  AlertTriangle
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
    rechargeUserWalletAction, 
    debitUserWalletAction, 
    toggleUserStatusAction, 
    changeUserRoleAction, 
    softDeleteUserAction,
    applyUserRestrictionsAction,
    removeUserRestrictionsAction
} from '@/actions/adminActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { africanCountries } from '@/lib/countries';
import { GrantCourseModal } from './GrantCourseModal';
import { UserDetailsModal } from './UserDetailsModal';

const UserCard = ({ 
    user: targetUser, 
    onAction
}: { 
    user: NdaraUser, 
    onAction: () => void
}) => {
    const { currentUser: adminUser } = useRole();
    const { toast } = useToast();
    const router = useRouter();
    
    // États des Modals
    const [modals, setModals] = useState({
        recharge: false,
        debit: false,
        restrict: false,
        delete: false,
        details: false,
        grant: false,
        role: false
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

    const handleSimpleAction = async (actionFn: any, successMsg: string) => {
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
            reason: formData.reason || "Mesure de régulation administrative."
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
        const chatId = await startChat(adminUser.uid, targetUser.uid);
        router.push(`/admin/messages?chatId=${chatId}`);
    };

    const createdAt = (targetUser.createdAt as any)?.toDate?.() || null;
    const country = africanCountries.find(c => c.code === targetUser.countryCode);

    return (
        <div className={cn(
            "bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-4 relative overflow-hidden transition-all group",
            targetUser.status === 'suspended' && "opacity-60 grayscale"
        )}>
            {/* --- MODALS DE GESTION --- */}
            
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
                            <Label className="text-[10px] uppercase font-black text-slate-500">Motif de l'opération</Label>
                            <Input placeholder="Ex: Remboursement manuel..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="bg-slate-950 border-slate-800" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => handleFinanceAction('recharge')} disabled={loading} className="w-full h-14 rounded-2xl bg-primary text-slate-950 font-black uppercase text-xs">
                            {loading ? <Loader2 className="animate-spin" /> : "Signer la transaction"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Restrictions Modal */}
            <Dialog open={modals.restrict} onOpenChange={(v) => toggleModal('restrict', v)}>
                <DialogContent className="bg-slate-900 border-slate-800 rounded-[2rem] text-white">
                    <DialogHeader><DialogTitle className="uppercase font-black flex items-center gap-2"><ShieldAlert className="text-amber-500"/> Restrictions fines</DialogTitle></DialogHeader>
                    <div className="space-y-6 py-4">
                        <RestrictionToggle label="Droit de retrait" checked={restrictions.canWithdraw} onChange={(v) => setRestrictions({...restrictions, canWithdraw: v})} />
                        <RestrictionToggle label="Droit d'achat" checked={restrictions.canBuyCourse} onChange={(v) => setRestrictions({...restrictions, canBuyCourse: v})} />
                        <RestrictionToggle label="Messagerie" checked={restrictions.canSendMessage} onChange={(v) => setRestrictions({...restrictions, canSendMessage: v})} />
                        <RestrictionToggle label="Accès Plateforme" checked={restrictions.canAccessPlatform} onChange={(v) => setRestrictions({...restrictions, canAccessPlatform: v})} />
                        
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-500">Motif de la sanction</Label>
                            <Input placeholder="Ex: Suspicion de fraude..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="bg-slate-950 border-slate-800" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleApplyRestrictions} disabled={loading} className="w-full h-14 rounded-2xl bg-amber-500 text-slate-950 font-black uppercase text-xs">Appliquer les limites</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <GrantCourseModal isOpen={modals.grant} onOpenChange={(v) => toggleModal('grant', v)} targetUser={targetUser} />
            <UserDetailsModal isOpen={modals.details} onOpenChange={(v) => toggleModal('details', v)} user={targetUser} />

            {/* --- CARD CONTENT --- */}
            <div className="flex items-start gap-4 relative z-10">
                <div className="relative flex-shrink-0">
                    <div className={cn(
                        "w-14 h-14 rounded-full overflow-hidden border-2 shadow-xl",
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
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-1">Identité</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => toggleModal('details', true)} className="gap-3 py-3 cursor-pointer rounded-xl"><UserProfileIcon size={16} className="text-primary" /> Voir Profil</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleContact} className="gap-3 py-3 cursor-pointer rounded-xl"><MessageSquare size={16} className="text-blue-400" /> Messagerie</DropdownMenuItem>
                                </DropdownMenuGroup>

                                <DropdownMenuSeparator className="bg-slate-900" />

                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-1">Finance</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => toggleModal('recharge', true)} className="gap-3 py-3 cursor-pointer rounded-xl"><ArrowUpRight size={16} className="text-emerald-500" /> Recharger Wallet</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toggleModal('debit', true)} className="gap-3 py-3 cursor-pointer rounded-xl"><ArrowDownRight size={16} className="text-red-400" /> Débiter Wallet</DropdownMenuItem>
                                </DropdownMenuGroup>

                                <DropdownMenuSeparator className="bg-slate-900" />

                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-1">Pédagogie</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => toggleModal('grant', true)} className="gap-3 py-3 cursor-pointer rounded-xl"><Gift size={16} className="text-primary" /> Offrir un cours</DropdownMenuItem>
                                </DropdownMenuGroup>

                                <DropdownMenuSeparator className="bg-slate-900" />

                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-1">Régulation</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => toggleModal('restrict', true)} className="gap-3 py-3 cursor-pointer rounded-xl"><ShieldAlert size={16} className="text-amber-500" /> Appliquer Restrictions</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSimpleAction(() => removeUserRestrictionsAction({ adminId: adminUser!.uid, targetUserId: targetUser.uid }), "Restrictions levées")} className="gap-3 py-3 cursor-pointer rounded-xl"><Unlock size={16} className="text-emerald-500" /> Lever Restrictions</DropdownMenuItem>
                                </DropdownMenuGroup>

                                <DropdownMenuSeparator className="bg-slate-900" />

                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-1">Administration</DropdownMenuLabel>
                                    {targetUser.status === 'active' ? (
                                        <DropdownMenuItem onClick={() => handleSimpleAction(() => toggleUserStatusAction({ adminId: adminUser!.uid, targetUserId: targetUser.uid, status: 'suspended', reason: 'Action admin' }), "Compte suspendu")} className="gap-3 py-3 cursor-pointer rounded-xl text-red-500"><Ban size={16} /> Suspendre</DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem onClick={() => handleSimpleAction(() => toggleUserStatusAction({ adminId: adminUser!.uid, targetUserId: targetUser.uid, status: 'active', reason: 'Réactivation admin' }), "Compte réactivé")} className="gap-3 py-3 cursor-pointer rounded-xl text-emerald-500"><UserCheck size={16} /> Réactiver</DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleSimpleAction(() => softDeleteUserAction({ adminId: adminUser!.uid, targetUserId: targetUser.uid, reason: "Suppression définitive" }), "Compte supprimé")} className="gap-3 py-3 cursor-pointer rounded-xl text-red-600 font-black uppercase text-[10px]"><Trash2 size={16} /> Supprimer Définitivement</DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    
                    <p className="text-primary text-[10px] font-black uppercase tracking-widest mb-3">@{targetUser.username}</p>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge className={cn(
                            "border-none text-[8px] font-black uppercase px-2 py-0.5 h-4",
                            targetUser.role === 'admin' ? "bg-purple-500/20 text-purple-400" : targetUser.role === 'instructor' ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"
                        )}>
                            {targetUser.role === 'admin' ? 'Super Admin' : targetUser.role === 'instructor' ? 'Expert' : 'Étudiant'}
                        </Badge>
                        
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                            <span>{country?.emoji || '🌍'}</span>
                            <span className="truncate max-w-[80px]">{targetUser.countryName || 'Afrique'}</span>
                        </div>

                        {createdAt && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-tighter ml-auto">
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

function RestrictionToggle({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5">
            <span className="text-sm font-bold uppercase tracking-tight text-slate-300">{label}</span>
            <Checkbox checked={checked} onCheckedChange={(v: boolean) => onChange(v)} className="h-6 w-6 border-slate-700 data-[state=checked]:bg-primary" />
        </div>
    );
}

export function UsersTable() {
    const db = getFirestore();
    const { toast } = useToast();
    const usersQuery = useMemo(() => query(collection(db, 'users'), orderBy('createdAt', 'desc')), [db]);
    const { data: users, isLoading } = useCollection<NdaraUser>(usersQuery);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'student' | 'instructor' | 'admin' | 'suspended'>('all');

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(u => {
            const matchesSearch = (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (u.username || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            let matchesFilter = true;
            if (activeFilter === 'student') matchesFilter = u.role === 'student';
            else if (activeFilter === 'instructor') matchesFilter = u.role === 'instructor';
            else if (activeFilter === 'admin') matchesFilter = u.role === 'admin';
            else if (activeFilter === 'suspended') matchesFilter = u.status === 'suspended';

            return matchesSearch && matchesFilter;
        });
    }, [users, searchTerm, activeFilter]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-32">
            <div className="space-y-6">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Rechercher un membre, email..." 
                        className="h-14 pl-12 bg-slate-900/50 border-white/5 rounded-full text-white placeholder:text-slate-600 focus-visible:ring-primary/20 shadow-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
                    {['all', 'student', 'instructor', 'admin', 'suspended'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter as any)}
                            className={cn(
                                "flex-shrink-0 px-6 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                                activeFilter === filter 
                                    ? "bg-primary text-slate-950 border-primary shadow-lg shadow-primary/20" 
                                    : "bg-slate-900 border-white/5 text-slate-500 hover:text-white"
                            )}
                        >
                            {filter === 'all' ? 'Tous' : filter === 'student' ? 'Étudiants' : filter === 'instructor' ? 'Experts' : filter === 'admin' ? 'Admins' : 'Suspendus'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[2rem] bg-slate-900" />)}
                    </div>
                ) : filteredUsers.length > 0 ? (
                    <div className="grid gap-4">
                        {filteredUsers.map(user => (
                            <UserCard key={user.uid} user={user} onAction={() => {}} />
                        ))}
                    </div>
                ) : (
                    <div className="py-24 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-20">
                        <Search className="h-16 w-16 mx-auto mb-4 text-slate-700" />
                        <p className="font-black uppercase tracking-widest text-xs">Aucun membre trouvé</p>
                    </div>
                )}
            </div>
        </div>
    );
}
