'use client';

/**
 * @fileOverview Menu d'actions administrateur COMPLET et SÉCURISÉ.
 * Chaque bouton est relié à une Server Action avec feedback en temps réel.
 * ✅ DESIGN : Fintech Dark Android-First.
 */

import React, { useState, useTransition } from 'react';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { 
    User, 
    Send,
    Wallet, 
    ShieldCheck, 
    Lock, 
    Unlock,
    ShieldAlert, 
    Trash2, 
    MoreVertical,
    ArrowUpRight,
    ArrowDownRight,
    Ban,
    UserCheck,
    Key,
    LifeBuoy,
    CheckCircle2,
    Loader2,
    Gift,
    BadgeEuro,
    Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { NdaraUser, UserRole } from '@/lib/types';
import { 
    rechargeUserWalletAction,
    debitUserWalletAction,
    toggleUserStatusAction,
    changeUserRoleAction,
    applyUserRestrictionsAction,
    removeUserRestrictionsAction,
    toggleSuspectStatusAction,
    resetUserPasswordAction,
    hardDeleteUserAction
} from '@/actions/adminActions';
import { GrantCourseModal } from './GrantCourseModal';
import { UserDetailsModal } from './UserDetailsModal';

interface AdminUserActionsProps {
    user: NdaraUser;
}

export function AdminUserActions({ user: targetUser }: AdminUserActionsProps) {
    const { currentUser: admin } = useRole();
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Modals states
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [passwordResetLink, setPasswordResetLink] = useState<string | null>(null);
    
    // Forms states
    const [amount, setAmount] = useState<number>(0);
    const [reason, setReason] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState("");
    const [selectedRole, setSelectedRole] = useState<UserRole>(targetUser.role);
    const [restrictions, setRestrictions] = useState(targetUser.restrictions || {
        canWithdraw: true,
        canSendMessage: true,
        canBuyCourse: true,
        canSellCourse: true,
        canAccessPlatform: true
    });

    const closeModals = () => {
        setActiveModal(null);
        setAmount(0);
        setReason("");
        setDeleteConfirm("");
        setPasswordResetLink(null);
    };

    const handleAction = (actionFn: () => Promise<{ success: boolean; error?: string }>, successMsg: string) => {
        if (!admin) return;
        
        startTransition(async () => {
            try {
                const result = await actionFn();
                if (result.success) {
                    toast({ title: successMsg });
                    closeModals();
                } else {
                    throw new Error(result.error);
                }
            } catch (e: any) {
                toast({ variant: 'destructive', title: "Échec de l'action", description: e.message });
            }
        });
    };

    const handleResetPassword = () => {
        if (!admin) return;
        startTransition(async () => {
            const result = await resetUserPasswordAction(admin.uid, targetUser.uid);
            if (result.success && result.link) {
                setPasswordResetLink(result.link);
                setActiveModal('password_success');
            } else {
                toast({ variant: 'destructive', title: "Erreur", description: (result as any).error });
            }
        });
    };

    const sections = [
        {
            title: "Informations",
            items: [
                { label: "Détails & Soldes", icon: Eye, onClick: () => setActiveModal('details'), color: 'text-primary' },
                { label: "Voir profil public", icon: User, onClick: () => router.push(`/instructor/${targetUser.uid}`) },
                { label: "Logs sécurité", icon: ShieldCheck, onClick: () => router.push(`/admin/logs?uid=${targetUser.uid}`) },
                { label: "Tickets support", icon: LifeBuoy, onClick: () => router.push(`/admin/support?uid=${targetUser.uid}`) },
            ]
        },
        {
            title: "Communication",
            items: [
                { label: "Envoyer message", icon: Send, onClick: () => router.push(`/admin/messages?chatId=${targetUser.uid}`), color: 'text-primary' },
            ]
        },
        {
            title: "Finances",
            items: [
                { label: "Recharger wallet", icon: ArrowUpRight, onClick: () => setActiveModal('credit'), color: 'text-emerald-500' },
                { label: "Débiter wallet", icon: ArrowDownRight, onClick: () => setActiveModal('debit'), color: 'text-orange-500' },
                { label: "Historique paiements", icon: Wallet, onClick: () => router.push(`/admin/payments?uid=${targetUser.uid}`) },
                { label: "Commissions affilié", icon: BadgeEuro, onClick: () => router.push(`/admin/affiliations?uid=${targetUser.uid}`) },
            ]
        },
        {
            title: "Formation",
            items: [
                { label: "Offrir un cours", icon: Gift, onClick: () => setActiveModal('grant'), color: 'text-primary' },
            ]
        },
        {
            title: "Rôles",
            items: [
                { label: "Changer rôle", icon: UserCheck, onClick: () => setActiveModal('role') },
                { label: "Passer Expert", icon: ShieldCheck, onClick: () => handleAction(() => changeUserRoleAction({ adminId: admin!.uid, targetUserId: targetUser.uid, newRole: 'instructor' }), "Promu Expert"), color: 'text-primary' },
            ]
        },
        {
            title: "Restrictions",
            items: [
                { label: "Restreindre", icon: Ban, onClick: () => setActiveModal('restrict'), color: 'text-orange-500' },
                { label: "Lever restrictions", icon: Unlock, onClick: () => handleAction(() => removeUserRestrictionsAction({ adminId: admin!.uid, targetUserId: targetUser.uid }), "Restrictions levées"), color: 'text-emerald-500' },
            ]
        },
        {
            title: "Sécurité",
            items: [
                { label: targetUser.status === 'active' ? "Suspendre compte" : "Réactiver compte", icon: Lock, onClick: () => setActiveModal('status'), color: targetUser.status === 'active' ? 'text-red-500' : 'text-emerald-500' },
                { label: "Reset Password", icon: Key, onClick: () => setActiveModal('password_confirm') },
                { label: targetUser.isSuspect ? "Lever suspicion" : "Marquer suspect", icon: ShieldAlert, onClick: () => setActiveModal('suspect'), color: 'text-orange-400' },
            ]
        },
        {
            title: "Zone de Danger",
            items: [
                { label: "Supprimer définitivement", icon: Trash2, onClick: () => setActiveModal('delete'), color: 'text-red-500' },
            ]
        }
    ];

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-white transition active:scale-90">
                        <MoreVertical size={20} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 bg-slate-900 border-slate-800 text-slate-300 rounded-[1.5rem] p-2 shadow-2xl max-h-[80vh] overflow-y-auto hide-scrollbar">
                    {sections.map((section, idx) => (
                        <React.Fragment key={section.title}>
                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-600 px-3 py-2 tracking-widest">{section.title}</DropdownMenuLabel>
                            <DropdownMenuGroup>
                                {section.items.map((item) => (
                                    <DropdownMenuItem 
                                        key={item.label} 
                                        onSelect={item.onClick}
                                        className={cn("gap-3 py-3 cursor-pointer rounded-xl transition-colors focus:bg-white/5", item.color)}
                                    >
                                        <item.icon size={16} />
                                        <span className="font-bold text-xs uppercase tracking-tight">{item.label}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                            {idx < sections.length - 1 && <DropdownMenuSeparator className="bg-slate-800/50 my-1" />}
                        </React.Fragment>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* --- MODAL : DETAILS --- */}
            <UserDetailsModal 
                isOpen={activeModal === 'details'} 
                onOpenChange={(o) => setActiveModal(o ? 'details' : null)} 
                user={targetUser} 
            />

            {/* --- MODAL : RECHARGE / DEBIT --- */}
            <Dialog open={activeModal === 'credit' || activeModal === 'debit'} onOpenChange={closeModals}>
                <DialogContent className="bg-slate-900 border-slate-800 rounded-[2rem] text-white">
                    <DialogHeader>
                        <DialogTitle className="uppercase font-black flex items-center gap-2">
                            {activeModal === 'credit' ? <><ArrowUpRight className="text-emerald-500"/> Créditer</> : <><ArrowDownRight className="text-orange-500"/> Débiter</>}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-500">Montant (XOF)</Label>
                            <Input 
                                type="number" 
                                value={amount} 
                                onChange={e => setAmount(Number(e.target.value))} 
                                className="h-14 bg-slate-950 border-slate-800 text-2xl font-black text-primary" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-500">Motif</Label>
                            <Input placeholder="Indiquez la raison..." value={reason} onChange={e => setReason(e.target.value)} className="bg-slate-950 border-slate-800 h-12" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            onClick={() => handleAction(() => activeModal === 'credit' 
                                ? rechargeUserWalletAction({ adminId: admin!.uid, targetUserId: targetUser.uid, amount, reason })
                                : debitUserWalletAction({ adminId: admin!.uid, targetUserId: targetUser.uid, amount, reason }), 
                                "Transaction validée")}
                            disabled={isPending || amount <= 0 || !reason}
                            className={cn("w-full h-14 rounded-2xl font-black uppercase text-xs", activeModal === 'credit' ? "bg-emerald-600" : "bg-orange-600")}
                        >
                            {isPending ? <Loader2 className="animate-spin" /> : "Signer la transaction"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- MODAL : CHANGER RÔLE --- */}
            <Dialog open={activeModal === 'role'} onOpenChange={closeModals}>
                <DialogContent className="bg-slate-900 border-slate-800 rounded-[2rem] text-white">
                    <DialogHeader><DialogTitle className="uppercase font-black">Changer le Rôle</DialogTitle></DialogHeader>
                    <div className="space-y-6 py-4">
                        <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
                            <SelectTrigger className="h-14 bg-slate-950 border-slate-800 rounded-xl">
                                <SelectValue placeholder="Choisir un rôle" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                <SelectItem value="student">👤 Étudiant</SelectItem>
                                <SelectItem value="instructor">🎓 Expert</SelectItem>
                                <SelectItem value="admin">🛡️ Administrateur</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button 
                            onClick={() => handleAction(() => changeUserRoleAction({ adminId: admin!.uid, targetUserId: targetUser.uid, newRole: selectedRole }), "Rôle mis à jour")}
                            disabled={isPending}
                            className="w-full h-14 rounded-2xl bg-primary font-black uppercase text-xs"
                        >
                            {isPending ? <Loader2 className="animate-spin" /> : "Confirmer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- MODAL : GRANT ACCESS --- */}
            <GrantCourseModal 
                isOpen={activeModal === 'grant'} 
                onOpenChange={(o) => setActiveModal(o ? 'grant' : null)} 
                targetUser={targetUser} 
            />

            {/* --- MODAL : RESTRICTIONS --- */}
            <Dialog open={activeModal === 'restrict'} onOpenChange={closeModals}>
                <DialogContent className="bg-slate-900 border-slate-800 rounded-[2rem] text-white">
                    <DialogHeader><DialogTitle className="uppercase font-black">Appliquer Restrictions</DialogTitle></DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <RestrictionToggle label="Bloquer Retraits" checked={!restrictions.canWithdraw} onChange={(v) => setRestrictions(r => ({ ...r, canWithdraw: !v }))} />
                            <RestrictionToggle label="Bloquer Messages" checked={!restrictions.canSendMessage} onChange={(v) => setRestrictions(r => ({ ...r, canSendMessage: !v }))} />
                            <RestrictionToggle label="Bloquer Achats" checked={!restrictions.canBuyCourse} onChange={(v) => setRestrictions(r => ({ ...r, canBuyCourse: !v }))} />
                            <RestrictionToggle label="Bloquer Ventes" checked={!restrictions.canSellCourse} onChange={(v) => setRestrictions(r => ({ ...r, canSellCourse: !v }))} />
                            <RestrictionToggle label="Bloquer Accès Total" checked={!restrictions.canAccessPlatform} onChange={(v) => setRestrictions(r => ({ ...r, canAccessPlatform: !v }))} danger />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Raison</Label>
                            <Input placeholder="Motif de la sanction..." value={reason} onChange={e => setReason(e.target.value)} className="bg-slate-950 border-slate-800" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            onClick={() => handleAction(() => applyUserRestrictionsAction({ adminId: admin!.uid, targetUserId: targetUser.uid, restrictions, reason }), "Sanctions appliquées")}
                            disabled={isPending || !reason}
                            className="w-full h-14 rounded-2xl bg-orange-600 font-black uppercase text-xs"
                        >
                            {isPending ? <Loader2 className="animate-spin" /> : "Appliquer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- MODAL : SUSPECT --- */}
            <Dialog open={activeModal === 'suspect'} onOpenChange={closeModals}>
                <DialogContent className="bg-slate-900 border-slate-800 rounded-[2rem] text-white">
                    <DialogHeader><DialogTitle className="uppercase font-black">{targetUser.isSuspect ? "Lever suspicion" : "Marquer comme Suspect"}</DialogTitle></DialogHeader>
                    <div className="space-y-6 py-4">
                        <p className="text-sm text-slate-400 italic">"Les comptes suspects font l'objet d'un audit approfondi par MATHIAS IA."</p>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Raison du marquage</Label>
                            <Input placeholder="Ex: Transaction inhabituelle..." value={reason} onChange={e => setReason(e.target.value)} className="bg-slate-950 border-slate-800" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            onClick={() => handleAction(() => toggleSuspectStatusAction({ adminId: admin!.uid, targetUserId: targetUser.uid, isSuspect: !targetUser.isSuspect, reason }), "Statut mis à jour")}
                            disabled={isPending || (!targetUser.isSuspect && !reason)}
                            className="w-full h-14 rounded-2xl bg-amber-600 font-black uppercase text-xs"
                        >
                            {isPending ? <Loader2 className="animate-spin" /> : "Confirmer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- MODAL : RESET PASSWORD CONFIRM --- */}
            <Dialog open={activeModal === 'password_confirm'} onOpenChange={closeModals}>
                <DialogContent className="bg-slate-900 border-slate-800 rounded-[2rem] text-white">
                    <DialogHeader><DialogTitle className="uppercase font-black">Réinitialiser le mot de passe</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-slate-400">Cette action générera un lien sécurisé que vous devrez transmettre à l'utilisateur.</p>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleResetPassword} disabled={isPending} className="w-full h-14 rounded-2xl bg-primary text-slate-950 font-black uppercase text-xs">
                            {isPending ? <Loader2 className="animate-spin" /> : "Générer le lien"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- MODAL : PASSWORD LINK DISPLAY --- */}
            <Dialog open={activeModal === 'password_success'} onOpenChange={closeModals}>
                <DialogContent className="bg-slate-900 border-slate-800 rounded-[2rem] text-white">
                    <DialogHeader>
                        <DialogTitle className="uppercase font-black flex items-center gap-2"><CheckCircle2 className="text-emerald-500" /> Lien prêt</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-white/5 break-all">
                            <code className="text-[10px] text-primary">{passwordResetLink}</code>
                        </div>
                        <Button 
                            onClick={() => { if(passwordResetLink) { navigator.clipboard.writeText(passwordResetLink); toast({ title: "Copié !" }); } }}
                            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 font-bold uppercase text-[10px] tracking-widest gap-2"
                        >
                            <Eye size={14} /> Copier le lien
                        </Button>
                    </div>
                    <DialogFooter><Button onClick={closeModals} className="w-full bg-slate-800 rounded-xl">Fermer</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- MODAL : DANGER ZONE --- */}
            <Dialog open={activeModal === 'delete'} onOpenChange={closeModals}>
                <DialogContent className="bg-slate-950 border-red-900/50 rounded-[2rem] text-white">
                    <DialogHeader>
                        <DialogTitle className="uppercase font-black text-red-500 flex items-center gap-2">
                            <Trash2 /> SUPPRESSION DÉFINITIVE
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                            <p className="text-xs text-red-200 font-medium italic">
                                Action critique. Toutes les données seront révoquées de manière permanente dans Firebase Auth et Firestore.
                            </p>
                        </div>
                        <div className="space-y-3 text-center">
                            <Label className="text-[10px] uppercase font-black text-slate-500">Tapez "SUPPRIMER" pour confirmer</Label>
                            <Input 
                                value={deleteConfirm} 
                                onChange={e => setDeleteConfirm(e.target.value.toUpperCase())} 
                                className="bg-black border-red-900/30 text-center text-xl font-black text-red-500 tracking-widest"
                                placeholder="SUPPRIMER"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            onClick={() => handleAction(() => hardDeleteUserAction({ adminId: admin!.uid, targetUserId: targetUser.uid, confirmation: deleteConfirm }), "Compte supprimé")}
                            disabled={isPending || deleteConfirm !== "SUPPRIMER"}
                            className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-red-600/20"
                        >
                            {isPending ? <Loader2 className="animate-spin" /> : "CONFIRMER LA SUPPRESSION"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function RestrictionToggle({ label, checked, onChange, danger = false }: { label: string, checked: boolean, onChange: (v: boolean) => void, danger?: boolean }) {
    return (
        <div className="flex items-center justify-between p-3 bg-slate-950 border border-white/5 rounded-xl">
            <span className={cn("text-xs font-bold uppercase", checked ? (danger ? "text-red-500" : "text-orange-500") : "text-slate-400")}>{label}</span>
            <Switch checked={checked} onCheckedChange={onChange} className={cn(checked && (danger ? "data-[state=checked]:bg-red-500" : "data-[state=checked]:bg-orange-500"))} />
        </div>
    );
}
