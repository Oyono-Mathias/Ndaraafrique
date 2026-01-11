
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

const getStatusBadge = (status: Payment['status']) => {
    switch(status) {
        case 'Completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Complété</Badge>;
        case 'Failed': return <Badge variant="destructive">Échoué</Badge>;
        case 'Refunded': return <Badge variant="secondary" className="dark:bg-slate-700 dark:text-slate-300">Remboursé</Badge>;
        default: return <Badge variant="outline">En attente</Badge>
    }
}


export default function AdminPaymentsPage() {
  const { formaAfriqueUser: adminUser, isUserLoading } = useRole();
  const db = getFirestore();
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
        <h1 className="text-3xl font-bold dark:text-white">Transactions</h1>
        <p className="text-muted-foreground dark:text-slate-400">Historique de toutes les transactions de la plateforme.</p>
      </header>

      {paymentsError && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <p>Une erreur est survenue lors du chargement des transactions. Un index Firestore est peut-être manquant.</p>
        </div>
      )}

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Journal des paiements</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Recherchez des paiements par ID de transaction, nom ou email de l'acheteur.
          </CardDescription>
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              className="max-w-sm pl-10 dark:bg-slate-700 dark:border-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                  <TableHead className="dark:text-slate-400">Acheteur</TableHead>
                  <TableHead className="hidden lg:table-cell dark:text-slate-400">Cours</TableHead>
                  <TableHead className="hidden sm:table-cell dark:text-slate-400">Montant</TableHead>
                   <TableHead className="hidden md:table-cell dark:text-slate-400">Date</TableHead>
                  <TableHead className="text-right dark:text-slate-400">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="dark:border-slate-700">
                      <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full dark:bg-slate-700" /><Skeleton className="h-4 w-32 dark:bg-slate-700" /></div></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-48 dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24 dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32 dark:bg-slate-700" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-6 w-20 rounded-full dark:bg-slate-700" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={payment.user?.profilePictureURL} alt={payment.user?.fullName} />
                            <AvatarFallback>{payment.user?.fullName?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium dark:text-slate-100">{payment.user?.fullName}</span>
                             <p className="text-xs text-muted-foreground dark:text-slate-400 sm:hidden">{formatCurrency(payment.amount, payment.currency)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell dark:text-slate-300">{payment.courseTitle}</TableCell>
                      <TableCell className="hidden sm:table-cell font-mono dark:text-slate-200">{formatCurrency(payment.amount, payment.currency)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground dark:text-slate-400">
                        {payment.date ? format(payment.date.toDate(), 'dd MMM yyyy, HH:mm', { locale: fr }) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {getStatusBadge(payment.status)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="dark:border-slate-700">
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                          <ShoppingCart className="h-12 w-12" />
                          <p className="font-medium">Aucune transaction trouvée</p>
                          <p className="text-sm">
                              {searchTerm 
                                  ? `Aucun résultat pour "${searchTerm}".`
                                  : "Il n'y a pas encore de transactions sur la plateforme."
                              }
                          </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
