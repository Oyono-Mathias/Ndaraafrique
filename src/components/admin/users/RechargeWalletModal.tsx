'use client';

/**
 * @fileOverview Modal d'arbitrage financier du Wallet.
 * Permet à l'admin de créditer ou débiter un utilisateur.
 */

import { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { rechargeUserWallet } from '@/actions/userActions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Wallet, HandCoins, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NdaraUser } from '@/lib/types';

export function RechargeWalletModal({ 
    isOpen, 
    onOpenChange, 
    user, 
    mode = 'recharge' 
}: { 
    isOpen: boolean; 
    onOpenChange: (o: boolean) => void; 
    user: NdaraUser;
    mode?: 'recharge' | 'debit';
}) {
    const { currentUser: admin } = useRole();
    const { toast } = useToast();
    const [amount, setAmount] = useState<string>('');
    const [reason, setReason] = useState('');
    const [isSimulated, setIsSimulated] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAction = async () => {
        if (!admin || !amount || parseFloat(amount) <= 0) return;
        
        setIsSubmitting(true);
        const finalAmount = mode === 'debit' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));

        try {
            const result = await rechargeUserWallet({
                userId: user.uid,
                amount: finalAmount,
                adminId: admin.uid,
                reason: reason || `Action admin (${mode})`,
                isSimulated
            });

            if (result.success) {
                toast({ title: mode === 'debit' ? "Débit effectué" : "Recharge validée" });
                onOpenChange(false);
                setAmount('');
                setReason('');
            } else {
                toast({ variant: 'destructive', title: "Erreur", description: result.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erreur technique" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 p-0 overflow-hidden rounded-[2.5rem]">
                <DialogHeader className="p-8 pb-4 bg-slate-800/30 border-b border-white/5">
                    <DialogTitle className="flex items-center gap-3 text-white uppercase font-black tracking-tight">
                        {mode === 'debit' ? <HandCoins className="text-amber-500" /> : <Wallet className="text-primary" />}
                        {mode === 'debit' ? "Débiter le Wallet" : "Recharger le Wallet"}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold text-white">Simulation (Virtuel)</Label>
                            <p className="text-[10px] text-slate-500 uppercase font-black">N'impacte pas le solde réel</p>
                        </div>
                        <Switch checked={isSimulated} onCheckedChange={setIsSimulated} className="data-[state=checked]:bg-amber-500" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Montant (XOF)</Label>
                        <Input 
                            type="number" 
                            placeholder="0" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="h-14 bg-slate-950 border-slate-800 rounded-xl text-2xl font-black text-white px-6"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Motif de l'opération</Label>
                        <Input 
                            placeholder="Justification obligatoire..." 
                            value={reason} 
                            onChange={e => setReason(e.target.value)} 
                            className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white"
                        />
                    </div>

                    <Button 
                        onClick={handleAction} 
                        disabled={isSubmitting || !amount}
                        className={cn(
                            "w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95",
                            mode === 'debit' ? "bg-amber-600 hover:bg-amber-700" : "bg-primary hover:bg-emerald-400 text-slate-950"
                        )}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Signer l'arbitrage</>}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
