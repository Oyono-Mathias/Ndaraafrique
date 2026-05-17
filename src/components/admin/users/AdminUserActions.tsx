'use client';

/**
 * @fileOverview Menu d'actions administrateur UNIFIÉ v2.6.
 * ✅ FUSION TOTALE : Regroupe les 15 fonctions de souveraineté.
 * ✅ DESIGN : Intégration du module ManageAccessModal haute-fidélité.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    User, 
    ShieldCheck, 
    Lock, 
    Trash2, 
    MoreVertical,
    Wallet,
    BadgeEuro,
    Eye,
    Edit,
    Gift,
    MessageSquare,
    UserCog,
    ShieldAlert,
    Ban,
    Unlock,
    History,
    HandCoins,
    UserPlus,
    BookOpen
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
import { cn } from '@/lib/utils';
import type { NdaraUser } from '@/lib/types';

import { ManageAccessModal } from './ManageAccessModal';
import { UserDetailsModal } from './UserDetailsModal';
import { EditAccountModal } from './EditAccountModal';
import { RechargeWalletModal } from './RechargeWalletModal';
import { ChangeRoleModal } from './ChangeRoleModal';
import { RestrictionsModal } from './RestrictionsModal';
import { startChat } from '@/lib/chat';
import { useRole } from '@/context/RoleContext';
import { useLocale } from 'next-intl';

interface AdminUserActionsProps {
    user: NdaraUser;
}

export function AdminUserActions({ user: targetUser }: AdminUserActionsProps) {
    const router = useRouter();
    const locale = useLocale();
    const { currentUser: adminUser } = useRole();
    
    // États pour le pilotage des modals
    const [activeModal, setActiveModal] = useState<string | null>(null);

    const closeModals = () => setActiveModal(null);

    const handleStartChat = async () => {
        if (!adminUser) return;
        try {
            const chatId = await startChat(adminUser.uid, targetUser.uid);
            router.push(`/${locale}/admin/messages?chatId=${chatId}`);
        } catch (e) {
            console.error("Chat init failed", e);
        }
    };

    // 🏗️ TABLEAU MAÎTRE DES ACTIONS
    const menuSections = [
        {
            title: "INFORMATIONS",
            items: [
                { label: "Détails & Soldes", icon: Eye, onClick: () => setActiveModal('details') },
                { label: "Voir profil public", icon: User, onClick: () => router.push(`/${locale}/instructor/${targetUser.uid}`) },
                { label: "Logs sécurité", icon: History, onClick: () => router.push(`/${locale}/admin/logs?search=${targetUser.uid}`) },
            ]
        },
        {
            title: "COMMUNICATION",
            items: [
                { label: "Envoyer message", icon: MessageSquare, onClick: handleStartChat, color: 'text-blue-400' },
            ]
        },
        {
            title: "FINANCES",
            items: [
                { label: "Recharger Wallet", icon: Wallet, onClick: () => setActiveModal('recharge'), color: 'text-emerald-500' },
                { label: "Débiter Wallet", icon: HandCoins, onClick: () => setActiveModal('debit'), color: 'text-amber-500' },
            ]
        },
        {
            title: "FORMATION",
            items: [
                { label: "Gérer l'accès & Droits", icon: ShieldCheck, onClick: () => setActiveModal('manage_access'), color: 'text-primary' },
            ]
        },
        {
            title: "RÔLES",
            items: [
                { label: "Changer rôle", icon: UserCog, onClick: () => setActiveModal('role_change') },
            ]
        },
        {
            title: "PROFIL",
            items: [
                { label: "Modifier le profil", icon: Edit, onClick: () => setActiveModal('edit_account'), color: 'text-amber-500' },
            ]
        },
        {
            title: "RESTRICTIONS",
            items: [
                { label: "Sanctionner", icon: ShieldAlert, onClick: () => setActiveModal('restrictions'), color: 'text-red-500' },
            ]
        }
    ];

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-white transition active:scale-90 shadow-xl border border-white/5">
                        <MoreVertical size={20} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 bg-slate-900 border-slate-800 text-slate-300 rounded-[1.5rem] p-2 shadow-2xl max-h-[85vh] overflow-y-auto hide-scrollbar z-[10005]">
                    {menuSections.map((section, idx) => (
                        <React.Fragment key={section.title}>
                            <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-600 px-3 py-2 tracking-[0.25em]">{section.title}</DropdownMenuLabel>
                            <DropdownMenuGroup>
                                {section.items.map((item) => (
                                    <DropdownMenuItem 
                                        key={item.label} 
                                        onSelect={item.onClick}
                                        className={cn("gap-3 py-3 cursor-pointer rounded-xl transition-all focus:bg-white/5", item.color)}
                                    >
                                        <item.icon size={16} />
                                        <span className="font-bold text-xs uppercase tracking-tight">{item.label}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                            {idx < menuSections.length - 1 && <DropdownMenuSeparator className="bg-slate-800/50 my-1" />}
                        </React.Fragment>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* --- MODALS DE GESTION --- */}
            <UserDetailsModal 
                isOpen={activeModal === 'details'} 
                onOpenChange={closeModals} 
                user={targetUser} 
            />
            
            <EditAccountModal 
                isOpen={activeModal === 'edit_account'} 
                onOpenChange={closeModals} 
                user={targetUser} 
            />
            
            <ManageAccessModal 
                isOpen={activeModal === 'manage_access'} 
                onOpenChange={closeModals} 
                user={targetUser} 
            />
            
            <RechargeWalletModal 
                isOpen={activeModal === 'recharge' || activeModal === 'debit'} 
                onOpenChange={closeModals} 
                user={targetUser} 
                mode={activeModal === 'debit' ? 'debit' : 'recharge'} 
            />
            
            <ChangeRoleModal 
                isOpen={activeModal === 'role_change'} 
                onOpenChange={closeModals} 
                user={targetUser} 
            />
            
            <RestrictionsModal 
                isOpen={activeModal === 'restrictions'} 
                onOpenChange={closeModals} 
                user={targetUser} 
            />
        </>
    );
}
