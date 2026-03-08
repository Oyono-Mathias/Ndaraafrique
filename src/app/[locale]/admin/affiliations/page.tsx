'use client';

/**
 * @fileOverview Cockpit Admin : Gestion des Affiliations & Sécurité.
 * Permet à Mathias de surveiller et modérer les commissions du réseau.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, limit } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Landmark, ShieldAlert, History, User, CheckCircle2, Clock, XCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function AdminAffiliationsPage() {
    const db = getFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    const transactionsQuery = useMemo(() => query(
        collection(db, 'affiliate_transactions'),
        orderBy('createdAt', 'desc'),
        limit(100)
    ), [db]);

    const { data: transactions, isLoading } = useCollection<any>(transactionsQuery);

    const filtered = useMemo(() => {
        if (!transactions) return [];
        return transactions.filter(t => 
            t.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.affiliateId?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [transactions, searchTerm]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            <header>
                <div className="flex items-center gap-2 text-primary mb-1">
                    <Landmark className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Audit Financier</span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Registre des Commissions</h1>
                <p className="text-slate-400 text-sm font-medium mt-1">Surveillez les flux d'affiliation et prévenez les fraudes.</p>
            </header>

            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                    placeholder="Chercher une transaction, un cours..." 
                    className="h-12 pl-12 bg-slate-900 border-slate-800 rounded-xl text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-800 bg-slate-800/30">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Ambassadeur (ID)</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Formation / Acheteur</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Commission</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Statut</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Date Libération</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i} className="border-slate-800"><TableCell colSpan={5}><Skeleton className="h-10 w-full bg-slate-800/50 rounded-xl"/></TableCell></TableRow>
                            ))
                        ) : filtered.length > 0 ? (
                            filtered.map(t => (
                                <TableRow key={t.id} className="group border-slate-800 hover:bg-slate-800/20">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-slate-800 rounded-lg"><User className="h-3 w-3 text-slate-500" /></div>
                                            <span className="text-[10px] font-mono text-slate-400">{t.affiliateId.substring(0, 12)}...</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs text-white uppercase truncate max-w-[200px]">{t.courseTitle}</span>
                                            <span className="text-[10px] text-slate-500 italic">Par {t.buyerName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="font-black text-primary">{t.commissionAmount.toLocaleString('fr-FR')} <span className="text-[8px] opacity-50">XOF</span></span>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={t.status} />
                                    </TableCell>
                                    <TableCell className="text-[10px] font-bold text-slate-500 uppercase">
                                        {t.unlockDate ? format((t.unlockDate as any).toDate(), "dd MMM yyyy", { locale: fr }) : '---'}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={5} className="h-64 text-center opacity-20"><History className="h-16 w-16 mx-auto mb-4" /><p className="font-black uppercase text-xs">Aucune donnée d'affiliation</p></TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config = {
        pending: { label: 'Sécurisation', class: 'bg-amber-500/10 text-amber-500', icon: Clock },
        approved: { label: 'Validé', class: 'bg-emerald-500/10 text-emerald-500', icon: CheckCircle2 },
        paid: { label: 'Payé', class: 'bg-blue-500/10 text-blue-500', icon: Landmark },
        cancelled: { label: 'Annulé', class: 'bg-red-500/10 text-red-500', icon: XCircle },
    }[status] || { label: status, class: 'bg-slate-800', icon: Clock };

    return (
        <Badge className={cn("font-black text-[8px] uppercase border-none px-2 flex items-center gap-1.5 w-fit", config.class)}>
            <config.icon className="h-2.5 w-2.5" />
            {config.label}
        </Badge>
    );
}
