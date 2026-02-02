'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, ResponsiveContainer, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfMonth, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Wallet, Calendar, Loader2, TrendingUp, Info } from 'lucide-react';
import type { Payment, Payout } from '@/lib/types';
import { requestPayout } from '@/actions/payoutActions';
import { StatCard } from '@/components/dashboard/StatCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface RevenueDataPoint {
  month: string;
  revenue: number;
}

export default function RevenusPage() {
    const { currentUser: instructor, isUserLoading, role } = useRole();
    const db = getFirestore();
    const { toast } = useToast();

    const [payments, setPayments] = useState<Payment[]>([]);
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [chartData, setChartData] = useState<RevenueDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [payoutAmount, setPayoutAmount] = useState('');
    const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

    // Memoize statistics with robust toDate checks
    const stats = useMemo(() => {
        const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
        const now = new Date();
        const monthlyRevenue = payments
            .filter(p => {
                const pDate = p.date && typeof (p.date as any).toDate === 'function' 
                    ? (p.date as any).toDate() 
                    : null;
                return pDate && isSameMonth(pDate, now);
            })
            .reduce((sum, p) => sum + p.amount, 0);

        const totalPayouts = payouts
            .filter(p => p.status === 'valide' || p.status === 'en_attente')
            .reduce((sum, p) => sum + p.amount, 0);
            
        const availableBalance = totalRevenue - totalPayouts;

        return { totalRevenue, monthlyRevenue, availableBalance };
    }, [payments, payouts]);

    // Effect for fetching data
    useEffect(() => {
        if (!instructor?.uid || isUserLoading || role !== 'instructor') {
            if (!isUserLoading) setIsLoading(false);
            return;
        }
        
        setIsLoading(true);

        const paymentsQuery = query(
           collection(db, 'payments'),
            where('userId', '==', instructor.uid), 
            where('status', '==', 'Completed')
        );

        const payoutsQuery = query(
            collection(db, 'payouts'),
            where('instructorId', '==', instructor.uid)
        );

        const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
            const fetchedPayments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            
            // Safe sorting for toDate
            setPayments(fetchedPayments.sort((a, b) => {
                const dateB = b.date && typeof (b.date as any).toDate === 'function' ? (b.date as any).toDate().getTime() : 0;
                const dateA = a.date && typeof (a.date as any).toDate === 'function' ? (a.date as any).toDate().getTime() : 0;
                return dateB - dateA;
            }));
            
            const monthlyAggregates: Record<string, number> = {};
            fetchedPayments.forEach(p => {
                if (p.date && typeof (p.date as any).toDate === 'function') {
                    const date = (p.date as any).toDate();
                    const monthKey = format(date, 'yyyy-MM');
                    monthlyAggregates[monthKey] = (monthlyAggregates[monthKey] || 0) + p.amount;
                }
            });
            const trendData = Object.keys(monthlyAggregates)
                .sort()
                .map(monthKey => ({
                    month: format(new Date(monthKey + '-01'), 'MMM yy', { locale: fr }),
                    revenue: monthlyAggregates[monthKey]
                }));
            setChartData(trendData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching payments:", error);
            setIsLoading(false);
        });

        const unsubscribePayouts = onSnapshot(payoutsQuery, (snapshot) => {
            const fetchedPayouts = snapshot.docs.map(doc => doc.data() as Payout);
            setPayouts(fetchedPayouts);
        }, (error) => {
            console.error("Error fetching payouts:", error);
        });
        
        return () => {
            unsubscribePayments();
            unsubscribePayouts();
        };

    }, [instructor?.uid, isUserLoading, db, role]);

    const handleRequestPayout = async () => {
        const amount = parseFloat(payoutAmount);
        if (!instructor || !amount || amount <= 0) {
            toast({ variant: "destructive", title: "Montant invalide" });
            return;
        }
        if (amount > stats.availableBalance) {
            toast({ variant: "destructive", title: "Solde insuffisant" });
            return;
        }
        
        setIsSubmittingPayout(true);
        const result = await requestPayout({ instructorId: instructor.uid, amount });
        
        if (result.success) {
            toast({ title: "Demande de retrait envoyée", description: "Votre demande sera traitée bientôt." });
            setPayoutAmount('');
        } else {
            toast({ variant: "destructive", title: "Erreur", description: result.error });
        }
        setIsSubmittingPayout(false);
    };
    
    const chartConfig = {
        revenue: { label: "Revenus", color: 'hsl(var(--primary))' },
    };

    return (
      <div className="space-y-8 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
        <header>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Mes Revenus</h1>
            <p className="text-slate-500 dark:text-muted-foreground">Suivez vos gains et gérez vos paiements.</p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <StatCard title="Solde disponible" value={`${stats.availableBalance.toLocaleString('fr-FR')} XOF`} icon={Wallet} isLoading={isLoading} />
            <StatCard title="Revenus (ce mois-ci)" value={`${stats.monthlyRevenue.toLocaleString('fr-FR')} XOF`} icon={Calendar} isLoading={isLoading} />
            <StatCard title="Revenus totaux" value={`${stats.totalRevenue.toLocaleString('fr-FR')} XOF`} icon={DollarSign} isLoading={isLoading} />
        </section>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <SectionHeader title="Évolution des revenus" className="mb-4" />
                <Card className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 shadow-sm">
                    <CardContent className="pt-6">
                         {isLoading ? <Skeleton className="h-80 w-full bg-slate-200 dark:bg-slate-700" /> : chartData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-80 w-full">
                                <BarChart data={chartData}>
                                    <CartesianGrid vertical={false} className="stroke-slate-200 dark:stroke-slate-700"/>
                                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} className="fill-slate-500 dark:fill-slate-400 text-xs" />
                                    <YAxis tickFormatter={(v) => `${Number(v) / 1000}k`} className="fill-slate-500 dark:fill-slate-400 text-xs"/>
                                    <Tooltip content={<ChartTooltipContent indicator="dot" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" formatter={(v) => `${(v as number).toLocaleString('fr-FR')} XOF`} />} />
                                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        ) : <EmptyState icon={TrendingUp} title="Graphique Indisponible" description="Les données sur vos revenus apparaîtront ici dès que vous réaliserez des ventes."/>}
                    </CardContent>
                </Card>
            </div>
            
            <div className="lg:col-span-1">
                 <SectionHeader title="Demande de retrait" className="mb-4" />
                 <Card className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 shadow-sm">
                    <CardHeader><CardTitle className="text-base">Nouveau retrait</CardTitle><CardDescription>Le solde disponible peut être viré sur votre compte.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-muted-foreground">Solde actuel</p>
                            {isLoading ? <Skeleton className="h-8 w-32 mt-1 bg-slate-200 dark:bg-slate-700" /> : <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.availableBalance.toLocaleString('fr-FR')} XOF</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Montant</label>
                            <Input type="number" placeholder="Ex: 50000" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} disabled={isSubmittingPayout || isLoading}/>
                        </div>
                        <Button onClick={handleRequestPayout} disabled={isSubmittingPayout || isLoading || !payoutAmount || stats.availableBalance <= 0} className="w-full">
                             {isSubmittingPayout && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Demander le retrait
                        </Button>
                    </CardContent>
                    <CardFooter>
                        <p className="text-xs text-slate-500 dark:text-muted-foreground flex gap-2"><Info className="h-4 w-4 shrink-0"/>Les retraits sont traités sous 72h.</p>
                    </CardFooter>
                 </Card>
            </div>
        </div>

         <div>
             <SectionHeader title="Historique des transactions" className="mb-4" />
             <Card className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow className="border-slate-100 dark:border-slate-700"><TableHead>Date</TableHead><TableHead>Détails</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)
                            : payments.length > 0 ? (
                                payments.slice(0, 10).map(p => (
                                    <TableRow key={p.id} className="border-slate-100 dark:border-slate-800">
                                        <TableCell className="text-slate-500 dark:text-muted-foreground">
                                            {p.date && typeof (p.date as any).toDate === 'function' ? format((p.date as any).toDate(), 'd MMM yyyy', {locale: fr}) : ''}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-800 dark:text-white">{`Vente du cours "${p.courseTitle || p.courseId}"`}</TableCell>
                                        <TableCell className="text-right text-green-600 dark:text-green-400 font-semibold">+ {p.amount.toLocaleString('fr-FR')} XOF</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="text-center h-24 text-slate-500 dark:text-muted-foreground">Aucune transaction.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
         </div>
      </div>
    );
}