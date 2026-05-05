'use client';

/**
 * @fileOverview Menu d'actions administrateur COMPLET et SÉCURISÉ.
 * ✅ DESIGN : Fintech Dark Android-First.
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
import { cn } from '@/lib/utils';
import type { NdaraUser } from '@/lib/types';
import { GrantCourseModal } from './GrantCourseModal';
import { UserDetailsModal } from './UserDetailsModal';
import { EditAccountModal } from './EditAccountModal';
import { AccessManagerModal } from './AccessManagerModal';

interface AdminUserActionsProps {
    user: NdaraUser;
}

export function AdminUserActions({ user: targetUser }: AdminUserActionsProps) {
    const router = useRouter();
    const [activeModal, setActiveModal] = useState<string | null>(null);

    const closeModals = () => setActiveModal(null);

    const sections = [
        {
            title: "Informations",
            items: [
                { label: "Détails & Soldes", icon: Eye, onClick: () => setActiveModal('details'), color: 'text-primary' },
                { label: "Modifier le compte", icon: Edit, onClick: () => setActiveModal('edit_account'), color: 'text-amber-500' },
                { label: "Voir profil public", icon: User, onClick: () => router.push(`/instructor/${targetUser.uid}`) },
            ]
        },
        {
            title: "Formation & Accès",
            items: [
                { label: "Gérer les accès", icon: ShieldCheck, onClick: () => setActiveModal('manage_access'), color: 'text-primary' },
                { label: "Offrir un cours", icon: Gift, onClick: () => setActiveModal('grant'), color: 'text-blue-400' },
            ]
        },
        {
            title: "Finances",
            items: [
                { label: "Historique paiements", icon: Wallet, onClick: () => router.push(`/admin/payments?uid=${targetUser.uid}`) },
                { label: "Commissions affilié", icon: BadgeEuro, onClick: () => router.push(`/admin/affiliations?uid=${targetUser.uid}`) },
            ]
        },
        {
            title: "Sécurité",
            items: [
                { label: targetUser.status === 'active' ? "Suspendre compte" : "Réactiver compte", icon: Lock, onClick: () => router.push(`/admin/logs?uid=${targetUser.uid}`), color: targetUser.status === 'active' ? 'text-red-500' : 'text-emerald-500' },
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

            {/* --- MODALS --- */}
            <UserDetailsModal isOpen={activeModal === 'details'} onOpenChange={closeModals} user={targetUser} />
            <EditAccountModal isOpen={activeModal === 'edit_account'} onOpenChange={closeModals} user={targetUser} />
            <AccessManagerModal isOpen={activeModal === 'manage_access'} onOpenChange={closeModals} user={targetUser} />
            <GrantCourseModal isOpen={activeModal === 'grant'} onOpenChange={closeModals} targetUser={targetUser} />
        </>
    );
}
