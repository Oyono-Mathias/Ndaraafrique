'use client';

/**
 * @fileOverview Liste des coupons avec design Vintage Cinema Ticket.
 * ✅ DESIGN QWEN : Ticket découpé avec texture hachurée.
 */

import { useRole } from '@/context/RoleContext';
import { deleteCouponAction } from '@/actions/couponActions';
import { useToast } from '@/hooks/use-toast';
import type { Coupon } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Trash2, Tag, Ticket, Users, Clock, MoreVertical, Ban } from 'lucide-react';
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
    <div className="space-y-6">
      {coupons.map((coupon) => {
        const expiryDate = (coupon.expiresAt as any)?.toDate?.() || new Date();
        const isExpired = expiryDate < new Date();
        const usagePercent = Math.min(100, (coupon.usedCount / coupon.maxUses) * 100);

        return (
          <div 
            key={coupon.id} 
            className={cn(
                "vintage-ticket rounded-3xl p-6 flex flex-col gap-4 shadow-2xl active:scale-[0.98] transition-all group animate-fade-in",
                isExpired && "opacity-60 grayscale"
            )}
          >
            <div className="flex justify-between items-start relative z-20">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="font-black text-ndara-amber text-2xl tracking-[0.25em] font-mono">
                            {coupon.code}
                        </span>
                        <Badge className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-md border",
                            isExpired ? "bg-slate-800 text-slate-500 border-slate-700" : "bg-ndara-amber/20 text-ndara-amber border-ndara-amber/30"
                        )}>
                            {isExpired ? "Expiré" : "Actif"}
                        </Badge>
                    </div>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest line-clamp-1 italic">
                        {coupon.discountType === 'percentage' ? `-${coupon.discountValue}%` : `-${coupon.discountValue} XOF`} sur "{coupon.courseTitle}"
                    </p>
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/20 text-slate-500">
                            <MoreVertical size={18} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-300">
                        <DropdownMenuItem onClick={() => handleDelete(coupon.code)} className="text-red-500 gap-2 font-bold uppercase text-[10px] tracking-widest">
                            <Ban size={14} /> Désactiver le code
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-20">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-black/40 flex items-center justify-center text-ndara-amber border border-white/5">
                        <Tag size={16} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Valeur</p>
                        <p className="text-sm font-black text-white">
                            {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `${coupon.discountValue} F`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-black/40 flex items-center justify-center text-blue-400 border border-white/5">
                        <Users size={16} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Usage</p>
                        <p className="text-sm font-black text-white">{coupon.usedCount}/{coupon.maxUses}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2 pt-2 relative z-20">
                <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div className={cn(
                        "h-full transition-all duration-1000",
                        isExpired ? "bg-gray-600" : "bg-ndara-amber"
                    )} style={{ width: `${usagePercent}%` }} />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        <Clock size={10} />
                        Expire le {format(expiryDate, 'dd MMM yyyy', { locale: fr })}
                    </div>
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest font-mono">NDARA SECURE</span>
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Badge({ children, className }: any) {
    return <span className={cn("px-2 py-1 rounded-md border", className)}>{children}</span>;
}

