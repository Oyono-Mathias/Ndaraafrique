'use client';

/**
 * @fileOverview Historique financier complet de l'étudiant.
 * ✅ HYBRIDE : Investissements (Achats) & Commissions (Gains Ambassadeur).
 * ✅ STANDARD : Statuts en minuscules.
 */

import { useMemo, useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
    CreditCard, 
    Calendar, 
    CheckCircle2, 
    XCircle, 
    RotateCcw, 
    ArrowUpRight, 
    ShoppingBag, 
    BadgeEuro, 
    Landmark,
    Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Payment, Payout } from '@/lib/types';

export default function StudentPaymentsPage() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();

  // 1. Récupération des Achats
  const paymentsQuery = useMemo(() => 
    currentUser?.uid ? query(collection(db, 'payments'), where('userId', '==', currentUser.uid), orderBy('date', 'desc')) : null,
    [db, currentUser]
  );
  const { data: payments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);

  // 2. Récupération des Retraits de commissions
  const payoutsQuery = useMemo(() => 
    currentUser?.uid ? query(collection(db, 'payouts'), where('instructorId', '==', currentUser.uid), orderBy('date', 'desc')) : null,
    [db, currentUser]
  );
  const { data: payouts, isLoading: payoutsLoading } = useCollection<Payout>(payoutsQuery);

  const isLoading = isUserLoading || paymentsLoading || payoutsLoading;

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
      
      <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-2 text-primary mb-2">
            <CreditCard className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Espace Financier</span>
        </div>
        <h1 className="text-3xl font-black text-white leading-tight">Mes <br/><span className="text-primary">Transactions</span></h1>
      </header>

      <Tabs defaultValue="purchases" className="w-full">
        <TabsList className="w-full bg-transparent border-b border-slate-800 rounded-none h-12 p-0 px-4 justify-start gap-6">
          <TabsTrigger value="purchases" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-0 font-bold text-[10px] uppercase tracking-widest text-slate-500">
            Mes Formations
          </TabsTrigger>
          <TabsTrigger value="commissions" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-0 font-bold text-[10px] uppercase tracking-widest text-slate-500">
            Mes Gains Ambassadeur
          </TabsTrigger>
        </TabsList>

        <div className="px-4 mt-6">
          <TabsContent value="purchases" className="m-0 space-y-4">
            {isLoading ? <ListSkeleton /> : payments && payments.length > 0 ? (
                payments.map(p => <PaymentItem key={p.id} payment={p} />)
            ) : <EmptyState icon={ShoppingBag} text="Aucun achat enregistré" />}
          </TabsContent>

          <TabsContent value="commissions" className="m-0 space-y-4">
            {isLoading ? <ListSkeleton /> : payouts && payouts.length > 0 ? (
                payouts.map(p => <PayoutItem key={p.id} payout={p} />)
            ) : <EmptyState icon={BadgeEuro} text="Aucun retrait effectué" />}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function PaymentItem({ payment }: { payment: Payment }) {
  const date = (payment.date as any)?.toDate?.() || new Date();
  
  // ✅ STANDARD : Utilisation de Record avec statuts en minuscules pour la cohérence
  const config: Record<Payment['status'], { label: string; class: string }> = {
    completed: { label: 'Réussi', class: 'bg-green-500/10 text-green-400' },
    pending: { label: 'En attente', class: 'bg-amber-500/10 text-amber-400' },
    failed: { label: 'Échoué', class: 'bg-red-500/10 text-red-400' },
    refunded: { label: 'Remboursé', class: 'bg-slate-500/10 text-slate-400' },
  };

  const statusInfo = config[payment.status] || { label: payment.status, class: 'bg-slate-800' };

  return (
    <Card className="bg-slate-900/50 border-slate-800 overflow-hidden shadow-xl">
      <CardContent className="p-5 flex justify-between items-center">
        <div>
            <h3 className="text-sm font-bold text-white line-clamp-1 uppercase tracking-tight">{payment.courseTitle || 'Formation Ndara'}</h3>
            <div className="flex items-center gap-2 mt-1">
                <Badge className={cn("text-[8px] font-black uppercase border-none px-2", statusInfo.class)}>{statusInfo.label}</Badge>
                <span className="text-[10px] text-slate-600 font-bold">{format(date, 'dd MMM yyyy', { locale: fr })}</span>
            </div>
        </div>
        <div className="text-right">
            <p className="text-lg font-black text-white">{payment.amount.toLocaleString('fr-FR')}</p>
            <p className="text-[8px] font-black text-primary uppercase tracking-widest mt-0.5">XOF</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PayoutItem({ payout }: { payout: Payout }) {
    const date = (payout.date as any)?.toDate?.() || new Date();
    const isSuccess = payout.status === 'valide';
    const isPending = payout.status === 'en_attente';

    return (
        <Card className="bg-slate-900/50 border-slate-800 overflow-hidden shadow-xl">
            <CardContent className="p-5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center",
                        isSuccess ? "bg-emerald-500/10 text-emerald-500" : isPending ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-500"
                    )}>
                        <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-bold text-white text-sm">Retrait Mobile Money</p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter mt-0.5">
                            {format(date, 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-white">-{payout.amount.toLocaleString('fr-FR')}</p>
                    <Badge className={cn(
                        "text-[8px] font-black uppercase border-none px-2 mt-1",
                        isSuccess ? "bg-emerald-500/10 text-emerald-500" : isPending ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-500"
                    )}>
                        {payout.status === 'valide' ? 'Terminé' : payout.status === 'en_attente' ? 'En cours' : 'Rejeté'}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ icon: Icon, text }: any) {
    return (
        <div className="py-20 text-center flex flex-col items-center opacity-30">
            <Icon className="h-16 w-16 mb-4 text-slate-600" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-500">{text}</p>
        </div>
    );
}

function ListSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-slate-900" />)}
        </div>
    );
}
