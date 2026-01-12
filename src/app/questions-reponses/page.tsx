
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
import { useTranslation } from 'react-i18next';

interface SupportTicket {
    id: string;
    subject: string;
    lastMessage: string;
    status: 'ouvert' | 'fermé';
    updatedAt: any; // Firestore Timestamp
    courseId: string;
    courseTitle?: string;
}

const TicketStatusBadge = ({ status }: { status: SupportTicket['status'] }) => {
    const { t } = useTranslation();
    if (status === 'ouvert') {
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700">{t('pending')}</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700">{t('answered')}</Badge>;
};


export default function QAPage() {
    const { formaAfriqueUser, isUserLoading } = useRole();
    const db = getFirestore();
    const { t } = useTranslation();

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

    const pageThemeClass = formaAfriqueUser?.role === 'instructor' ? 'dark' : '';


    return (
        <div className={`space-y-8 ${pageThemeClass}`}>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('navQA')}</h1>
                    <p className="text-muted-foreground dark:text-slate-400">
                        {formaAfriqueUser?.role === 'instructor' 
                            ? t('qa_desc_instructor')
                            : t('qa_desc_student')
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

            <Card className="bg-card shadow-sm dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                    <CardTitle className="dark:text-white">{t('inbox')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="dark:border-slate-700">
                                <TableHead className="dark:text-slate-400">{t('status')}</TableHead>
                                <TableHead className="dark:text-slate-400">{t('subject')}</TableHead>
                                <TableHead className="dark:text-slate-400">{t('last_activity')}</TableHead>
                                <TableHead className="text-right dark:text-slate-400">{t('action')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                     <TableRow key={i} className="dark:border-slate-700">
                                        <TableCell><Skeleton className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48 bg-slate-200 dark:bg-slate-700" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24 bg-slate-200 dark:bg-slate-700" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-20 bg-slate-200 dark:bg-slate-700" /></TableCell>
                                    </TableRow>
                                ))
                            ) : tickets && tickets.length > 0 ? (
                                tickets.map((ticket) => (
                                    <TableRow key={ticket.id} className="hover:bg-muted/50 dark:hover:bg-slate-700/50 dark:border-slate-700">
                                        <TableCell>
                                            <TicketStatusBadge status={ticket.status} />
                                        </TableCell>
                                        <TableCell className="font-medium dark:text-slate-200">{ticket.subject}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm dark:text-slate-400">
                                            {ticket.updatedAt ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true, locale: fr }) : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" asChild className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600">
                                                <Link href={`/questions-reponses/${ticket.id}`}>{t('view')}</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow className="dark:border-slate-700">
                                    <TableCell colSpan={5} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                                            <MessageSquare className="h-10 w-10" />
                                            <span className="font-medium">{t('no_questions_yet')}</span>
                                            <span className="text-sm">{t('new_questions_here')}</span>
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
