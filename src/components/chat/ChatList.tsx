
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, getDocs, documentId } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Loader2, UserPlus, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Chat, NdaraUser } from '@/lib/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Skeleton } from '../ui/skeleton';

interface EnrichedChat extends Chat {
  otherParticipant: Partial<NdaraUser>;
}

const ChatListItem = ({ chat, isSelected, unreadCount }: { chat: EnrichedChat, isSelected: boolean, unreadCount: number }) => {
    const router = useRouter();
    const lastDate = (chat.updatedAt as any)?.toDate?.();

    return (
        <button 
            onClick={() => router.push(`/student/messages?chatId=${chat.id}`)}
            className={cn(
                "w-full text-left p-4 flex items-center gap-4 transition-all border-b border-slate-800/50",
                isSelected ? "bg-[#CC7722]/10" : "hover:bg-slate-800/40"
            )}
        >
            <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-slate-700 shadow-md">
                    <AvatarImage src={chat.otherParticipant.profilePictureURL} className="object-cover" />
                    <AvatarFallback className="bg-slate-800 text-slate-400 font-bold">
                        {chat.otherParticipant.fullName?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-[#CC7722] rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-black text-white">
                        {unreadCount}
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <p className="font-bold text-slate-100 truncate">{chat.otherParticipant.fullName}</p>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                        {lastDate ? formatDistanceToNowStrict(lastDate, { addSuffix: false, locale: fr }) : ''}
                    </span>
                </div>
                <p className={cn(
                    "text-xs truncate",
                    unreadCount > 0 ? "text-slate-200 font-bold" : "text-slate-500 font-medium"
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

    const chatsQuery = useMemo(() =>
        user ? query(collection(db, 'chats'), where('participants', 'array-contains', user.uid), orderBy('updatedAt', 'desc')) : null,
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
                    otherParticipant: usersMap.get(otherId || '') || { fullName: 'Ancien membre' }
                };
            });

            setEnrichedChats(enriched);
            setDataLoading(false);
        };

        enrich();
    }, [chats, user, db, chatsLoading]);

    return (
        <div className="flex flex-col h-full bg-slate-950">
            <header className="p-4 border-b border-slate-800 space-y-4">
                <h1 className="text-xl font-black text-white uppercase tracking-widest">Discussions</h1>
                <Button variant="outline" className="w-full h-12 rounded-xl border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-300" onClick={() => router.push('/student/annuaire')}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Nouvelle discussion
                </Button>
            </header>
            <ScrollArea className="flex-1">
                {chatsLoading || dataLoading ? (
                    <div className="p-4 space-y-4">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-slate-900" />)}
                    </div>
                ) : enrichedChats.length > 0 ? (
                    <div>
                        {enrichedChats.map(chat => (
                            <ChatListItem 
                                key={chat.id} 
                                chat={chat} 
                                isSelected={chat.id === selectedChatId}
                                unreadCount={chat.unreadBy?.includes(user!.uid) ? 1 : 0}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center opacity-30">
                        <MessageSquare className="h-16 w-16 mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">Aucun message</p>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
