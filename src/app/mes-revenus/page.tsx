
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
  serverTimestamp
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

const getStatusBadge = (status: 'valide' | 'en_attente' | 'rejete') => {
  switch (status) {
    case 'valide':
      return <Badge className="bg-green-100 text-green-800">Validé</Badge>;
    case 'en_attente':
      return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
    case 'rejete':
      return <Badge variant="destructive">Rejeté</Badge>;
    default:
      return <Badge variant="secondary">Inconnu</Badge>;
  }
};


const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string, icon: React.ElementType, isLoading: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-3/4" />
      ) : (
        <div className="text-2xl font-bold font-mono">{value}</div>
      )}
    </CardContent>
  </Card>
);

export default function MyRevenuePage() {
  const { formaAfriqueUser: instructor, isUserLoading: isInstructorLoading } = useRole();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const db = getFirestore();
  const WITHDRAWAL_THRESHOLD = 5000;

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
    
    let paymentsUnsubscribe: () => void = () => {};
    let payoutsUnsubscribe: () => void = () => {};

    try {
        const paymentsQuery = query(collection(db, 'payments'), where('instructorId', '==', instructor.uid), orderBy('date', 'desc'));
        paymentsUnsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
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
            setError("Impossible de charger vos transactions.");
        });

        const payoutsQuery = query(collection(db, 'payouts'), where('instructorId', '==', instructor.uid), orderBy('date', 'desc'));
        payoutsUnsubscribe = onSnapshot(payoutsQuery, (snapshot) => {
            const fetchedPayouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payout[];
            setPayouts(fetchedPayouts);
            setIsLoading(false);
        }, (err) => {
            console.error("Erreur de chargement des retraits:", err);
            setError("Impossible de charger l'historique des retraits.");
            setIsLoading(false);
        });

    } catch (e) {
        console.error("Erreur lors de la configuration des listeners:", e);
        setError("Une erreur inattendue est survenue.");
        setIsLoading(false);
    }
    
    return () => {
      paymentsUnsubscribe();
      payoutsUnsubscribe();
    };
  }, [instructor, isInstructorLoading, db]);

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
    
    const platformCommissionRate = 0.3;
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
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()); // This needs proper date parsing for sorting

    return {
      totalRevenue: total,
      monthlyRevenue: monthly,
      availableBalance: balance,
      revenueTrendData: trendData
    };
  }, [transactions, payouts]);

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
     if (data.amount < WITHDRAWAL_THRESHOLD) {
        toast({
            variant: "destructive",
            title: "Montant invalide",
            description: `Le montant minimum pour un retrait est de ${formatCurrency(WITHDRAWAL_THRESHOLD)}.`,
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

  const chartConfig = { revenue: { label: 'Gains', color: 'hsl(var(--primary))' }};

  return (
    <div className="space-y-8 text-foreground">
      <header>
        <h1 className="text-3xl font-bold">Mes Revenus</h1>
        <p className="text-muted-foreground">Suivez vos gains et l'historique de vos transactions.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-1 lg:col-span-2">
           <CardHeader>
                <CardTitle className="text-sm font-medium">Solde Disponible</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-12 w-3/4" /> : (
                  <p className="text-5xl font-bold font-mono tracking-tighter">{formatCurrency(availableBalance)}</p>
                )}
            </CardContent>
            <CardFooter>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                       <Button disabled={availableBalance < WITHDRAWAL_THRESHOLD || isLoading} className="w-full sm:w-auto">
                            <Landmark className="mr-2 h-4 w-4" />
                            Demander un retrait
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Demande de Retrait</DialogTitle>
                            <DialogDescription>
                                Le montant minimum est de {formatCurrency(WITHDRAWAL_THRESHOLD)}. Votre solde est de <strong className="font-mono">{formatCurrency(availableBalance)}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Montant du retrait</FormLabel>
                                        <FormControl><Input type="number" placeholder="5000" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="method" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Méthode de paiement</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez une méthode" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Mobile Money">Mobile Money (Orange, Moov)</SelectItem>
                                                <SelectItem value="Virement">Virement bancaire</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Soumettre la demande
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
        <StatCard title="Revenu Brut (ce mois-ci)" value={formatCurrency(monthlyRevenue)} icon={Calendar} isLoading={isLoading} />
        <StatCard title="Revenu Brut (Total)" value={formatCurrency(totalRevenue)} icon={DollarSign} isLoading={isLoading} />
      </section>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
        </div>
      )}
      
       <section>
          <h2 className="text-2xl font-semibold mb-4">Gains par mois (votre part)</h2>
           <Card>
                <CardContent className="pt-6">
                    {isLoading ? <Skeleton className="h-80 w-full" /> : (
                        <ChartContainer config={chartConfig} className="h-80 w-full">
                            <ResponsiveContainer>
                                <BarChart data={revenueTrendData}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                    <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)}/>} />
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
          <h2 className="text-2xl font-semibold mb-4">Historique des transactions</h2>
          <Card className="bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Détails</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-right">Votre Part (70%)</TableHead>
                    <TableHead className="text-right">Commission (30%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground">{tx.date ? format(tx.date.toDate(), 'dd/MM/yy', { locale: fr }) : 'N/A'}</TableCell>
                        <TableCell className="font-medium max-w-xs truncate">{tx.courseTitle}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(tx.amount)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-green-600">{formatCurrency(tx.amount * 0.7)}</TableCell>
                        <TableCell className="text-right font-mono text-red-600">{formatCurrency(tx.amount * 0.3)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Aucune transaction trouvée.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section>
            <h2 className="text-2xl font-semibold mb-4">Historique des retraits</h2>
            <Card className="bg-card">
            <CardContent className="p-0">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                    [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell>
                        </TableRow>
                    ))
                    ) : payouts.length > 0 ? (
                    payouts.map((payout) => (
                        <TableRow key={payout.id}>
                        <TableCell className="text-muted-foreground">{payout.date ? format(payout.date.toDate(), 'dd/MM/yy', { locale: fr }) : 'N/A'}</TableCell>
                        <TableCell>{payout.method}</TableCell>
                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                        <TableCell className="text-right font-semibold font-mono">{formatCurrency(payout.amount)}</TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Aucune demande de retrait.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
        </section>
      </div>

    </div>
  );
}

    