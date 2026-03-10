'use client';

import { useRole } from '@/context/RoleContext';
import { deleteCouponAction } from '@/actions/couponActions';
import { useToast } from '@/hooks/use-toast';
import type { Coupon } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, TrendingUp, Users, Calendar, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
      <div className="py-20 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[2.5rem] opacity-30">
        <Ticket className="h-12 w-12 mx-auto mb-4" />
        <p className="font-black uppercase tracking-widest text-xs">Aucun coupon actif</p>
      </div>
    );
  }

  return (
    <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 bg-slate-800/30">
            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Code</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Réduction</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Usage</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Expire le</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((coupon) => {
            const isExpired = (coupon.expiresAt as any)?.toDate?.() < new Date();
            const isFull = coupon.usedCount >= coupon.maxUses;

            return (
              <TableRow key={coupon.id} className="group border-slate-800 hover:bg-slate-800/20">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-black text-primary text-sm">{coupon.code}</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-tighter truncate max-w-[150px]">{coupon.courseTitle}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-black text-[9px] uppercase border-none bg-slate-800">
                    {coupon.discountType === 'percentage' ? `-${coupon.discountValue}%` : `-${coupon.discountValue} XOF`}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 w-12 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(coupon.usedCount / coupon.maxUses) * 100}%` }} />
                    </div>
                    <span className={cn("text-[10px] font-bold", isFull ? "text-red-400" : "text-slate-400")}>
                        {coupon.usedCount}/{coupon.maxUses}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-[10px] font-bold text-slate-500 uppercase">
                  {format((coupon.expiresAt as any).toDate(), 'dd MMM yyyy', { locale: fr })}
                  {isExpired && <span className="ml-2 text-red-500 text-[8px] font-black tracking-widest">(EXPIRÉ)</span>}
                </TableCell>
                <TableCell className="text-right pr-6">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.code)} className="text-slate-600 hover:text-red-500 h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
