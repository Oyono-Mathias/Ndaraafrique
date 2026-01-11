
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareDashed, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormaAfriqueUser } from '@/context/RoleContext';


interface SupportTicket {
  id: string;
  subject: string;
  userId: string;
  instructorId: string;
  courseId: string;
  status: 'ouvert' | 'fermé';
  updatedAt: any; // Firestore Timestamp
  category: 'Paiement' | 'Technique' | 'Pédagogique';
}

const getStatusBadgeVariant = (status: 'ouvert' | 'fermé') => {
  switch (status) {
    case 'ouvert':
      return 'destructive';
    case 'fermé':
      return 'default';
    default:
      return 'secondary';
  }
};

const getCategoryBadgeVariant = (category: SupportTicket['category']) => {
    switch(category) {
        case 'Paiement': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
        case 'Technique': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
        case 'Pédagogique': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
        default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
}

export default function AdminSupportPage() {
  const { formaAfriqueUser: adminUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [activeTab, setActiveTab] = useState('ouvert');

  const ticketsQuery = useMemoFirebase(
    () => query(collection(db, 'support_tickets'), orderBy('updatedAt', 'desc')),
    [db]
  );
  const { data: tickets, isLoading: ticketsLoading } = useCollection<SupportTicket>(ticketsQuery);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(ticket => ticket.status === activeTab);
  }, [tickets, activeTab]);

  const isLoading = isUserLoading || ticketsLoading;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Support & Litiges</h1>
        <p className="text-muted-foreground dark:text-slate-400">Gérez toutes les demandes d'assistance de la plateforme.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="ouvert">Tickets Ouverts</TabsTrigger>
              <TabsTrigger value="fermé">Tickets Fermés</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                  <TableHead className="dark:text-slate-400">Sujet</TableHead>
                  <TableHead className="hidden md:table-cell dark:text-slate-400">Catégorie</TableHead>
                  <TableHead className="hidden lg:table-cell dark:text-slate-400">Dernière MàJ</TableHead>
                  <TableHead className="text-right dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="dark:border-slate-700">
                      <TableCell><div className="flex items-center gap-2"><Skeleton className="h-4 w-4 rounded-full dark:bg-slate-700"/><Skeleton className="h-4 w-48 dark:bg-slate-700"/></div></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-24 rounded-full dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-32 dark:bg-slate-700" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto dark:bg-slate-700" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => {
                    const isOverdue = ticket.updatedAt && (new Date().getTime() - ticket.updatedAt.toDate().getTime()) > 24 * 60 * 60 * 1000;
                    return (
                        <TableRow key={ticket.id} className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                        <TableCell>
                          <div className="flex items-center gap-2">
                             {ticket.status === 'ouvert' && isOverdue && (
                                <span className="h-3 w-3 rounded-full bg-red-500 flex-shrink-0 animate-pulse" title="Ticket en attente depuis plus de 24h"></span>
                            )}
                            <span className="font-medium dark:text-slate-100 truncate">{ticket.subject}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            <Badge className={cn(getCategoryBadgeVariant(ticket.category))}>{ticket.category}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell dark:text-slate-400">
                          {ticket.updatedAt ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true, locale: fr }) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm" className="dark:bg-slate-700 dark:border-slate-600 dark:hover:bg-slate-600">
                            <Link href={`/admin/support/${ticket.id}`}>Ouvrir</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow className="dark:border-slate-700">
                    <TableCell colSpan={4} className="h-48 text-center">
                       <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                          <MessageSquareDashed className="h-12 w-12" />
                          <p className="font-medium">Aucun ticket {activeTab}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    