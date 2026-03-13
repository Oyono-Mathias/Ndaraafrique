'use client';

import { useRole } from '@/context/RoleContext';
import { deleteCouponAction } from '@/actions/couponActions';
import { useToast } from '@/hooks/use-toast';
import type { Coupon } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Trash2, Tag, Ticket, Users, Clock, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CouponsList({ coupons }: { coupons: Coupon[] }) {
  const { currentUser } = useRole();
  const { toast } = useToast();

  const handleDelete = async (code: string) => {
    if (!currentUser) return;
    const result = await deleteCouponAction(code, currentUser.uid);
    if (result.success) toast({ title: "Coupon supprimé." });
    else toast({ variant: 'destructive', title: "Erreur" });
  };

  if (coupons.length === 0) {
    return (
      <div className="py-24 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-20">
        <Ticket className="h-16 w-16 mx-auto mb-4" />
        <p className="font-black uppercase tracking-widest text-xs">Zéro code promotionnel</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {coupons.map((coupon) => {
        const isExpired = (coupon.expiresAt as any)?.toDate?.() < new Date();
        const usagePercent = Math.min(100, (coupon.usedCount / coupon.maxUses) * 100);

        return (
          <div 
            key={coupon.id} 
            className={cn(
                "vintage-ticket rounded-3xl p-6 flex flex-col gap-4 shadow-xl active:scale-[0.98] transition-all group",
                isExpired && "opacity-60 grayscale"
            )}
          >
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="font-black text-white text-xl tracking-[0.2em]">{coupon.code}</span>
                        <span className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-md border",
                            isExpired ? "bg-slate-800 text-slate-500 border-slate-700" : "bg-primary/10 text-primary border-primary/30"
                        )}>
                            {isExpired ? "Expiré" : "Actif"}
                        </span>
                    </div>
                    <p className="text-slate-400 text-xs font-medium italic line-clamp-1">"{coupon.courseTitle}"</p>
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/5 text-slate-500">
                            <MoreVertical size={18} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-300">
                        <DropdownMenuItem onClick={() => handleDelete(coupon.code)} className="text-red-500 gap-2 font-bold uppercase text-[10px] tracking-widest">
                            <Trash2 size={14} /> Supprimer le coupon
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Tag size={14} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Remise</p>
                        <p className="text-sm font-black text-white">
                            {coupon.discountType === 'percentage' ? `-${coupon.discountValue}%` : `-${coupon.discountValue} F`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Users size={14} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Usage</p>
                        <p className="text-sm font-black text-white">{coupon.usedCount}/{coupon.maxUses}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2 pt-2">
                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${usagePercent}%` }} />
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                    <Clock size={10} />
                    Expire le {format((coupon.expiresAt as any).toDate(), 'dd MMM yyyy', { locale: fr })}
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
