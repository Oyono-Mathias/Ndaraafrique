'use client';

/**
 * @fileOverview Historique financier complet de l'étudiant Ndara Afrique.
 * ✅ TRAÇABILITÉ : Affiche les logos via détection intelligente des métadonnées.
 * ✅ FIX : Remplacement du terme "AUDIT" par "EN ATTENTE".
 */

import { useMemo, useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
    CreditCard, 
    CheckCircle2, 
    XCircle, 
    ArrowUpRight, 
    ShoppingBag, 
    BadgeEuro, 
    Clock,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Payment } from '@/lib/types';
import { OperatorLogo } from '@/components/ui/OperatorLogo';

export default function StudentPaymentsPage() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();

  const paymentsQuery = useMemo(() => 
    currentUser?.uid ? query(
        collection(db, 'payments'), 
        where('userId', '==', currentUser.uid)
    ) : null,
    [db, currentUser]
  );
  const { data: rawPayments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);

  const payoutsQuery = useMemo(() => 
    currentUser?.uid ? query(
        collection(db, 'payout_requests'), 
        where('instructorId', '==', currentUser.uid)
    ) : null,
    [db, currentUser]
  );
  const { data: rawPayouts, isLoading: payoutsLoading } = useCollection<any>(payoutsQuery);

  const payments = useMemo(() => {
    if (!rawPayments) return [];
    return [...rawPayments].sort((a, b) => {
        const dateA = (a.date as any)?.toDate?.() || new Date(a.date as any || 0);
        const dateB = (b.date as any)?.toDate?.() || new Date(b.date as any || 0);
        return dateB.getTime() - dateA.getTime();
    });
  }, [rawPayments]);

  const payouts = useMemo(() => {
    if (!rawPayouts) return [];
    return [...rawPayouts].sort((a, b) => {
        const dateA = (a.createdAt as any)?.toDate?.() || new Date(a.createdAt as any || 0);
        const dateB = (b.createdAt as any)?.toDate?.() || new Date(b.createdAt as any || 0);
        return dateB.getTime() - dateA.getTime();
    });
  }, [rawPayouts]);

  const isLoading = isUserLoading || paymentsLoading || payoutsLoading;

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
      <div className="grain-overlay opacity-[0.04]" />
      
      <header className="px-6 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-2 text-primary mb-2">
            <CreditCard className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mon Portefeuille</span>
        </div>
        <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">Registre <br/><span className="text-primary">Financier</span></h1>
      </header>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full bg-transparent border-b border-slate-800 rounded-none h-12 p-0 px-6 justify-start gap-8">
          <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-0 font-black text-[10px] uppercase tracking-widest text-slate-500">
            TOUT
          </TabsTrigger>
          <TabsTrigger value="purchases" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-0 font-black text-[10px] uppercase tracking-widest text-slate-500">
            ACHATS
          </TabsTrigger>
          <TabsTrigger value="payouts" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-0 font-black text-[10px] uppercase tracking-widest text-slate-500">
            RETRAITS
          </TabsTrigger>
        </TabsList>

        <main className="px-6 mt-8">
          <TabsContent value="all" className="m-0 space-y-4">
            {isLoading ? <ListSkeleton /> : payments.length > 0 ? (
                payments.map(p => <PaymentItem key={p.id} payment={p} />)
            ) : <EmptyState icon={ShoppingBag} text="Aucun mouvement enregistré" />}
          </TabsContent>

          <TabsContent value="purchases" className="m-0 space-y-4">
            {isLoading ? <ListSkeleton /> : payments.filter(p => p.type === 'course_purchase').length > 0 ? (
                payments.filter(p => p.type === 'course_purchase').map(p => <PaymentItem key={p.id} payment={p} />)
            ) : <EmptyState icon={ShoppingBag} text="Aucune formation achetée" />}
          </TabsContent>

          <TabsContent value="payouts" className="m-0 space-y-4">
             {isLoading ? <ListSkeleton /> : payouts.length > 0 ? (
                payouts.map((p: any) => <PayoutItem key={p.id} payout={p} />)
            ) : <EmptyState icon={BadgeEuro} text="Aucune demande de retrait" />}
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
}

