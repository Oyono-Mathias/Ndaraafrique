
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, ShoppingCart } from 'lucide-react';
import type { Payment, Course } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface EnrichedPayment extends Payment {
  courseTitle?: string;
}

const formatCurrency = (amount: number, currency: string = 'XOF') => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
};

const StatusBadge = ({ status }: { status: Payment['status'] }) => {
    const t = useTranslations();
    const statusMap = {
        Completed: { text: 'Terminé', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
        Failed: { text: 'Échoué', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
        Refunded: { text: 'Remboursé', className: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' },
        Pending: { text: 'En attente', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
    };
    const { text, className } = statusMap[status] || { text: status, className: 'bg-slate-100 text-slate-800' };

    return <Badge className={cn('font-semibold', className)}>{text}</Badge>;
}

export default function PaymentHistoryPage() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [payments, setPayments] = useState<EnrichedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading || !currentUser) {
        if(!isUserLoading) setIsLoading(false);
        return;
    }

    const fetchPayments = async () => {
      setIsLoading(true);
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );

      try {
        const snapshot = await getDocs(paymentsQuery);
        const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));

        if (paymentsData.length === 0) {
            setPayments([]);
            setIsLoading(false);
            return;
        }

        const courseIds = [...new Set(paymentsData.map(p => p.courseId))];
        const coursesMap = new Map<string, string>();

        if (courseIds.length > 0) {
            const coursesQuery = query(collection(db, 'courses'), where('__name__', 'in', courseIds.slice(0, 30)));
            const coursesSnap = await getDocs(coursesQuery);
            coursesSnap.forEach(doc => coursesMap.set(doc.id, doc.data().title));
        }

        const enriched = paymentsData.map(payment => ({
            ...payment,
            courseTitle: coursesMap.get(payment.courseId) || 'Cours non disponible'
        }));

        setPayments(enriched);
      } catch (error) {
        console.error("Erreur lors de la récupération de l'historique des paiements:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [currentUser, isUserLoading, db]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Historique des paiements</h1>
        <p className="text-muted-foreground dark:text-slate-400">Consultez toutes vos transactions passées sur Ndara Afrique.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Vos transactions</CardTitle>
          <CardDescription className="dark:text-slate-400">Liste de tous vos achats de cours.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
             <Table>
                <TableHeader>
                    <TableRow className="dark:border-slate-700">
                        <TableHead className="dark:text-slate-400">Date</TableHead>
                        <TableHead className="dark:text-slate-400">Cours</TableHead>
                        <TableHead className="dark:text-slate-400">Montant</TableHead>
                        <TableHead className="text-right dark:text-slate-400">Statut</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        [...Array(3)].map((_, i) => (
                            <TableRow key={i} className="dark:border-slate-700">
                                <TableCell><Skeleton className="h-5 w-24 bg-slate-700" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48 bg-slate-700" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20 bg-slate-700" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-6 w-24 rounded-full bg-slate-700" /></TableCell>
                            </TableRow>
                        ))
                    ) : payments.length > 0 ? (
                        payments.map((payment) => (
                            <TableRow key={payment.id} className="dark:border-slate-700 hover:bg-slate-700/50">
                                <TableCell className="text-sm text-slate-400">
                                    {payment.date ? format(payment.date.toDate(), 'dd MMM yyyy, HH:mm', { locale: fr }) : 'N/A'}
                                </TableCell>
                                <TableCell className="font-medium text-white">{payment.courseTitle}</TableCell>
                                <TableCell className="font-mono font-semibold text-slate-200">{formatCurrency(payment.amount)}</TableCell>
                                <TableCell className="text-right"><StatusBadge status={payment.status} /></TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={4} className="h-48 text-center text-muted-foreground dark:text-slate-400">
                                <ShoppingCart className="mx-auto h-12 w-12" />
                                <p className="mt-2 font-medium">Aucune transaction trouvée</p>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-4">
            {isLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg bg-slate-700" />)
            ) : payments.length > 0 ? (
                payments.map(payment => (
                    <Card key={payment.id} className="p-3 dark:bg-slate-900/50 dark:border-slate-700">
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <p className="font-bold dark:text-white text-sm">{payment.courseTitle}</p>
                                <p className="text-xs text-muted-foreground dark:text-slate-500 mt-1">{payment.date ? format(payment.date.toDate(), 'dd MMM yyyy, HH:mm', { locale: fr }) : 'N/A'}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                                <p className="font-bold text-green-400 text-base">{formatCurrency(payment.amount)}</p>
                                <StatusBadge status={payment.status} />
                            </div>
                        </div>
                    </Card>
                ))
            ) : (
                <div className="h-48 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                    <ShoppingCart className="mx-auto h-12 w-12" />
                    <p className="font-medium">Aucune transaction trouvée</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
