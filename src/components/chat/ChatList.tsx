'use client';

/**
 * @fileOverview Liste des conversations Ndara Afrique (Android-First).
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { MessageSquare, Search, UserPlus, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Chat, NdaraUser } from '@/lib/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface EnrichedChat extends Chat {
  otherParticipant: Partial<NdaraUser>;
}

const ChatListItem = ({ chat, isSelected, isUnread }: { chat: EnrichedChat, isSelected: boolean, isUnread: boolean }) => {
    const router = useRouter();
    const lastDate = (chat.updatedAt as any)?.toDate?.();

    return (
        <button 
            onClick={() => router.push(`/student/messages?chatId=${chat.id}`)}
            className={cn(
                "w-full text-left p-4 flex items-center gap-4 transition-all active:bg-slate-800/60 border-b border-white/5",
                isSelected ? "bg-primary/10" : "hover:bg-slate-900/40"
            )}
        >
            <div className="relative">
                <Avatar className="h-14 w-14 border border-white/10 shadow-xl">
                    <AvatarImage src={chat.otherParticipant.profilePictureURL} className="object-cover" />
                    <AvatarFallback className="bg-slate-800 text-slate-500 font-black">
                        {chat.otherParticipant.fullName?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                {isUnread && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary rounded-full border-2 border-slate-950 shadow-lg animate-in zoom-in" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <p className={cn(
                        "truncate text-[15px]",
                        isUnread ? "font-black text-white" : "font-bold text-slate-300"
                    )}>
                        {chat.otherParticipant.fullName}
                    </p>
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-tighter",
                        isUnread ? "text-primary" : "text-slate-500"
                    )}>
                        {lastDate ? formatDistanceToNowStrict(lastDate, { addSuffix: false, locale: fr }) : ''}
                    </span>
                </div>
                <p className={cn(
                    "text-sm truncate leading-snug",
                    isUnread ? "text-slate-100 font-bold" : "text-slate-500 font-medium"
                )}>
                    {chat.lastMessage}
                </p>
            </div>
        </button>
    );
};

export function ChatList({ selectedChatId }: { selectedChatId: string | null }) {
    const { user } = useRole();
    const db = getFirestore();
    const router = useRouter();
    const [enrichedChats, setEnrichedChats] = useState<EnrichedChat[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const chatsQuery = useMemo(() =>
        user ? query(
            collection(db, 'chats'), 
            where('participants', 'array-contains', user.uid), 
            orderBy('updatedAt', 'desc')
        ) : null,
        [db, user]
    );
    const { data: chats, isLoading: chatsLoading } = useCollection<Chat>(chatsQuery);

    useEffect(() => {
        if (!chats || chatsLoading) return;

        const enrich = async () => {
            setDataLoading(true);
            const otherIds = chats.map(c => c.participants.find(p => p !== user?.uid)).filter(Boolean) as string[];
            
            if (otherIds.length === 0) {
                setEnrichedChats([]);
                setDataLoading(false);
                return;
            }

            const usersMap = new Map<string, NdaraUser>();
            const uniqueOtherIds = [...new Set(otherIds)];

            for (let i = 0; i < uniqueOtherIds.length; i += 30) {
                const chunk = uniqueOtherIds.slice(i, i + 30);
                const q = query(collection(db, 'users'), where('uid', 'in', chunk));
                const snap = await getDocs(q);
                snap.forEach(d => usersMap.set(d.id, d.data() as NdaraUser));
            }

            const enriched = chats.map(chat => {
                const otherId = chat.participants.find(p => p !== user?.uid);
                return {
                    ...chat,
                    otherParticipant: usersMap.get(otherId || '') || { fullName: 'Utilisateur Ndara' }
                };
            });

            setEnrichedChats(enriched);
            setDataLoading(false);
        };

        enrich();
    }, [chats, user, db, chatsLoading]);

    const filteredChats = useMemo(() => {
        return enrichedChats.filter(c => 
            c.otherParticipant.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [enrichedChats, searchTerm]);

    return (
        <div className="flex flex-col h-full bg-slate-950">
            <header className="px-4 pt-6 pb-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black text-white tracking-tight">Messages</h1>
                    <Button variant="ghost" size="icon" className="rounded-full text-slate-400">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                    <Input 
                        placeholder="Rechercher une discussion..." 
                        className="h-11 pl-10 bg-slate-900 border-none rounded-2xl text-white placeholder:text-slate-600 focus-visible:ring-primary/30"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            <ScrollArea className="flex-1">
                {chatsLoading || dataLoading ? (
                    <div className="px-4 space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 py-2">
                                <Skeleton className="h-14 w-14 rounded-full bg-slate-900" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-1/3 bg-slate-900" />
                                    <Skeleton className="h-3 w-3/4 bg-slate-900" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredChats.length > 0 ? (
                    <div className="animate-in fade-in duration-500">
                        {filteredChats.map(chat => (
                            <ChatListItem 
                                key={chat.id} 
                                chat={chat} 
                                isSelected={chat.id === selectedChatId}
                                isUnread={chat.unreadBy?.includes(user!.uid) || false}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center opacity-20 h-full mt-20">
                        <MessageSquare className="h-20 w-20 mb-6 text-slate-500" />
                        <h2 className="text-xl font-black uppercase tracking-widest text-slate-400">Silence radio</h2>
                        <p className="mt-2 text-sm max-w-[200px]">Démarrez une conversation en consultant l'annuaire.</p>
                        <Button asChild variant="outline" className="mt-8 border-slate-800 text-slate-400 rounded-xl px-8" onClick={() => router.push('/student/annuaire')}>
                            <span>Voir l'annuaire</span>
                        </Button>
                    </div>
                )}
            </ScrollArea>

            <Button 
                onClick={() => router.push('/student/annuaire')}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/40 z-50 transition-transform active:scale-90 md:hidden"
            >
                <UserPlus className="h-6 w-6 text-white" />
            </Button>
        </div>
    );
}
