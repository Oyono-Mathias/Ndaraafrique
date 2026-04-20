'use client';

/**
 * @fileOverview Cockpit Trésorerie & Audit Financier - Version 2.5 Elite.
 * ✅ TRAÇABILITÉ : Affiche 100% des transactions (Pending, Completed, Failed).
 * ✅ FILTRAGE : KPI en temps réel pour un audit financier rigoureux.
 * ✅ RÉCONCILIATION : Outil de réparation des flux bloqués MeSomb.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, limit, doc, updateDoc, increment, getDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Search, 
    Download, 
    Landmark, 
    User,
    ArrowUpRight,
    Loader2,
    ChevronDown,
    Activity,
    ShieldCheck,
    AlertCircle,
    Clock,
    XCircle,
    Wrench
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { OperatorLogo } from '@/components/ui/OperatorLogo';
import { StatCard } from '@/components/dashboard/StatCard';
import type { Payment } from '@/lib/types';
import { reconcilePendingPaymentsAction } from '@/actions/meSombActions';

const PAGE_SIZE = 20;

export default function AdminPaymentsPage() {
    const db = getFirestore();
    const { currentUser: admin } = useRole();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [isReconciling, setIsReconciling] = useState(false);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    
    const [kpis, setKpis] = useState({
        totalRevenue: 0,
        pendingCount: 0,
        failedCount: 0,
        todayRevenue: 0
    });

    const paymentsQuery = useMemo(() => query(
        collection(db, 'payments'),
        orderBy('date', 'desc'),
        limit(visibleCount)
    ), [db, visibleCount]);

    const { data: payments, isLoading } = useCollection<Payment>(paymentsQuery);

    useEffect(() => {
        const q = collection(db, 'payments');
        const unsub = onSnapshot(q, (snap) => {
            const all = snap.docs.map(d => d.data() as Payment);
            const today = new Date().setHours(0,0,0,0);

            const revenue = all.filter(p => p.status === 'completed' && !p.isSimulated).reduce((acc, p) => acc + (p.amount || 0), 0);
            const pending = all.filter(p => p.status === 'pending').length;
            const failed = all.filter(p => p.status === 'failed').length;
            const daily = all.filter(p => {
                const date = (p.date as any)?.toDate?.() || new Date(p.date as any);
                return p.status === 'completed' && date.getTime() >= today && !p.isSimulated;
            }).reduce((acc, p) => acc + (p.amount || 0), 0);

            setKpis({ totalRevenue: revenue, pendingCount: pending, failedCount: failed, todayRevenue: daily });
        });
        return () => unsub();
    }, [db]);

    const handleReconcile = async () => {
        if (!admin || isReconciling) return;
        setIsReconciling(true);
        try {
            const result = await reconcilePendingPaymentsAction(admin.uid);
            if (result.success) {
                toast({ 
                    title: "Réconciliation terminée", 
                    description: `${result.processed} paiement(s) bloqué(s) ont été récupéré(s) et crédités.` 
                });
            } else {
                throw new Error(result.error);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erreur réconciliation", description: e.message });
        } finally {
            setIsReconciling(false);
        }
    };

    const handleManualValidate = async (payment: Payment) => {
        if (!admin || isProcessing) return;
        setIsProcessing(payment.id);

        try {
            const paymentRef = doc(db, 'payments', payment.id);
            const userRef = doc(db, 'users', payment.userId);

            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) throw new Error("Utilisateur introuvable");

            await updateDoc(paymentRef, { 
                status: 'completed', 
                updatedAt: serverTimestamp(),
                manualValidationBy: admin.uid 
            });
            
            if (payment.type === 'wallet_topup' || payment.courseId === 'WALLET_TOPUP') {
                const targetField = payment.isSimulated ? 'virtualBalance' : 'balance';
                await updateDoc(userRef, { [targetField]: increment(payment.amount) });
            }

            toast({ title: "Transaction validée manuellement" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erreur", description: e.message });
        } finally {
            setIsProcessing(null);
        }
    };

    const filtered = useMemo(() => {
        if (!payments) return [];
        return payments.filter(p => 
            p.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.courseTitle && p.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
            p.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [payments, searchTerm]);

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Landmark className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Audit des Flux Financiers</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Trésorerie & Audit</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Surveillez l'intégralité du pipeline transactionnel Ndara.</p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        onClick={handleReconcile}
                        disabled={isReconciling || kpis.pendingCount === 0}
                        className="h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-orange-500/20"
                    >
                        {isReconciling ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Wrench className="mr-2 h-4 w-4" />}
                        Réparer les flux ({kpis.pendingCount})
                    </Button>
                    <Button variant="outline" className="h-12 border-slate-800 bg-slate-900 font-bold uppercase text-[10px] tracking-widest">
                        <Download className="mr-2 h-4 w-4" /> Exporter
                    </Button>
                </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Volume Réel (Total)" value={kpis.totalRevenue.toLocaleString()} unit="XOF" icon={ShieldCheck} isLoading={false} trendType="up" trend="+12%"/>
                <StatCard title="Ventes du Jour" value={kpis.todayRevenue.toLocaleString()} unit="XOF" icon={Activity} isLoading={false} trendType="neutral" trend="LIVE"/>
                <StatCard title="En attente (Audit)" value={kpis.pendingCount.toString()} icon={Clock} isLoading={false} trendType="neutral" trend="PENDING" sparklineColor="#f59e0b"/>
                <StatCard title="Échecs / Rejets" value={kpis.failedCount.toString()} icon={AlertCircle} isLoading={false} trendType="down" trend="FAILED" sparklineColor="#ef4444"/>
            </section>

            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                    placeholder="Filtrer par ID, Utilisateur ou Libellé..." 
                    className="h-12 pl-12 bg-slate-900 border-white/5 rounded-xl text-white shadow-inner"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl relative">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-800 bg-slate-800/30">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Transaction / Type</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Utilisateur</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Montant</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Méthode</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Statut</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Arbitrage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && !payments ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i} className="border-slate-800"><TableCell colSpan={6} className="h-12 bg-slate-800/20" /></TableRow>
                            ))
                        ) : filtered.length > 0 ? (
                            filtered.map(payment => {
                                const isPending = payment.status === 'pending';
                                return (
                                    <TableRow key={payment.id} className="group border-slate-800 hover:bg-slate-800/20">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-white uppercase truncate max-w-[180px]">{payment.courseTitle || 'Transaction'}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Badge variant="outline" className="text-[7px] font-black border-slate-700 h-3.5 uppercase">{payment.type}</Badge>
                                                    {payment.isSimulated && <Badge className="bg-primary text-slate-950 border-none text-[7px] font-black h-3.5 uppercase">SIM</Badge>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-slate-400">{payment.userId.substring(0, 12)}...</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-black text-white">{payment.amount.toLocaleString('fr-FR')} <span className="text-[10px] opacity-40">F</span></span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <OperatorLogo operatorName={payment.provider} size={24} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">{payment.provider}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn(
                                                "font-black text-[8px] uppercase border-none px-2",
                                                payment.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                                                isPending ? "bg-amber-500/10 text-amber-500 animate-pulse" : 
                                                "bg-red-500/10 text-red-500"
                                            )}>
                                                {payment.status === 'completed' ? 'Réussi' : isPending ? 'Audit' : 'Rejet'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            {isPending && (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleManualValidate(payment)}
                                                    disabled={!!isProcessing}
                                                    className="h-8 rounded-xl bg-primary text-slate-950 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-primary/20"
                                                >
                                                    {isProcessing === payment.id ? <Loader2 className="h-3 w-3 animate-spin"/> : "Valider"}
                                                </Button>
                                            )}
                                            {!isPending && (
                                                <span className="text-[9px] font-bold text-slate-600 uppercase">
                                                    {format((payment.date as any)?.toDate?.() || new Date(), 'dd/MM HH:mm')}
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow><TableCell colSpan={6} className="h-48 text-center opacity-20"><Landmark size={48} className="mx-auto mb-4" /><p className="font-black uppercase text-xs">Registre vide</p></TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {!searchTerm && payments && payments.length >= visibleCount && (
                <div className="flex justify-center pt-4 pb-8">
                    <Button onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)} variant="outline" className="h-12 px-8 rounded-2xl border-white/5 bg-slate-900 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                        {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                        Anciennes écritures
                    </Button>
                </div>
            )}
        </div>
    );
}
