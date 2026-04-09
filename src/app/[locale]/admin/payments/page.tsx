'use client';

/**
 * @fileOverview Cockpit Trésorerie & Audit Financier.
 * ✅ UI : Intégration des logos opérateurs réels.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, limit, doc, updateDoc, increment, getDoc, serverTimestamp } from 'firebase/firestore';
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
    Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { OperatorLogo } from '@/components/ui/OperatorLogo';
// ❌ Supprimé pour le build : import type { Payment } from '@/lib/types';

/**
 * ✅ RÉSOLU : Interface locale robuste pour le build
 */
interface Payment {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    provider: string; // Ex: 'orange', 'mtn'
    date: any; // Timestamp Firestore
    courseTitle?: string;
    metadata?: {
        type?: string;
    };
}

export default function AdminPaymentsPage() {
    const db = getFirestore();
    const { currentUser: admin } = useRole();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    // ✅ Correction : Utilisation du champ 'date' comme défini dans ton query
    const paymentsQuery = useMemo(() => query(
        collection(db, 'payments'),
        orderBy('date', 'desc'),
        limit(100)
    ), [db]);

    const { data: payments, isLoading } = useCollection<Payment>(paymentsQuery);

    const filtered = useMemo(() => {
        if (!payments) return [];
        return payments.filter(p => 
            p.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.courseTitle && p.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
            p.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [payments, searchTerm]);

    const handleManualValidate = async (payment: Payment) => {
        if (!admin || isProcessing) return;
        setIsProcessing(payment.id);

        try {
            const paymentRef = doc(db, 'payments', payment.id);
            const userRef = doc(db, 'users', payment.userId);

            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) throw new Error("Utilisateur introuvable");

            await updateDoc(paymentRef, { status: 'completed', updatedAt: serverTimestamp() });
            
            if (payment.metadata?.type === 'wallet_topup') {
                await updateDoc(userRef, { balance: increment(payment.amount) });
            }

            toast({ title: "Transaction validée manuellement" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erreur", description: e.message });
        } finally {
            setIsProcessing(null);
        }
    };

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Landmark className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Flux de Trésorerie</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Audit Financier</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Surveillez et validez chaque mouvement de fonds sur le réseau.</p>
                </div>
                <Button variant="outline" className="h-12 border-slate-800 bg-slate-900 font-bold uppercase text-[10px] tracking-widest">
                    <Download className="mr-2 h-4 w-4" /> Exporter CSV
                </Button>
            </header>

            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                    placeholder="Chercher par ID, Utilisateur ou Cours..." 
                    className="h-12 pl-12 bg-slate-900 border-white/5 rounded-xl text-white"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-800 bg-slate-800/30">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Transaction</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Utilisateur (UID)</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Montant</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Méthode</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Statut</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i} className="border-slate-800"><TableCell colSpan={6} className="h-12 bg-slate-800/20" /></TableRow>
                            ))
                        ) : filtered.length > 0 ? (
                            filtered.map(payment => {
                                // Extraction sécurisée de la date
                                const date = (payment.date as any)?.toDate?.() || new Date();
                                const isPending = payment.status === 'pending';
                                
                                return (
                                    <TableRow key={payment.id} className="group border-slate-800 hover:bg-slate-800/20">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-white uppercase truncate max-w-[180px]">{payment.courseTitle || 'Recharge'}</span>
                                                <span className="text-[10px] font-mono text-slate-500">ID: {payment.id.substring(0, 12)}...</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-slate-800 rounded-lg"><User className="h-3 w-3 text-slate-500" /></div>
                                                <span className="text-[10px] font-mono text-slate-400">{payment.userId.substring(0, 8)}...</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-black text-white">{payment.amount.toLocaleString('fr-FR')} <span className="text-[10px] opacity-50">{payment.currency}</span></span>
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
                                                payment.status === 'pending' ? "bg-amber-500/10 text-amber-500 animate-pulse" : "bg-red-500/10 text-red-500"
                                            )}>
                                                {payment.status === 'completed' ? 'Réussi' : isPending ? 'Audit' : 'Échec'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            {isPending && (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleManualValidate(payment)}
                                                    disabled={!!isProcessing}
                                                    className="h-8 rounded-xl bg-primary text-slate-950 font-black uppercase text-[9px] tracking-widest transition-all"
                                                >
                                                    {isProcessing === payment.id ? <Loader2 className="h-3 w-3 animate-spin"/> : "Valider"}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow><TableCell colSpan={6} className="h-48 text-center opacity-20"><Landmark size={48} className="mx-auto mb-4" /><p className="font-black uppercase text-xs">Aucune transaction enregistrée</p></TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
