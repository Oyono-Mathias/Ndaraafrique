
'use client';

import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import { AlertCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface SupportTicket {
    id: string;
    subject: string;
    lastMessage: string;
    status: 'open' | 'closed';
    updatedAt: any; // Firestore Timestamp
    courseId: string;
    courseTitle?: string;
}

const TicketStatusBadge = ({ status }: { status: SupportTicket['status'] }) => {
    if (status === 'open') {
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">En attente</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 border-green-200">Répondu</Badge>;
};


export default function QAPage() {
    const { formaAfriqueUser, isUserLoading } = useRole();
    const db = getFirestore();

    const ticketsQuery = useMemoFirebase(
        () => {
            if (!formaAfriqueUser?.uid) return null;
            
            const fieldToFilter = formaAfriqueUser.role === 'instructor' ? 'instructorId' : 'userId';

            return query(
                collection(db, 'support_tickets'),
                where(fieldToFilter, '==', formaAfriqueUser.uid),
                orderBy('updatedAt', 'desc')
            )
        },
        [db, formaAfriqueUser]
    );

    const { data: tickets, isLoading: ticketsLoading, error } = useCollection<SupportTicket>(ticketsQuery);
    const isLoading = isUserLoading || ticketsLoading;

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Questions & Réponses</h1>
                    <p className="text-muted-foreground">
                        {formaAfriqueUser?.role === 'instructor' 
                            ? 'Gérez les questions des étudiants pour tous vos cours.'
                            : 'Consultez vos questions posées aux instructeurs.'
                        }
                    </p>
                </div>
            </header>
            
            {error && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p>
                        Une erreur est survenue lors du chargement des questions. 
                        Si le problème persiste, un index Firestore est peut-être manquant.
                    </p>
                </div>
            )}

            <Card className="bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>Boîte de réception</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Statut</TableHead>
                                <TableHead>Sujet</TableHead>
                                <TableHead>Dernière activité</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                     <TableRow key={i}>
                                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                                    </TableRow>
                                ))
                            ) : tickets && tickets.length > 0 ? (
                                tickets.map((ticket) => (
                                    <TableRow key={ticket.id} className="hover:bg-muted/50">
                                        <TableCell>
                                            <TicketStatusBadge status={ticket.status} />
                                        </TableCell>
                                        <TableCell className="font-medium">{ticket.subject}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {ticket.updatedAt ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true, locale: fr }) : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/questions-reponses/${ticket.id}`}>Voir</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <MessageSquare className="h-10 w-10" />
                                            <span className="font-medium">Aucune question pour le moment</span>
                                            <span className="text-sm">Les nouvelles questions apparaîtront ici.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
