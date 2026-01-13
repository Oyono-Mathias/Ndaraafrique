
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, orderBy, where, getDocs } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ShoppingCart, AlertCircle } from 'lucide-react';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';


interface Payment {
  id: string;
  userId: string;
  instructorId: string;
  courseId: string;
  amount: number;
  currency: string;
  date: any; // Firestore Timestamp
  status: 'Completed' | 'Pending' | 'Failed' | 'Refunded';
}

interface EnrichedPayment extends Payment {
    user?: Pick<FormaAfriqueUser, 'fullName' | 'email' | 'profilePictureURL'>;
    courseTitle?: string;
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency }).format(amount);
};

const StatusBadge = ({ status }: { status: Payment['status'] }) => {
    const { t } = useTranslation();
    const statusMap = {
        Completed: { text: t('statusCompleted'), className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
        Failed: { text: t('statusFailed'), className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
        Refunded: { text: t('statusRefunded'), className: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' },
        Pending: { text: t('statusPending'), className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
    };
    const { text, className } = statusMap[status] || { text: status, className: 'bg-slate-100 text-slate-800' };

    return <Badge className={cn('font-semibold', className)}>{text}</Badge>;
}


export default function AdminPaymentsPage() {
  const { formaAfriqueUser: adminUser, isUserLoading } = useRole();
  const db = getFirestore();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const paymentsQuery = useMemoFirebase(
    () => query(collection(db, 'payments'), orderBy('date', 'desc')),
    [db]
  );
  const { data: payments, isLoading: paymentsLoading, error: paymentsError } = useCollection<Payment>(paymentsQuery);

  const [enrichedPayments, setEnrichedPayments] = useState<EnrichedPayment[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(true);

  useEffect(() => {
    if (!payments) return;

    const fetchDetails = async () => {
        setDetailsLoading(true);
        const userIds = [...new Set(payments.map(p => p.userId))];
        const courseIds = [...new Set(payments.map(p => p.courseId))];

        const usersMap = new Map<string, FormaAfriqueUser>();
        if(userIds.length > 0) {
            const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', userIds.slice(0,30))));
            usersSnap.forEach(doc => usersMap.set(doc.id, doc.data() as FormaAfriqueUser));
        }

        const coursesMap = new Map<string, {title: string}>();
        if(courseIds.length > 0) {
            const coursesSnap = await getDocs(query(collection(db, 'courses'), where('__name__', 'in', courseIds.slice(0,30))));
            coursesSnap.forEach(doc => coursesMap.set(doc.id, { title: doc.data().title }));
        }

        const enriched = payments.map(payment => ({
            ...payment,
            user: usersMap.get(payment.userId),
            courseTitle: coursesMap.get(payment.courseId)?.title || 'Cours supprimé'
        }));
        setEnrichedPayments(enriched);
        setDetailsLoading(false);
    }
    fetchDetails();
  }, [payments, db]);

  const filteredPayments = useMemo(() => {
    if (!debouncedSearchTerm) return enrichedPayments;
    return enrichedPayments.filter(payment =>
      payment.user?.fullName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      payment.user?.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [enrichedPayments, debouncedSearchTerm]);

  const isLoading = isUserLoading || paymentsLoading || detailsLoading;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">{t('navTransactions')}</h1>
        <p className="text-muted-foreground dark:text-slate-400">{t('transactionsDescription')}</p>
      </header>

      {paymentsError && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <p>{t('firestoreIndexError')}</p>
        </div>
      )}

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">{t('sales_history')}</CardTitle>
          <CardDescription className="dark:text-slate-400">
            {t('transactionsSearchDescription')}
          </CardDescription>
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="max-w-sm pl-10 dark:bg-slate-700 dark:border-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden sm:block">
             <div className="space-y-1">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg border-b border-transparent">
                      <Skeleton className="h-10 w-10 rounded-full dark:bg-slate-700" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/5 dark:bg-slate-700" />
                        <Skeleton className="h-3 w-2/5 dark:bg-slate-700" />
                      </div>
                       <Skeleton className="h-6 w-24 rounded-full dark:bg-slate-700" />
                    </div>
                  ))
                ) : filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-800/50 border-b border-slate-800 last:border-b-0">
                      <Avatar>
                        <AvatarImage src={payment.user?.profilePictureURL} alt={payment.user?.fullName} />
                        <AvatarFallback>{payment.user?.fullName?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-sm dark:text-white">{payment.user?.fullName}</p>
                        <p className="text-xs text-muted-foreground dark:text-slate-400">{payment.courseTitle}</p>
                      </div>
                      <div className="hidden md:block text-xs text-center text-muted-foreground dark:text-slate-500">
                         {payment.date ? format(payment.date.toDate(), 'dd MMM yy, HH:mm', { locale: fr }) : 'N/A'}
                      </div>
                      <StatusBadge status={payment.status} />
                      <div className="font-mono text-sm text-right font-semibold dark:text-slate-200">
                        {formatCurrency(payment.amount, payment.currency)}
                      </div>
                    </div>
                  ))
                ) : (
                   <div className="h-48 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                      <ShoppingCart className="h-12 w-12" />
                      <p className="font-medium">{t('noTransactionsFound')}</p>
                      <p className="text-sm">
                          {searchTerm 
                              ? t('noResultsFor', { term: searchTerm })
                              : t('noTransactionsYet')
                          }
                      </p>
                  </div>
                )}
             </div>
          </div>

          <div className="sm:hidden space-y-4">
             {isLoading ? (
                [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg dark:bg-slate-700" />)
             ) : filteredPayments.length > 0 ? (
                 filteredPayments.map(payment => (
                    <Card key={payment.id} className="p-3 dark:bg-slate-900/50 dark:border-slate-700">
                        <div className="flex items-start gap-4">
                           <Avatar className="mt-1">
                                <AvatarImage src={payment.user?.profilePictureURL} />
                                <AvatarFallback>{payment.user?.fullName?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-bold dark:text-white">{payment.user?.fullName}</p>
                                <p className="text-sm text-muted-foreground dark:text-slate-400">{payment.courseTitle}</p>
                                 <p className="text-xs text-muted-foreground dark:text-slate-500 mt-1">{payment.date ? format(payment.date.toDate(), 'dd MMM yy, HH:mm', { locale: fr }) : 'N/A'}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-green-600 dark:text-green-400 text-lg">+{formatCurrency(payment.amount, payment.currency)}</p>
                                <StatusBadge status={payment.status} />
                            </div>
                        </div>
                    </Card>
                 ))
             ) : (
                 <div className="h-48 text-center flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                      <ShoppingCart className="h-12 w-12" />
                      <p className="font-medium">{t('noTransactionsFound')}</p>
                    </div>
                </div>
             )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

    