'use client';

/**
 * @fileOverview Panneau de Sécurité & Restrictions.
 * ✅ SOUVERAINETÉ : Blocage granulaire des capacités de l'utilisateur.
 */

import { useState } from 'react';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { toggleUserStatusAction } from '@/actions/adminActions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
    ShieldAlert, 
    HandCoins, 
    MessageSquare, 
    ShoppingCart, 
    Video, 
    Ban, 
    Unlock,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NdaraUser } from '@/lib/types';

export function RestrictionsModal({ isOpen, onOpenChange, user }: { isOpen: boolean; onOpenChange: (o: boolean) => void; user: NdaraUser; }) {
    const { currentUser: admin } = useRole();
    const { toast } = useToast();
    const db = getFirestore();
    const [isSaving, setIsSaving] = useState(false);

    const r = user.restrictions || { canWithdraw: true, canSendMessage: true, canBuyCourse: true, canSellCourse: true, canAccessPlatform: true };

    const toggleRestriction = async (key: string, value: boolean) => {
        if (!admin) return;
        setIsSaving(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                [`restrictions.${key}`]: value,
                updatedAt: serverTimestamp()
            });
            toast({ title: "Sécurité mise à jour" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erreur" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!admin) return;
        setIsSaving(true);
        const newStatus = user.status === 'active' ? 'suspended' : 'active';
        const result = await toggleUserStatusAction({
            adminId: admin.uid,
            targetUserId: user.uid,
            status: newStatus,
            reason: 'Action manuelle depuis le cockpit restrictions.'
        });

        if (result.success) {
            toast({ title: newStatus === 'active' ? "Compte réactivé" : "Compte suspendu" });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 p-0 overflow-hidden rounded-[2.5rem]">
                <DialogHeader className="p-8 pb-4 bg-red-500/5 border-b border-white/5">
                    <DialogTitle className="flex items-center gap-3 text-white uppercase font-black tracking-tight">
                        <ShieldAlert className="text-red-500" /> Sécurité & Sanctions
                    </DialogTitle>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="bg-black/30 p-5 rounded-3xl border border-white/5 space-y-4">
                        <RestrictionItem 
                            icon={HandCoins} 
                            label="Droit de retrait" 
                            checked={r.canWithdraw} 
                            onToggle={(v: boolean) => toggleRestriction('canWithdraw', v)} 
                        />
                        <RestrictionItem 
                            icon={MessageSquare} 
                            label="Droit de message" 
                            checked={r.canSendMessage} 
                            onToggle={(v: boolean) => toggleRestriction('canSendMessage', v)} 
                        />
                        <RestrictionItem 
                            icon={ShoppingCart} 
                            label="Droit d'achat" 
                            checked={r.canBuyCourse} 
                            onToggle={(v: boolean) => toggleRestriction('canBuyCourse', v)} 
                        />
                        <RestrictionItem 
                            icon={Video} 
                            label="Accès plateforme" 
                            checked={r.canAccessPlatform} 
                            onToggle={(v: boolean) => toggleRestriction('canAccessPlatform', v)} 
                        />
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <Button 
                            onClick={handleToggleStatus} 
                            disabled={isSaving}
                            variant={user.status === 'active' ? "destructive" : "default"}
                            className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl gap-2"
                        >
                            {isSaving ? <Loader2 className="animate-spin" /> : user.status === 'active' ? <Ban size={14} /> : <Unlock size={14} />}
                            {user.status === 'active' ? "Suspendre l'accès global" : "Lever la suspension"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface RestrictionItemProps {
    icon: React.ElementType;
    label: string;
    checked: boolean;
    onToggle: (v: boolean) => void;
}

function RestrictionItem({ icon: Icon, label, checked, onToggle }: RestrictionItemProps) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Icon size={16} className={cn(checked ? "text-primary" : "text-red-500")} />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-tight">{label}</span>
            </div>
            <Switch checked={checked} onCheckedChange={(v: boolean) => onToggle(v)} className="data-[state=checked]:bg-primary" />
        </div>
    );
}
