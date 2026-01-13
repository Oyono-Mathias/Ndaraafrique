
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
} from 'firebase/firestore';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Wallet, Calendar, AlertTriangle, Loader2, Landmark } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { sendAdminNotification } from '../actions/notificationActions';


interface Transaction {
  id: string;
  amount: number;
  date: Timestamp;
  courseTitle: string;
  studentName: string;
  status: 'Completed' | 'Pending' | 'Failed';
}

interface Payout {
    id: string;
    amount: number;
    date: Timestamp;
    method: 'Mobile Money' | 'Virement';
    status: 'en_attente' | 'valide' | 'rejete';
}

const payoutFormSchema = z.object({
  amount: z.coerce.number().positive("Le montant doit être supérieur à 0."),
  method: z.string({ required_error: "Veuillez sélectionner une méthode." }),
});

const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('fr-FR')} XOF`;
};

const getStatusBadge = (status: 'valide' | 'en_attente' | 'rejete', t: (key: string) => string) => {
  switch (status) {
    case 'valide':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">{t('payout_status_approved')}</Badge>;
    case 'en_attente':
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">{t('payout_status_pending')}</Badge>;
    case 'rejete':
      return <Badge variant="destructive">{t('payout_status_rejected')}</Badge>;
    default:
      return <Badge variant="secondary">{t('payout_status_unknown')}</Badge>;
  }
};


const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string, icon: React.ElementType, isLoading: boolean }) => (
  <Card className="dark:bg-slate-800 dark:border-slate-700">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium dark:text-slate-400">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-3/4 dark:bg-slate-700" />
      ) : (
        <div className="text-2xl font-bold font-mono dark:text-white">{value}</div>
      )}
    </CardContent>
  </Card>
);

export default function MyRevenuePage() {
  const { formaAfriqueUser: instructor, isUserLoading: isInstructorLoading } = useRole();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [settings, setSettings] = useState({ platformCommission: 30, minPayoutThreshold: 5000 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const db = getFirestore();
  

  const form = useForm<z.infer<typeof payoutFormSchema>>({
    resolver: zodResolver(payoutFormSchema),
    defaultValues: {
      amount: 0,
    },
  });

  useEffect(() => {
    if (!instructor?.uid) {
      if (!isInstructorLoading) setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    const unsubscribes: (() => void)[] = [];

    // Fetch settings
    const settingsRef = doc(db, 'settings', 'global');
    unsubscribes.push(onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            const commercialSettings = docSnap.data().commercial;
            setSettings({
                platformCommission: commercialSettings?.platformCommission || 30,
                minPayoutThreshold: commercialSettings?.minPayoutThreshold || 5000,
            });
        }
    }));
    
    // Fetch payments
    const paymentsQuery = query(collection(db, 'payments'), where('instructorId', '==', instructor.uid), orderBy('date', 'desc'));
    unsubscribes.push(onSnapshot(paymentsQuery, (snapshot) => {
        const fetchedTransactions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          courseTitle: doc.data().courseTitle || 'Cours non spécifié',
          studentName: doc.data().studentName || 'Étudiant inconnu',
        })) as Transaction[];
        setTransactions(fetchedTransactions);
        setError(null);
    }, (err) => {
        console.error("Erreur de chargement des revenus:", err);
        setError(t('error_loading_transactions'));
    }));

    // Fetch payouts
    const payoutsQuery = query(collection(db, 'payouts'), where('instructorId', '==', instructor.uid), orderBy('date', 'desc'));
    unsubscribes.push(onSnapshot(payoutsQuery, (snapshot) => {
        const fetchedPayouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payout[];
        setPayouts(fetchedPayouts);
        setIsLoading(false); // Consider loading finished after all initial data is fetched
    }, (err) => {
        console.error("Erreur de chargement des retraits:", err);
        setError(t('error_loading_payouts'));
        setIsLoading(false);
    }));
    
    return () => unsubscribes.forEach(unsub => unsub());
  }, [instructor, isInstructorLoading, db, t]);

  const { totalRevenue, monthlyRevenue, availableBalance, revenueTrendData } = useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);

    const completedTransactions = transactions.filter(t => t.status === 'Completed');
    
    const total = completedTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    const monthly = completedTransactions
      .filter(t => t.date?.toDate() >= startOfCurrentMonth)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalPayouts = payouts
        .filter(p => p.status === 'valide' || p.status === 'en_attente')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    const platformCommissionRate = settings.platformCommission / 100;
    const instructorShare = total * (1 - platformCommissionRate);

    const balance = instructorShare - totalPayouts;

    const monthlyAggregates: Record<string, number> = {};
    completedTransactions.forEach(t => {
        if (t.date instanceof Timestamp) {
            const date = t.date.toDate();
            const monthKey = format(date, 'MMM yy', { locale: fr });
            monthlyAggregates[monthKey] = (monthlyAggregates[monthKey] || 0) + (t.amount * (1 - platformCommissionRate) || 0);
        }
    });

    const trendData = Object.entries(monthlyAggregates)
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    return {
      totalRevenue: total,
      monthlyRevenue: monthly,
      availableBalance: balance,
      revenueTrendData: trendData
    };
  }, [transactions, payouts, settings.platformCommission]);

  async function onSubmit(data: z.infer<typeof payoutFormSchema>) {
    if (!instructor) return;
    
    if (data.amount > availableBalance) {
        toast({
            variant: "destructive",
            title: "Montant invalide",
            description: `Le montant demandé dépasse votre solde disponible de ${formatCurrency(availableBalance)}.`,
        });
        return;
    }
     if (data.amount < settings.minPayoutThreshold) {
        toast({
            variant: "destructive",
            title: "Montant invalide",
            description: `Le montant minimum pour un retrait est de ${formatCurrency(settings.minPayoutThreshold)}.`,
        });
        return;
    }
    
    setIsSubmitting(true);
    const payoutPayload = {
      instructorId: instructor.uid,
      amount: data.amount,
      method: data.method,
      status: 'en_attente',
      date: serverTimestamp(),
    };

    try {
        const payoutsCollection = collection(db, 'payouts');
        await addDoc(payoutsCollection, payoutPayload);

        await sendAdminNotification({
            title: '💰 Nouvelle demande de retrait',
            body: `${instructor.fullName} a demandé un retrait de ${formatCurrency(data.amount)}.`,
            link: '/admin/payouts'
        });

        toast({
            title: "Demande de retrait soumise",
            description: "Votre demande est en cours de traitement.",
        });
        setIsDialogOpen(false);
        form.reset();
    } catch(err) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'payouts',
            operation: 'create',
            requestResourceData: payoutPayload,
        }));
    } finally {
        setIsSubmitting(false);
    }
  }

  const chartConfig = { revenue: { label: t('revenue_gains'), color: 'hsl(var(--primary))' }};

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">{t('revenue_title')}</h1>
        <p className="text-muted-foreground dark:text-slate-400">{t('revenue_description')}</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="lg:col-span-2 dark:bg-slate-800/80 dark:border-slate-700 p-6 flex flex-col justify-between">
           <div>
                <CardTitle className="text-sm font-medium text-slate-400">{t('revenue_available_balance')}</CardTitle>
                {isLoading ? <Skeleton className="h-16 w-3/4 mt-2 bg-slate-700" /> : (
                  <p className="text-5xl font-bold font-mono tracking-tighter text-white mt-2">{formatCurrency(availableBalance)}</p>
                )}
           </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button disabled={availableBalance < settings.minPayoutThreshold || isLoading} className="w-full sm:w-auto mt-4 h-12 text-base">
                        <Landmark className="mr-2 h-4 w-4" />
                        {t('revenue_request_payout_button')}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] dark:bg-slate-900 dark:border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="dark:text-white">{t('revenue_request_payout_button')}</DialogTitle>
                        <DialogDescription className="dark:text-slate-400">
                           {t('revenue_modal_desc', { threshold: formatCurrency(settings.minPayoutThreshold), balance: formatCurrency(availableBalance) })}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                            <FormField control={form.control} name="amount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="dark:text-slate-300">{t('revenue_modal_amount')}</FormLabel>
                                    <FormControl><Input type="number" placeholder="5000" {...field} className="dark:bg-slate-800 dark:border-slate-700" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="method" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="dark:text-slate-300">{t('revenue_modal_method')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="dark:bg-slate-800 dark:border-slate-700"><SelectValue placeholder={t('revenue_modal_select_method')} /></SelectTrigger></FormControl>
                                        <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                            <SelectItem value="Mobile Money">{t('revenue_method_momo')}</SelectItem>
                                            <SelectItem value="Virement">{t('revenue_method_transfer')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('revenue_modal_submit')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </Card>
        <StatCard title={t('revenue_monthly_gross')} value={formatCurrency(monthlyRevenue)} icon={Calendar} isLoading={isLoading} />
        <StatCard title={t('revenue_total_gross')} value={formatCurrency(totalRevenue)} icon={DollarSign} isLoading={isLoading} />
      </section>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
        </div>
      )}
      
       <section>
          <h2 className="text-2xl font-semibold mb-4 dark:text-white">{t('revenue_chart_title')}</h2>
           <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardContent className="pt-6">
                    {isLoading ? <Skeleton className="h-80 w-full dark:bg-slate-700" /> : (
                        <ChartContainer config={chartConfig} className="h-80 w-full">
                            <ResponsiveContainer>
                                <BarChart data={revenueTrendData}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="dark:stroke-slate-700" />
                                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                    <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} className="dark:bg-slate-900 dark:border-slate-700" />} />
                                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={8} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
       </section>

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4 dark:text-white">{t('revenue_transactions_title')}</h2>
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="p-0">
              <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:border-slate-700 dark:hover:bg-slate-700/50">
                        <TableHead className="dark:text-slate-400">{t('date')}</TableHead>
                        <TableHead className="dark:text-slate-400">{t('details')}</TableHead>
                        <TableHead className="text-right dark:text-slate-400">{t('revenue_your_share')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        [...Array(3)].map((_, i) => (
                          <TableRow key={i} className="dark:border-slate-700">
                            <TableCell><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-40 dark:bg-slate-700" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-20 dark:bg-slate-700" /></TableCell>
                          </TableRow>
                        ))
                      ) : transactions.length > 0 ? (
                        transactions.map((tx) => (
                          <TableRow key={tx.id} className="dark:border-slate-700 dark:hover:bg-slate-700/50">
                            <TableCell className="text-muted-foreground dark:text-slate-400">{tx.date ? format(tx.date.toDate(), 'dd/MM/yy', { locale: fr }) : 'N/A'}</TableCell>
                            <TableCell className="font-medium max-w-xs truncate dark:text-slate-100">{tx.courseTitle}</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-green-600 dark:text-green-400">{formatCurrency(tx.amount * (1 - settings.platformCommission / 100))}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow className="dark:border-slate-700">
                          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground dark:text-slate-400">
                            {t('revenue_no_transactions')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
              </div>
              <div className="sm:hidden p-4 space-y-4">
                 {isLoading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg dark:bg-slate-700" />)
                 ) : transactions.length > 0 ? (
                     transactions.map(tx => (
                        <Card key={tx.id} className="p-3 dark:bg-slate-900/50 dark:border-slate-700">
                            <div className="flex justify-between items-start">
                                <p className="font-semibold text-sm dark:text-white">{tx.courseTitle}</p>
                                <p className="font-bold font-mono text-green-600 dark:text-green-400">{formatCurrency(tx.amount * (1 - settings.platformCommission / 100))}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 dark:text-slate-400">{t('date_on')} {tx.date ? format(tx.date.toDate(), 'dd MMM yyyy', { locale: fr }) : 'N/A'}</p>
                        </Card>
                     ))
                 ) : (
                    <div className="h-24 text-center flex items-center justify-center text-muted-foreground dark:text-slate-400">{t('revenue_no_transactions')}</div>
                 )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">{t('revenue_payouts_title')}</h2>
            <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="p-0">
                <div className="hidden sm:block">
                    <Table>
                        <TableHeader>
                            <TableRow className="dark:border-slate-700 dark:hover:bg-slate-700/50">
                                <TableHead className="dark:text-slate-400">{t('date')}</TableHead>
                                <TableHead className="dark:text-slate-400">{t('method')}</TableHead>
                                <TableHead className="dark:text-slate-400">{t('status')}</TableHead>
                                <TableHead className="text-right dark:text-slate-400">{t('amount')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <TableRow key={i} className="dark:border-slate-700">
                                <TableCell><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-28 dark:bg-slate-700" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20 rounded-full dark:bg-slate-700" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-20 dark:bg-slate-700" /></TableCell>
                                </TableRow>
                            ))
                            ) : payouts.length > 0 ? (
                            payouts.map((payout) => (
                                <TableRow key={payout.id} className="dark:border-slate-700 dark:hover:bg-slate-700/50">
                                <TableCell className="text-muted-foreground dark:text-slate-400">{payout.date ? format(payout.date.toDate(), 'dd/MM/yy', { locale: fr }) : 'N/A'}</TableCell>
                                <TableCell className="dark:text-slate-200">{payout.method}</TableCell>
                                <TableCell>{getStatusBadge(payout.status, t)}</TableCell>
                                <TableCell className="text-right font-semibold font-mono dark:text-white">{formatCurrency(payout.amount)}</TableCell>
                                </TableRow>
                            ))
                            ) : (
                            <TableRow className="dark:border-slate-700">
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground dark:text-slate-400">
                                {t('revenue_no_payouts')}
                                </TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                 <div className="sm:hidden p-4 space-y-4">
                     {isLoading ? (
                        [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg dark:bg-slate-700" />)
                     ) : payouts.length > 0 ? (
                         payouts.map(payout => (
                            <Card key={payout.id} className="p-3 dark:bg-slate-900/50 dark:border-slate-700">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(payout.status, t)}
                                        <p className="font-semibold text-sm dark:text-white">{payout.method}</p>
                                    </div>
                                    <p className="font-bold font-mono dark:text-white">{formatCurrency(payout.amount)}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 dark:text-slate-400">{t('date_on')} {payout.date ? format(payout.date.toDate(), 'dd MMM yyyy', { locale: fr }) : 'N/A'}</p>
                            </Card>
                         ))
                     ) : (
                        <div className="h-24 text-center flex items-center justify-center text-muted-foreground dark:text-slate-400">{t('revenue_no_payouts')}</div>
                     )}
                </div>
            </CardContent>
            </Card>
        </section>
      </div>

    </div>
  );
}
