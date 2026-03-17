'use client';

/**
 * @fileOverview Liste des tickets (Inbox) - Design Elite Qwen.
 * ✅ ANDROID-FIRST : Cartes tactiles avec avatars et indicateurs SLA.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SupportTicket, NdaraUser } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { MessageSquare, Frown, ChevronRight, Clock, User, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function TicketList() {
    const db = getFirestore();
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState<'ouvert' | 'fermé'>('ouvert');
    const [usersMap, setUsersMap] = useState<Map<string, NdaraUser>>(new Map());

    const ticketsQuery = useMemo(
        () => query(collection(db, 'support_tickets'), where('status', '==', statusFilter)),
        [db, statusFilter]
    );
    const { data: rawTickets, isLoading } = useCollection<SupportTicket>(ticketsQuery);

    const tickets = useMemo(() => {
        if (!rawTickets) return [];
        return [...rawTickets].sort((a, b) => {
            const dateA = (a.updatedAt as any)?.toDate?.() || new Date(0);
            const dateB = (b.updatedAt as any)?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
    }, [rawTickets]);

    useEffect(() => {
        if (!tickets || tickets.length === 0) return;
        const fetchUsers = async () => {
            const ids = [...new Set(tickets.map(t => t.userId))];
            const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', ids.slice(0, 30))));
            const newMap = new Map();
            usersSnap.forEach(d => newMap.set(d.id, d.data()));
            setUsersMap(newMap);
        };
        fetchUsers();
    }, [tickets, db]);

    const getCategoryStyles = (category: SupportTicket['category']) => {
        switch(category) {
            case 'Paiement': return 'bg-amber-500/10 text-amber-500';
            case 'Technique': return 'bg-blue-500/10 text-blue-400';
            case 'Pédagogique': return 'bg-purple-500/10 text-purple-400';
            default: return 'bg-slate-800 text-slate-400';
        }
    };

    return (
        <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)} className="w-full">
            <TabsList className="bg-slate-900 border-slate-800 h-12 p-1 rounded-2xl mb-6">
                <TabsTrigger value="ouvert" className="rounded-xl font-bold uppercase text-[10px] tracking-widest px-6 h-full">Actifs</TabsTrigger>
                <TabsTrigger value="fermé" className="rounded-xl font-bold uppercase text-[10px] tracking-widest px-6 h-full">Archives</TabsTrigger>
            </TabsList>

            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[2rem] bg-slate-900" />)}
                </div>
            ) : tickets.length > 0 ? (
                <div className="grid gap-3">
                    {tickets.map(ticket => {
                        const user = usersMap.get(ticket.userId);
                        const updatedAt = (ticket.updatedAt as any)?.toDate?.() || new Date();
                        const isDelayed = statusFilter === 'ouvert' && differenceInHours(new Date(), updatedAt) >= 2;

                        return (
                            <button
                                key={ticket.id}
                                onClick={() => router.push(`/admin/support/${ticket.id}`)}
                                className={cn(
                                    "w-full text-left p-4 rounded-[2rem] border transition-all active:scale-[0.98] group relative flex items-center gap-4 shadow-xl overflow-hidden",
                                    isDelayed ? "bg-amber-500/[0.03] border-amber-500/20" : "bg-slate-900/60 border-white/5"
                                )}
                            >
                                {isDelayed && (
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl -mr-12 -mt-12 animate-pulse" />
                                )}

                                <div className="relative flex-shrink-0">
                                    <Avatar className="h-14 w-14 border-2 border-white/10 shadow-lg">
                                        <AvatarImage src={user?.profilePictureURL} className="object-cover" />
                                        <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                                            {user?.fullName?.charAt(0) || 'N'}
                                        </AvatarFallback>
                                    </Avatar>
                                    {isDelayed && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md">
                                            <Clock className="h-2.5 w-2.5 text-slate-950" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge className={cn("text-[8px] font-black uppercase border-none px-2 h-4", getCategoryStyles(ticket.category))}>
                                            {ticket.category}
                                        </Badge>
                                        <span className="text-[10px] font-mono text-slate-600 uppercase">Ref: {ticket.id.substring(0, 8)}</span>
                                    </div>
                                    <h3 className="font-black text-white text-sm truncate uppercase tracking-tight">{ticket.subject}</h3>
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-slate-500 text-[10px] font-bold truncate pr-4 italic">"{ticket.lastMessage}"</p>
                                        <span className={cn("text-[9px] font-black uppercase tracking-tighter shrink-0", isDelayed ? "text-amber-500" : "text-slate-600")}>
                                            {formatDistanceToNow(updatedAt, { locale: fr, addSuffix: true })}
                                        </span>
                                    </div>
                                </div>

                                <ChevronRight className="h-5 w-5 text-slate-800 group-hover:text-primary transition-all mr-1" />
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="py-32 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-20">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-700" />
                    <p className="font-black uppercase tracking-widest text-xs">Aucune demande en attente</p>
                </div>
            )}
        </Tabs>
    );
}
