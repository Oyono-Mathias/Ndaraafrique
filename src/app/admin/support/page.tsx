
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
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
import type { NdaraUser } from '@/lib/types';


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

const getCategoryBadge = (category: SupportTicket['category']) => {
    switch(category) {
        case 'Paiement': return <Badge className='bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'>Paiement</Badge>;
        case 'Technique': return <Badge className='bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'>Technique</Badge>;
        case 'Pédagogique': return <Badge className='bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'>Pédagogique</Badge>;
        default: return <Badge className='bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'>{category}</Badge>;
    }
}

export default function AdminSupportPage() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [activeTab, setActiveTab] = useState('ouvert');

  const ticketsQuery = useMemoFirebase(
    () => currentUser?.role === 'admin' ? query(collection(db, 'support_tickets'), orderBy('updatedAt', 'desc')) : null,
    [db, currentUser]
  );
  const { data: tickets, isLoading: ticketsLoading, error } = useCollection<SupportTicket>(ticketsQuery);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(ticket => ticket.status === activeTab);
  }, [tickets, activeTab]);

  const isLoading = isUserLoading || ticketsLoading;

  if (error) {
    return (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <p>
                Une erreur est survenue lors du chargement des tickets.
                Un index Firestore (`support_tickets` trié par `updatedAt`) est peut-être manquant.
                Veuillez consulter la documentation de votre projet ou les logs de la console pour créer l'index manquant.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Support Technique</h1>
        <p className="text-muted-foreground dark:text-slate-400">Gérez les demandes d'assistance des utilisateurs.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="ouvert">Tickets ouverts</TabsTrigger>
              <TabsTrigger value="fermé">Tickets fermés</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                  <TableHead className="dark:text-slate-400">Sujet</TableHead>
                  <TableHead className="dark:text-slate-400">Catégorie</TableHead>
                  <TableHead className="dark:text-slate-400">Dernière mise à jour</TableHead>
                  <TableHead className="text-right dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="dark:border-slate-700">
                      <TableCell><div className="flex items-center gap-2"><Skeleton className="h-4 w-4 rounded-full dark:bg-slate-700"/><Skeleton className="h-4 w-48 dark:bg-slate-700"/></div></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full dark:bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32 dark:bg-slate-700" /></TableCell>
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
                        <TableCell>
                           {getCategoryBadge(ticket.category)}
                        </TableCell>
                        <TableCell className="text-muted-foreground dark:text-slate-400">
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
              {isLoading ? (
                  [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full dark:bg-slate-700" />)
              ) : filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => {
                      const isOverdue = ticket.updatedAt && (new Date().getTime() - ticket.updatedAt.toDate().getTime()) > 24 * 60 * 60 * 1000;
                      return (
                          <Card key={ticket.id} className="dark:bg-slate-900/50 dark:border-slate-700">
                              <CardContent className="p-4">
                                  <div className="flex justify-between items-start gap-4">
                                      <div className="flex-1">
                                           <div className="flex items-center gap-2 mb-2">
                                              {getCategoryBadge(ticket.category)}
                                              {ticket.status === 'ouvert' && isOverdue && <Badge variant="destructive" className="animate-pulse">Urgent</Badge>}
                                           </div>
                                           <p className="font-bold text-sm text-white line-clamp-2">{ticket.subject}</p>
                                      </div>
                                      <Button asChild variant="default" size="sm">
                                          <Link href={`/admin/support/${ticket.id}`}>Ouvrir</Link>
                                      </Button>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700">
                                      Dernière activité: {ticket.updatedAt ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true, locale: fr }) : 'N/A'}
                                  </p>
                              </CardContent>
                          </Card>
                      )
                  })
              ) : (
                   <div className="h-48 text-center flex items-center justify-center">
                       <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                          <MessageSquareDashed className="h-12 w-12" />
                          <p className="font-medium">Aucun ticket {activeTab}</p>
                      </div>
                    </div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