function PaymentItem({ payment }: { payment: Payment }) {
  const date = (payment.date as any)?.toDate?.() || new Date(payment.date as any || 0);
  
  const statusConfig = (({
    completed: { label: 'Réussi', class: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle2 },
    pending: { label: 'En attente', class: 'bg-amber-500/10 text-amber-400 animate-pulse', icon: Clock },
    failed: { label: 'Échoué', class: 'bg-red-500/10 text-red-400', icon: XCircle },
    refunded: { label: 'Remboursé', class: 'bg-slate-800 text-slate-400', icon: AlertCircle },
  } as any)[payment.status?.toLowerCase() || 'pending'] || { label: payment.status, class: 'bg-slate-800', icon: Clock });

  const opName = payment.metadata?.operator || payment.provider;

  return (
    <Card className={cn(
        "bg-slate-900 border border-white/5 rounded-[2rem] overflow-hidden shadow-xl active:scale-[0.98] transition-all",
        payment.isSimulated && "border-primary/20 bg-primary/[0.02]"
    )}>
      <CardContent className="p-5 flex justify-between items-center">
        <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                <OperatorLogo operatorName={opName} size={42} className="bg-slate-950 p-1" />
            </div>
            <div className="min-w-0">
                <h3 className="text-[13px] font-black text-white uppercase truncate tracking-tight">
                    {payment.courseTitle || (payment.type === 'wallet_topup' ? 'Recharge Wallet' : 'Transaction')}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                        {format(date, 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </span>
                </div>
            </div>
        </div>
        
        <div className="text-right shrink-0">
            <p className={cn("text-base font-black mb-1", payment.status?.toLowerCase() === 'completed' ? "text-emerald-400" : "text-white")}>
                {payment.amount.toLocaleString('fr-FR')} <span className="text-[10px] opacity-40">F</span>
            </p>
            <Badge className={cn("text-[8px] font-black uppercase border-none px-2 py-0.5 rounded-full h-4", statusConfig.class)}>
                {statusConfig.label}
            </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function PayoutItem({ payout }: { payout: any }) {
    const date = (payout.createdAt as any)?.toDate?.() || new Date(payout.createdAt as any || 0);
    
    const statusConfig = (({
        pending: { label: 'En attente', class: 'bg-amber-500/10 text-amber-500 animate-pulse' },
        approved: { label: 'Validé', class: 'bg-blue-500/10 text-blue-400' },
        paid: { label: 'Versé', class: 'bg-emerald-500/10 text-emerald-500' },
        rejected: { label: 'Rejeté', class: 'bg-red-500/10 text-red-500' },
    } as any)[payout.status?.toLowerCase() || 'pending'] || { label: payout.status, class: 'bg-slate-800' } as any);

    return (
        <Card className="bg-slate-900 border border-white/5 rounded-[2rem] overflow-hidden shadow-xl">
            <CardContent className="p-5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
                        <ArrowUpRight className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-black text-white text-[13px] uppercase tracking-tight">Retrait expert</p>
                        <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                            {format(date, 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-base font-black text-red-400">-{payout.amount.toLocaleString('fr-FR')} <span className="text-[10px] opacity-40">F</span></p>
                    <Badge className={cn("text-[8px] font-black uppercase border-none px-2 mt-1", statusConfig.class)}>
                        {statusConfig.label}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ icon: Icon, text }: any) {
    return (
        <div className="py-24 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-20">
            <Icon className="h-16 w-16 mx-auto mb-4 text-slate-700" />
            <p className="font-black uppercase tracking-widest text-xs text-slate-600">{text}</p>
        </div>
    );
}

function ListSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-[2rem] bg-slate-900" />)}
        </div>
    );
}
