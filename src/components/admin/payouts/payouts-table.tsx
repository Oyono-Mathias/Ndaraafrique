'use client';

/**
 * @fileOverview Cockpit Admin : Gestion des Retraits Instructeurs.
 * Permet de filtrer et traiter les demandes de paiement de manière granulaire.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { PayoutRequest, NdaraUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Smartphone, 
    Loader2, 
    History,
    HandCoins,
    Banknote,
    UserCheck,
    Handshake
} from 'lucide-react';
import { updatePayoutStatusAction } from '@/actions/payoutActions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function PayoutsTable() {
    const db = getFirestore();
    const { currentUser: adminUser } = useRole();
    const { toast } = useToast();
    const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'paid' | 'rejected'>('pending');
    const [isActionPending, setIsActionPending] = useState<string | null>(null);
    const [instructorsMap, setInstructorsMap] = useState<Map<string, NdaraUser>>(new Map());

    // Requête temps réel sur les demandes filtrées
    const requestsQuery = useMemo(() => query(
        collection(db, 'payout_requests'), 
        where('status', '==', statusFilter),
        orderBy('createdAt', 'desc'),
        limit(100)
    ), [db, statusFilter]);

    const { data: requests, isLoading } = useCollection<PayoutRequest>(requestsQuery);

    // Chargement des profils instructeurs pour enrichir la table
    useEffect(() => {
        if (!requests || requests.length === 0) return;
        
        const fetchInstructors = async () => {
            const ids = [...new Set(requests.map(r => r.instructorId))];
            const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', ids)));
            const newMap = new Map();
            usersSnap.forEach(d => newMap.set(d.id, d.data()));
            setInstructorsMap(newMap);
        };
        fetchInstructors();
    }, [requests, db]);

    const handleUpdateStatus = async (payoutId: string, status: 'approved' | 'paid' | 'rejected') => {
        if (!adminUser) return;
        setIsActionPending(payoutId);
        
        const result = await updatePayoutStatusAction({ payoutId, status, adminId: adminUser.uid });
        
        if (result.success) {
            toast({ title: "Statut mis à jour", description: `Le retrait est désormais marqué comme '${status}'.` });
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsActionPending(null);
    };

    return (
        <div className="space-y-6">
            <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)} className="w-full">
                <TabsList className="bg-slate-900 border-slate-800 p-1 rounded-2xl h-14 w-full sm:w-auto">
                    <TabsTrigger value="pending" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full">
                        <Clock className="h-3.5 w-3.5" /> En attente
                    </TabsTrigger>
                    <TabsTrigger value="approved" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full text-blue-400">
                        <UserCheck className="h-3.5 w-3.5" /> Approuvés
                    </TabsTrigger>
                    <TabsTrigger value="paid" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full text-emerald-400">
                        <HandCoins className="h-3.5 w-3.5" /> Payés
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full text-red-400">
                        <XCircle className="h-3.5 w-3.5" /> Rejetés
                    </TabsTrigger>
                </TabsList>

                <div className="mt-8 border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 bg-slate-800/30">
                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Instructeur</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Montant</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Méthode</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Date Demande</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Action Stratégique</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i} className="border-slate-800"><TableCell colSpan={5}><Skeleton className="h-12 w-full bg-slate-800/50 rounded-xl"/></TableCell></TableRow>
                                ))
                            ) : requests && requests.length > 0 ? (
                                requests.map(req => {
                                    const instructor = instructorsMap.get(req.instructorId);
                                    const date = (req.createdAt as any)?.toDate?.() || new Date();
                                    
                                    return (
                                        <TableRow key={req.id} className="group border-slate-800 hover:bg-slate-800/20">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-slate-700 shadow-lg">
                                                        <AvatarImage src={instructor?.profilePictureURL} className="object-cover" />
                                                        <AvatarFallback className="bg-slate-800 text-[10px] font-black">
                                                            {instructor?.fullName?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-white">{instructor?.fullName || 'Chargement...'}</span>
                                                        <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{instructor?.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-black text-white">{req.amount.toLocaleString('fr-FR')} <span className="text-[10px] opacity-50">XOF</span></span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {req.method === 'mobile_money' ? <Smartphone className="h-3.5 w-3.5 text-primary" /> : <Banknote className="h-3.5 w-3.5 text-blue-400" />}
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        {req.method === 'mobile_money' ? 'Momo' : 'Virement'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-[10px] font-black text-slate-500 uppercase">
                                                {format(date, "d MMM yyyy HH:mm", { locale: fr })}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex justify-end gap-2">
                                                    {req.status === 'pending' && (
                                                        <>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline"
                                                                className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest bg-blue-500/10 text-blue-400 border-none hover:bg-blue-500 hover:text-white"
                                                                onClick={() => handleUpdateStatus(req.id, 'approved')}
                                                                disabled={isActionPending === req.id}
                                                            >
                                                                Approuver
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost"
                                                                className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest text-red-500 hover:bg-red-500/10"
                                                                onClick={() => handleUpdateStatus(req.id, 'rejected')}
                                                                disabled={isActionPending === req.id}
                                                            >
                                                                Rejeter
                                                            </Button>
                                                        </>
                                                    )}
                                                    {req.status === 'approved' && (
                                                        <Button 
                                                            size="sm" 
                                                            className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                                            onClick={() => handleUpdateStatus(req.id, 'paid')}
                                                            disabled={isActionPending === req.id}
                                                        >
                                                            {isActionPending === req.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <Handshake className="h-3.5 w-3.5 mr-2" />}
                                                            Marquer comme Payé
                                                        </Button>
                                                    )}
                                                    {req.status === 'paid' && (
                                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[9px] uppercase px-3">
                                                            <CheckCircle2 className="h-3 w-3 mr-1.5" />
                                                            Terminé
                                                        </Badge>
                                                    )}
                                                    {req.status === 'rejected' && (
                                                        <Badge className="bg-red-500/10 text-red-500 border-none font-black text-[9px] uppercase px-3">
                                                            <XCircle className="h-3 w-3 mr-1.5" />
                                                            Rejeté
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-64 text-center opacity-20"><History className="h-16 w-16 mx-auto mb-4" /><p className="font-black uppercase text-xs">Aucune demande trouvée</p></TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Tabs>
        </div>
    );
}
