'use client';

/**
 * @fileOverview Journal d'audit des recharges admins.
 * ✅ DISTINCTION : Affiche si la recharge était réelle ou simulée.
 */

import { useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Landmark, ArrowUpRight, Clock, User, ShieldCheck, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Type / Auteur</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        [...Array(5)].map((_, i) => (
                            <TableRow key={i} className="border-slate-800"><TableCell colSpan={4}><Skeleton className="h-10 w-full bg-slate-800/50 rounded-xl"/></TableCell></TableRow>
                        ))
                    ) : logs && logs.length > 0 ? (
                        logs.map(log => {
                            const isSim = log.isSimulated === true;
                            return (
                                <TableRow key={log.id} className="group border-slate-800 hover:bg-slate-800/20">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-slate-800 rounded-lg shadow-inner">
                                                <User size={12} className="text-slate-500" />
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-400">ID: {log.userId.substring(0, 8)}...</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={cn(
                                            "flex items-center gap-2 font-black",
                                            isSim ? "text-amber-500" : "text-emerald-400"
                                        )}>
                                            <ArrowUpRight size={14} />
                                            <span className="text-sm">{log.amount.toLocaleString('fr-FR')} XOF</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1.5">
                                            <Badge className={cn(
                                                "w-fit text-[7px] font-black uppercase px-1.5 py-0.5 border-none",
                                                isSim ? "bg-amber-500 text-slate-950" : "bg-primary text-slate-950"
                                            )}>
                                                {isSim ? <><Zap size={8} className="mr-1" /> DÉMO</> : <><ShieldCheck size={8} className="mr-1" /> PROD</>}
                                            </Badge>
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
                            );
                        })
                    ) : (
                        <TableRow><TableCell colSpan={4} className="h-64 text-center opacity-20"><Landmark className="h-16 w-16 mx-auto mb-4" /><p className="font-black uppercase text-xs">Aucune recharge administrée</p></TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
