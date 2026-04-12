'use client';

/**
 * @fileOverview Menu d'actions administrateur complet (Design Android-First).
 * ✅ STRUCTURE : 9 sections professionnelles.
 * ✅ SÉCURITÉ : Server Actions & Confirmations Danger Zone.
 */

import { Send, MessageSquare } from "lucide-react";
import React, { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { 
    User, 
    MessageSquare, 
    Wallet, 
    BookOpen, 
    ShieldCheck, 
    Lock, 
    ShieldAlert, 
    Trash2, 
    MoreVertical,
    Activity,
    History,
    Mail,
    Smartphone,
    ArrowUpRight,
    ArrowDownRight,
    GraduationCap,
    TrendingUp,
    Ban,
    UserCheck,
    Key,
    LogOut,
    Eye,
    LifeBuoy,
    Check,
    X,
    Loader2,
    Gift
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
import { cn } from '@/lib/utils';
import type { NdaraUser, UserRole } from '@/lib/types';
import { 
    rechargeUserWalletAction,
    debitUserWalletAction,
    toggleUserStatusAction,
    changeUserRoleAction,
    applyUserRestrictionsAction,
    removeUserRestrictionsAction,
    grantFreeCourseAction,
    toggleSuspectStatusAction,
    resetUserPasswordAction,
    hardDeleteUserAction
} from '@/actions/adminActions';

interface AdminUserActionsProps {
    user: NdaraUser;
}

export function AdminUserActions({ user: targetUser }: AdminUserActionsProps) {
    const { currentUser: admin } = useRole();
    const { toast } = useToast();
    const router = useRouter();

    // Modals states
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Forms states
    const [amount, setAmount] = useState<number>(0);
    const [reason, setReason] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState("");
    const [restrictions, setRestrictions] = useState(targetUser.restrictions || {
        canWithdraw: true,
        canSendMessage: true,
        canBuyCourse: true,
        canSellCourse: true,
        canAccessPlatform: true
    });

    const closeModals = () => {
        setActiveModal(null);
        setIsSubmitting(false);
        setAmount(0);
        setReason("");
        setDeleteConfirm("");
    };

    const handleAction = async (actionFn: () => Promise<{ success: boolean; error?: string }>, successMsg: string) => {
        if (!admin) return;
        setIsSubmitting(true);
        try {
            const result = await actionFn();
            if (result.success) {
                toast({ title: successMsg });
                closeModals();
            } else {
                throw new Error(result.error);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "L'opération a échoué", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const sections = [
        {
            title: "Informations",
            items: [
                { label: "Voir profil", icon: User, onClick: () => router.push(`/admin/users?id=${targetUser.uid}`) },
                { label: "Voir activités", icon: Activity, onClick: () => {} },
                { label: "Logs sécurité", icon: ShieldCheck, onClick: () => router.push(`/admin/logs?uid=${targetUser.uid}`) },
                { label: "Tickets support", icon: LifeBuoy, onClick: () => router.push(`/admin/support?uid=${targetUser.uid}`) },
            ]
        },
        {
            title: "Communication",
            items: [
                { label: "Envoyer message", icon: Send, onClick: () => setActiveModal('message'), color: 'text-primary' },
                { label: "Accéder messagerie", icon: MessageSquare, onClick: () => router.push(`/admin/messages?uid=${targetUser.uid}`) },
            ]
        },
        {
            title: "Finances",
            items: [
                { label: "Recharger wallet", icon: ArrowUpRight, onClick: () => setActiveModal('credit'), color: 'text-emerald-500' },
                { label: "Débiter wallet", icon: ArrowDownRight, onClick: () => setActiveModal('debit'), color: 'text-orange-500' },
                { label: "Voir transactions", icon: Wallet, onClick: () => router.push(`/admin/payments?uid=${targetUser.uid}`) },
            ]
        },
        {
            title: "Formation",
            items: [
                { label: "Offrir un cours", icon: Gift, onClick: () => setActiveModal('grant'), color: 'text-primary' },
                { label: "Voir ses cours", icon: BookOpen, onClick: () => {} },
                { label: "Voir progression", icon: TrendingUp, onClick: () => {} },
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
                { label: "Reset Password", icon: Key, onClick: () => setActiveModal('password') },
                { label: "Forcer déconnexion", icon: LogOut, onClick: () => {}, color: 'text-orange-400' },
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
                            <Label className="text-[10px] uppercase font-black text-slate-500">Motif de l'opération</Label>
                            <Input 
                                placeholder="Indiquez la raison..." 
                                value={reason} 
                                onChange={e => setReason(e.target.value)} 
                                className="bg-slate-950 border-slate-800 h-12" 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            onClick={() => handleAction(() => activeModal === 'credit' 
                                ? rechargeUserWalletAction({ adminId: admin!.uid, targetUserId: targetUser.uid, amount, reason })
                                : debitUserWalletAction({ adminId: admin!.uid, targetUserId: targetUser.uid, amount, reason }), 
                                "Mise à jour financière effectuée")}
                            disabled={isSubmitting || amount <= 0 || !reason}
                            className={cn("w-full h-14 rounded-2xl font-black uppercase text-xs", activeModal === 'credit' ? "bg-emerald-600" : "bg-orange-600")}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Signer la transaction"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- MODAL : RESTRICTIONS --- */}
            <Dialog open={activeModal === 'restrict'} onOpenChange={closeModals}>
                <DialogContent className="bg-slate-900 border-slate-800 rounded-[2rem] text-white">
                    <DialogHeader>
                        <DialogTitle className="uppercase font-black flex items-center gap-2">
                            <Ban className="text-orange-500"/> Appliquer Restrictions
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <RestrictionToggle label="Retraits Mobile Money" checked={!restrictions.canWithdraw} onChange={(v) => setRestrictions(r => ({ ...r, canWithdraw: !v }))} />
                            <RestrictionToggle label="Envoi de messages" checked={!restrictions.canSendMessage} onChange={(v) => setRestrictions(r => ({ ...r, canSendMessage: !v }))} />
                            <RestrictionToggle label="Achats de cours" checked={!restrictions.canBuyCourse} onChange={(v) => setRestrictions(r => ({ ...r, canBuyCourse: !v }))} />
                            <RestrictionToggle label="Vente de cours" checked={!restrictions.canSellCourse} onChange={(v) => setRestrictions(r => ({ ...r, canSellCourse: !v }))} />
                            <RestrictionToggle label="Accès à la plateforme" checked={!restrictions.canAccessPlatform} onChange={(v) => setRestrictions(r => ({ ...r, canAccessPlatform: !v }))} danger />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-500">Raison de la sanction (Obligatoire)</Label>
                            <Input placeholder="Comportement suspect, fraude..." value={reason} onChange={e => setReason(e.target.value)} className="bg-slate-950 border-slate-800" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            onClick={() => handleAction(() => applyUserRestrictionsAction({ adminId: admin!.uid, targetUserId: targetUser.uid, restrictions, reason }), "Sanctions appliquées")}
                            disabled={isSubmitting || !reason}
                            className="w-full h-14 rounded-2xl bg-orange-600 font-black uppercase text-xs shadow-xl"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Appliquer les mesures"}
                        </Button>
                    </DialogFooter>
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
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                            <ShieldAlert className="text-red-500 h-5 w-5 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-200 font-medium leading-relaxed italic">
                                "Action critique. Toutes les inscriptions, certificats et accès seront révoqués de manière permanente."
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
                            onClick={() => handleAction(() => hardDeleteUserAction({ adminId: admin!.uid, targetUserId: targetUser.uid, confirmation: deleteConfirm }), "Utilisateur supprimé de Ndara")}
                            disabled={isSubmitting || deleteConfirm !== "SUPPRIMER"}
                            className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-red-600/20 transition-all active:scale-95"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "EXÉCUTER LA SUPPRESSION"}
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
            <span className={cn("text-xs font-bold uppercase tracking-tight", checked ? (danger ? "text-red-500" : "text-orange-500") : "text-slate-400")}>{label}</span>
            <Switch checked={checked} onCheckedChange={onChange} className={cn(checked && (danger ? "data-[state=checked]:bg-red-500" : "data-[state=checked]:bg-orange-500"))} />
        </div>
    );
}
