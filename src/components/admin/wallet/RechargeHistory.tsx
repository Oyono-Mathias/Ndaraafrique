'use client';

/**
 * @fileOverview Journal d'audit des recharges admins.
 */

import { useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Landmark, ArrowUpRight, Clock, User, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function RechargeHistory() {
    const db = getFirestore();
    
    // On écoute les paiements de type 'admin_recharge'
    const historyQuery = useMemo(() => query(
        collection(db, 'payments'),
        where('provider', '==', 'admin_recharge'),
        orderBy('date', 'desc'),
        limit(20)
    ), [db]);

    const { data: logs, isLoading } = useCollection<any>(historyQuery);

    return (
        <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
            <Table>
                <TableHeader>
                    <TableRow className="border-slate-800 bg-slate-800/30">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Bénéficiaire</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Montant Injecté</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Auteur / Motif</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        [...Array(5)].map((_, i) => (
                            <TableRow key={i} className="border-slate-800"><TableCell colSpan={4}><Skeleton className="h-10 w-full bg-slate-800/50 rounded-xl"/></TableCell></TableRow>
                        ))
                    ) : logs && logs.length > 0 ? (
                        logs.map(log => (
                            <TableRow key={log.id} className="group border-slate-800 hover:bg-slate-800/20">
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary shadow-inner">
                                            <User size={12} />
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400">ID: {log.userId.substring(0, 8)}...</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-emerald-400 font-black">
                                        <ArrowUpRight size={14} />
                                        <span className="text-sm">{log.amount.toLocaleString('fr-FR')} XOF</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <ShieldCheck size={10} className="text-primary" /> Admin : {log.metadata?.adminId?.substring(0,5)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium italic truncate max-w-[180px]">"{log.metadata?.reason || 'Recharge'}"</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                                        <Clock size={10} />
                                        {log.date && typeof (log.date as any).toDate === 'function' ? format((log.date as any).toDate(), 'dd MMM, HH:mm', { locale: fr }) : '...'}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={4} className="h-64 text-center opacity-20"><Landmark className="h-16 w-16 mx-auto mb-4" /><p className="font-black uppercase text-xs">Aucune recharge administrée</p></TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
