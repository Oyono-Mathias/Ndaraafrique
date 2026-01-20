
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  where,
  getDocs,
  limit,
  onSnapshot,
  documentId
} from 'firebase/firestore';
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
import { Search, ShoppingCart, AlertCircle, CheckCircle, Shield, Loader2 } from 'lucide-react';
import type { NdaraUser, Payment, Course } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { resolveSecurityItem } from '@/actions/securityActions';


interface EnrichedPayment extends Payment {
    user?: NdaraUser;
    courseTitle?: string;
}

const formatCurrency = (amount: number, currency: string = 'XOF') => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
};

const StatusBadge = ({ status }: { status: Payment['status'] }) => {
    const statusMap = {
        Completed: { text: "Terminé", className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
        Failed: { text: "Échoué", className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
        Refunded: { text: "Remboursé", className: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' },
        Pending: { text: "En attente", className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
    };
    const { text, className } = statusMap[status] || { text: status, className: 'bg-slate-100 text-slate-800' };

    return <Badge className={cn('font-semibold', className)}>{text}</Badge>;
}

const FraudBadge = ({ fraudReview }: { fraudReview?: Payment['fraudReview'] }) => {
    if (!fraudReview) return null;
    
    if (fraudReview.isSuspicious && !fraudReview.reviewed) {
        return (
            <Badge className='bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'>
                <AlertCircle className="h-3 w-3 mr-1" />
                Risque: {fraudReview.riskScore}
            </Badge>
        )
    }

    if (!fraudReview.isSuspicious) {
        return (
            <Badge className='bg-green-100/10 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none'>
                <CheckCircle className="h-3 w-3 mr-1" />
                Vérifié
            </Badge>
        )
    }

    return null;
}

const SuspiciousTransactionCard = ({ payment }: { payment: EnrichedPayment }) => {
    const { currentUser } = useRole();
    const { toast } = useToast();
    const [isResolving, setIsResolving] = useState(false);

    const handleResolve = async () => {
        if (!currentUser) return;
        setIsResolving(true);
        const result = await resolveSecurityItem({ 
            itemId: payment.id, 
            itemType: 'suspicious_payment', 
            adminId: currentUser.uid 
        });
        if(result.success) {
            toast({ title: 'Alerte résolue', description: 'La transaction a été marquée comme examinée.' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsResolving(false);
    }
    
    return (
        <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50">
            <div>
                <p className="font-semibold text-sm text-white">{payment.user?.fullName}</p>
                <p className="text-xs text-amber-400">{payment.fraudReview?.reason}</p>
            </div>
            <div className="text-right">
                <p className="font-mono text-base font-semibold text-white">{formatCurrency(payment.amount, payment.currency)}</p>
                <Button size="sm" variant="outline" className="mt-1" onClick={handleResolve} disabled={isResolving}>
                    {isResolving ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Marquer comme résolu'}
                </Button>
            </div>
        </div>
    )
}

export default function AdminPaymentsPage() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [payments, setPayments] = useState<EnrichedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!currentUser || isUserLoading) {
        if (!isUserLoading) setIsLoading(false);
        return;
    }

    const paymentsQuery = query(
        collection(db, 'payments'),
        orderBy('date', 'desc'),
        limit(100)
    );

    const unsubscribe = onSnapshot(paymentsQuery, async (snapshot) => {
        if (snapshot.empty) {
            setPayments([]);
            setIsLoading(false);
            return;
        }

        const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        
        const userIds = [...new Set(paymentsData.map(p => p.userId))];
        const courseIds = [...new Set(paymentsData.map(p => p.courseId))];

        const usersMap = new Map<string, NdaraUser>();
        if (userIds.length > 0) {
             const usersQuery = query(collection(db, 'users'), where('uid', 'in', userIds.slice(0, 30)));
             const usersSnap = await getDocs(usersQuery);
             usersSnap.forEach(doc => usersMap.set(doc.id, doc.data() as NdaraUser));
        }
        
        const coursesMap = new Map<string, Course>();
        if (courseIds.length > 0) {
             const coursesQuery = query(collection(db, 'courses'), where(documentId(), 'in', courseIds.slice(0, 30)));
             const coursesSnap = await getDocs(coursesQuery);
             coursesSnap.forEach(doc => coursesMap.set(doc.id, doc.data() as Course));
        }

        const enriched = paymentsData.map(payment => ({
            ...payment,
            user: usersMap.get(payment.userId),
            courseTitle: coursesMap.get(payment.courseId)?.title || 'Cours introuvable'
        }));

        setPayments(enriched);
        setIsLoading(false);
    }, (err) => {
        console.error(err);
        setError("Erreur de chargement des transactions. Un index Firestore est peut-être manquant.");
        setIsLoading(false);
    });

    return () => unsubscribe();
}, [currentUser, isUserLoading, db]);

  const filteredPayments = useMemo(() => {
    if (!debouncedSearchTerm) return payments;
    return payments.filter(payment =>
      payment.user?.fullName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      payment.user?.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [payments, debouncedSearchTerm]);
  
  const suspiciousTransactions = useMemo(() => {
    return filteredPayments.filter(p => p.fraudReview?.isSuspicious && !p.fraudReview?.reviewed);
  }, [filteredPayments]);


  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Transactions</h1>
        <p className="text-muted-foreground dark:text-slate-400">Suivez toutes les transactions et paiements sur la plateforme.</p>
      </header>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
        </div>
      )}
      
       {suspiciousTransactions.length > 0 && (
          <Card className="dark:bg-amber-900/50 dark:border-amber-700">
             <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-amber-300"><AlertCircle/>Transactions à Examiner</CardTitle>
                <CardDescription className="dark:text-amber-400/80">L'IA a signalé ces transactions comme potentiellement frauduleuses. Veuillez les vérifier.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {suspiciousTransactions.map(payment => (
                       <SuspiciousTransactionCard key={payment.id} payment={payment} />
                    ))}
                </div>
            </CardContent>
          </Card>
      )}


      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Historique des ventes</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Recherchez des transactions spécifiques par nom, email ou ID de transaction.
          </CardDescription>
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une transaction..."
              className="max-w-sm pl-10 dark:bg-slate-700 dark:border-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                  <TableHead className="dark:text-slate-400">Client</TableHead>
                  <TableHead className="dark:text-slate-400">Détails</TableHead>
                  <TableHead className="dark:text-slate-400">Date</TableHead>
                  <TableHead className="dark:text-slate-400">Statut</TableHead>
                  <TableHead className="text-right dark:text-slate-400">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="dark:border-slate-700">
                      <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full dark:bg-slate-700" /><Skeleton className="h-4 w-32 dark:bg-slate-700" /></div></TableCell>
                      <TableCell><Skeleton className="h-4 w-40 dark:bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28 dark:bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full dark:bg-slate-700" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto dark:bg-slate-700" /></TableCell>
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
                                <p className="font-semibold text-sm dark:text-white">{payment.user?.fullName}</p>
                                <p className="text-xs text-muted-foreground dark:text-slate-500">{payment.user?.email}</p>
                            </div>
                          </div>
                      </TableCell>
                       <TableCell>
                           <p className="font-semibold text-sm line-clamp-1 dark:text-white">{payment.courseTitle}</p>
                           <p className="text-xs text-muted-foreground dark:text-slate-500 truncate">ID: {payment.id}</p>
                       </TableCell>
                       <TableCell className="text-xs text-muted-foreground dark:text-slate-400">
                           {payment.date ? format(payment.date.toDate(), 'dd MMM yy, HH:mm', { locale: fr }) : 'N/A'}
                       </TableCell>
                       <TableCell><div className="flex items-center gap-2"><StatusBadge status={payment.status} /> <FraudBadge fraudReview={payment.fraudReview} /></div></TableCell>
                       <TableCell className="font-mono text-sm text-right font-semibold dark:text-slate-200">
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                   <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground dark:text-slate-400">
                        <ShoppingCart className="mx-auto h-12 w-12" />
                        <p className="mt-2 font-medium">Aucune transaction trouvée</p>
                        <p className="text-sm">
                            {searchTerm 
                                ? `Aucun résultat pour "${searchTerm}".`
                                : "Aucune transaction n'a encore été effectuée."
                            }
                        </p>
                    </TableCell>
                   </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-4">
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
                                <p className="font-bold dark:text-white text-sm">{payment.user?.fullName}</p>
                                <p className="text-xs text-muted-foreground dark:text-slate-400">{payment.courseTitle}</p>
                                 <p className="text-xs text-muted-foreground dark:text-slate-500 mt-1">{payment.date ? format(payment.date.toDate(), 'dd MMM yy, HH:mm', { locale: fr }) : 'N/A'}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                                <p className="font-bold font-mono text-base text-green-400">{formatCurrency(payment.amount, payment.currency)}</p>
                                <StatusBadge status={payment.status} />
                            </div>
                        </div>
                         {payment.fraudReview?.isSuspicious && (
                            <div className="mt-2 p-2 bg-amber-900/50 rounded-md text-xs text-amber-300 border border-amber-700/50">
                                <p><b>Risque:</b> {payment.fraudReview.reason}</p>
                            </div>
                        )}
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
