'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, orderBy, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Ticket, Clock, Search, Inbox, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface SupportTicket {
    id: string;
    subject: string;
    lastMessage: string;
    status: 'open' | 'closed';
    priority?: 'urgent' | 'normal';
    userId: string;
    userName?: string;
    userAvatar?: string;
    updatedAt: any; // Firestore Timestamp
}

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: string; icon: React.ElementType; isLoading?: boolean; }) => (
  <Card className="bg-white border-slate-200 shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      <Icon className="h-4 w-4 text-slate-400" />
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-slate-900">{value}</div>}
    </CardContent>
  </Card>
);

const TicketListItem = ({ ticket, isActive }: { ticket: SupportTicket, isActive: boolean }) => (
    <Link href={`/admin/support?ticketId=${ticket.id}`} className={cn("block p-4 rounded-2xl cursor-pointer transition-colors", isActive ? "bg-primary/10" : "hover:bg-slate-100")}>
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={ticket.userAvatar} />
                    <AvatarFallback>{ticket.userName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                    <p className={cn("font-semibold text-sm", isActive && "text-primary")}>{ticket.userName}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{ticket.subject}</p>
                </div>
            </div>
            {ticket.priority === 'urgent' && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
        </div>
        <p className="text-xs text-slate-400 mt-2 pl-11 line-clamp-1">{ticket.lastMessage}</p>
    </Link>
);


export default function AdminSupportPage() {
    const db = getFirestore();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isMobile = useIsMobile();
    
    const activeTicketId = searchParams.get('ticketId');
    
    const [searchTerm, setSearchTerm] = useState('');

    const ticketsQuery = useMemoFirebase(() => query(collection(db, 'support_tickets'), orderBy('updatedAt', 'desc')), [db]);
    const { data: tickets, isLoading: ticketsLoading, error } = useCollection<SupportTicket>(ticketsQuery);

    const openTicketsCount = useMemo(() => tickets?.filter(t => t.status === 'open').length || 0, [tickets]);

    // This would typically be a more complex calculation
    const averageResponseTime = "3h 15m";

    const filteredTickets = useMemo(() => {
        if (!tickets) return [];
        return tickets.filter(t => 
            t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
            t.userName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [tickets, searchTerm]);

    if (!isMobile && !activeTicketId && tickets && tickets.length > 0) {
        router.replace(`${pathname}?ticketId=${tickets[0].id}`);
    }
    
    // Redirect to detail page on mobile when a ticket is selected
    if (isMobile && activeTicketId) {
        router.push(`/admin/support/${activeTicketId}`);
    }

    if (isMobile) {
        return (
             <div className="space-y-6 -m-4 bg-gray-50">
                <div className="p-4 bg-white border-b">
                     <h1 className="text-xl font-bold">Boîte de réception</h1>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                        placeholder="Rechercher un ticket..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                {ticketsLoading ? (
                    <div className="px-4 space-y-2">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                    </div>
                ) : filteredTickets.length > 0 ? (
                    <div className="px-2">
                         {filteredTickets.map(ticket => <TicketListItem key={ticket.id} ticket={ticket} isActive={activeTicketId === ticket.id} />)}
                    </div>
                ): (
                     <div className="text-center py-20 text-slate-500">
                        <Inbox className="mx-auto h-12 w-12" />
                        <p className="mt-4 font-semibold">Boîte de réception vide</p>
                    </div>
                )}
             </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Tickets ouverts" value={openTicketsCount.toString()} icon={Ticket} isLoading={ticketsLoading} />
                <StatCard title="Temps de réponse moyen" value={averageResponseTime} icon={Clock} isLoading={ticketsLoading} />
                <StatCard title="Total Utilisateurs" value={"342"} icon={Users} isLoading={ticketsLoading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-22rem)]">
                <Card className="lg:col-span-1 rounded-2xl shadow-sm bg-white border-slate-200">
                    <CardHeader className="border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                            placeholder="Rechercher..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-2">
                        <ScrollArea className="h-[calc(100vh-28rem)]">
                             {ticketsLoading ? (
                                <div className="space-y-2">
                                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                                </div>
                            ) : filteredTickets.length > 0 ? (
                                <div>
                                    {filteredTickets.map(ticket => <TicketListItem key={ticket.id} ticket={ticket} isActive={activeTicketId === ticket.id} />)}
                                </div>
                            ): (
                                 <div className="text-center pt-20 text-slate-500">
                                    <Inbox className="mx-auto h-12 w-12" />
                                    <p className="mt-4 font-semibold">Boîte de réception vide</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
                
                <Card className="lg:col-span-2 rounded-2xl shadow-sm bg-white border-slate-200 flex flex-col">
                    <p>La vue détaillée du ticket apparaîtra ici.</p>
                </Card>
            </div>
        </div>
    );
}
