'use client';

/**
 * @fileOverview Modal de changement de privilèges.
 */

import { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { changeUserRoleAction } from '@/actions/adminActions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, UserCog, ShieldCheck, GraduationCap, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NdaraUser, UserRole } from '@/lib/types';

export function ChangeRoleModal({ isOpen, onOpenChange, user }: { isOpen: boolean; onOpenChange: (o: boolean) => void; user: NdaraUser; }) {
    const { currentUser: admin } = useRole();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState<UserRole | null>(null);

    const handleRoleChange = async (newRole: UserRole) => {
        if (!admin) return;
        setIsSubmitting(newRole);

        try {
            const result = await changeUserRoleAction({
                adminId: admin.uid,
                targetUserId: user.uid,
                newRole
            });

            if (result.success) {
                toast({ title: "Privilèges modifiés", description: `L'utilisateur est désormais ${newRole}.` });
                onOpenChange(false);
            } else {
                toast({ variant: 'destructive', title: "Erreur", description: result.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erreur technique" });
        } finally {
            setIsSubmitting(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 p-0 overflow-hidden rounded-[2.5rem]">
                <DialogHeader className="p-8 pb-4 bg-slate-800/30 border-b border-white/5">
                    <DialogTitle className="flex items-center gap-3 text-white uppercase font-black tracking-tight">
                        <UserCog className="text-primary" /> Attribuer un Rôle
                    </DialogTitle>
                </DialogHeader>

                <div className="p-8 space-y-4">
                    <RoleOption 
                        icon={GraduationCap} 
                        label="Étudiant" 
                        desc="Accès aux cours et forum." 
                        active={user.role === 'student'} 
                        onClick={() => handleRoleChange('student')}
                        isLoading={isSubmitting === 'student'}
                    />
                    <RoleOption 
                        icon={ShieldCheck} 
                        label="Expert" 
                        desc="Peut créer et vendre des cours." 
                        active={user.role === 'instructor'} 
                        onClick={() => handleRoleChange('instructor')}
                        isLoading={isSubmitting === 'instructor'}
                    />
                    <RoleOption 
                        icon={ShieldAlert} 
                        label="Administrateur" 
                        desc="Plein pouvoir sur l'infrastructure." 
                        active={user.role === 'admin'} 
                        onClick={() => handleRoleChange('admin')}
                        isLoading={isSubmitting === 'admin'}
                        isCritical
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

function RoleOption({ icon: Icon, label, desc, active, onClick, isLoading, isCritical }: any) {
    return (
        <button 
            onClick={onClick} 
            disabled={active || isLoading}
            className={cn(
                "w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all active:scale-[0.98]",
                active ? "bg-primary/10 border-primary" : "bg-slate-950 border-white/5 hover:border-white/10 opacity-70",
                isCritical && !active && "hover:border-red-500/30"
            )}
        >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", active ? "bg-primary text-slate-950" : "bg-slate-800 text-slate-400")}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Icon size={20} />}
            </div>
            <div className="text-left flex-1">
                <p className="font-bold text-white text-sm uppercase">{label}</p>
                <p className="text-[10px] text-slate-500 font-medium">{desc}</p>
            </div>
        </button>
    );
}
