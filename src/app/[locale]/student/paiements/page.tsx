
'use client';

/**
 * @fileOverview Historique des paiements pour l'étudiant.
 * Design Android-First & Vintage.
 * Connecté en temps réel à la collection 'payments' de Firestore.
 */

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Calendar, CheckCircle2, XCircle, RotateCcw, ArrowRight, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Payment } from '@/lib/types';

export default function StudentPaymentsPage() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();

  // 1. Récupération de l'historique des paiements
  const paymentsQuery = useMemo(() => 
    currentUser?.uid 
      ? query(
          collection(db, 'payments'), 
          where('userId', '==', currentUser.uid),
          orderBy('date', 'desc')
        )
      : null,
    [db, currentUser]
  );

  const { data: payments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);

  const isLoading = isUserLoading || paymentsLoading;

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
      
      {/* --- HEADER --- */}
      <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-2 text-primary mb-2">
            <CreditCard className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Finances</span>
        </div>
        <h1 className="text-3xl font-black text-white leading-tight">Mes <br/><span className="text-primary">Paiements</span></h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">Retrouvez le détail de vos investissements dans votre savoir.</p>
      </header>

      <div className="px-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-3xl bg-slate-900" />
            ))}
          </div>
        ) : payments && payments.length > 0 ? (
          <div className="grid gap-4">
            {payments.map((payment) => (
              <PaymentItem key={payment.id} payment={payment} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* --- RÉASSURANCE --- */}
      {!isLoading && payments && payments.length > 0 && (
        <div className="px-6 py-8 text-center opacity-40">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                Toutes vos transactions sont sécurisées par cryptage SSL
            </p>
        </div>
      )}
    </div>
  );
}

function PaymentItem({ payment }: { payment: Payment }) {
  const paymentDate = (payment.date as any)?.toDate?.() || new Date();
  
  const statusConfig = {
    Completed: { label: 'Réussi', icon: CheckCircle2, class: 'bg-green-500/10 text-green-400' },
    Pending: { label: 'En attente', icon: Calendar, class: 'bg-amber-500/10 text-amber-400' },
    Failed: { label: 'Échoué', icon: XCircle, class: 'bg-red-500/10 text-red-400' },
    Refunded: { label: 'Remboursé', icon: RotateCcw, class: 'bg-slate-500/10 text-slate-400' },
  };

  const config = statusConfig[payment.status] || statusConfig.Pending;

  return (
    <Card className="bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl transition-all active:scale-[0.98]">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-white line-clamp-1 uppercase tracking-tight">
              {payment.courseTitle || 'Formation Ndara'}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold">
              ID: {payment.id.substring(0, 12).toUpperCase()}
            </p>
          </div>
          <Badge className={cn("border-none text-[9px] font-black uppercase px-2", config.class)}>
            <config.icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>

        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(paymentDate, 'dd MMMM yyyy', { locale: fr })}</span>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xl font-black text-white leading-none">
              {payment.amount.toLocaleString('fr-FR')}
            </p>
            <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-1">
              {payment.currency || 'XOF'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800/50">
      <div className="p-6 bg-slate-800/50 rounded-full mb-6">
        <ShoppingBag className="h-16 w-16 text-slate-700" />
      </div>
      <h3 className="text-xl font-black text-white leading-tight">Aucun achat <br/>enregistré.</h3>
      <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-[220px] mx-auto font-medium">
        Commencez votre aventure en explorant notre catalogue de formations.
      </p>
      <Button asChild className="mt-8 bg-primary hover:bg-primary/90 text-white rounded-xl h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
        <Link href="/search">
          Voir les cours
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
