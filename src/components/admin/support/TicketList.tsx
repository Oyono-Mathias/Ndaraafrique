'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SupportTicket } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { MessageSquare, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';

type TicketStatus = 'ouvert' | 'fermé';

export function TicketList() {
    const db = getFirestore();
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState<TicketStatus>('ouvert');

    const ticketsQuery = useMemo(
        () => query(collection(db, 'support_tickets'), where('status', '==', statusFilter), orderBy('updatedAt', 'desc')),
        [db, statusFilter]
    );
    const { data: tickets, isLoading } = useCollection<SupportTicket>(ticketsQuery);

    const getStatusVariant = (status: TicketStatus) => {
        return status === 'ouvert' ? 'destructive' : 'success';
    };
    
    const getCategoryVariant = (category: SupportTicket['category']) => {
        switch(category) {
            case 'Paiement': return 'warning';
            case 'Technique': return 'secondary';
            case 'Pédagogique': return 'default';
            default: return 'outline';
        }
    };
    
    const handleRowClick = (ticketId: string) => {
        router.push(`/admin/support/${ticketId}`);
    };

    return (
        <Tabs defaultValue="ouvert" onValueChange={(value) => setStatusFilter(value as TicketStatus)}>
            <TabsList>
                <TabsTrigger value="ouvert">Ouverts</TabsTrigger>
                <TabsTrigger value="fermé">Fermés</TabsTrigger>
            </TabsList>
            <div className="mt-4 border rounded-lg dark:border-slate-700">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sujet</TableHead>
                            <TableHead>Catégorie</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Dernière MàJ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={4}><Skeleton className="h-10 w-full bg-slate-800"/></TableCell>
                                </TableRow>
                            ))
                        ) : tickets && tickets.length > 0 ? (
                            tickets.map(ticket => (
                                <TableRow key={ticket.id} onClick={() => handleRowClick(ticket.id)} className="cursor-pointer">
                                    <TableCell className="font-medium text-white">{ticket.subject}</TableCell>
                                    <TableCell>
                                        <Badge variant={getCategoryVariant(ticket.category)}>{ticket.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(ticket.status as TicketStatus)} className="capitalize">{ticket.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {ticket.updatedAt && typeof (ticket.updatedAt as any).toDate === 'function' 
                                            ? formatDistanceToNow((ticket.updatedAt as any).toDate(), { locale: fr, addSuffix: true }) 
                                            : 'N/A'}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Frown className="h-8 w-8" />
                                        <p>Aucun ticket trouvé pour ce statut.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </Tabs>
    );
}