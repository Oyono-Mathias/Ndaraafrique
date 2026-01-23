
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, getDocs, documentId } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Loader2, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Chat, NdaraUser } from '@/lib/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next-intl/navigation';
import { Skeleton } from '../ui/skeleton';

interface EnrichedChat extends Chat {
  otherParticipant: Partial<NdaraUser>;
}

const ChatListItem = ({ chat, isSelected, unreadCount }: { chat: EnrichedChat, isSelected: boolean, unreadCount: number }) => {
    const router = useRouter();
    const lastMessageDate = chat.updatedAt ? formatDistanceToNowStrict(chat.updatedAt.toDate(), { addSuffix: true, locale: fr }) : '';

    return (
        <button 
            onClick={() => router.push(`/student/messages?chatId=${chat.id}`)}
            className={cn(
                "w-full text-left p-3 flex items-center gap-3 transition-colors rounded-lg",
                isSelected ? "bg-slate-700" : "hover:bg-slate-800/60"
            )}
        >
            <Avatar className="h-12 w-12 border-2 border-slate-600">
                <AvatarImage src={chat.otherParticipant.profilePictureURL} />
                <AvatarFallback>{chat.otherParticipant.fullName?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                    <p className="font-bold text-white truncate">{chat.otherParticipant.fullName}</p>
                    <p className="text-xs text-slate-400 flex-shrink-0">{lastMessageDate}</p>
                </div>
                <div className="flex justify-between items-start">
                    <p className="text-sm text-slate-400 truncate pr-2">{chat.lastMessage}</p>
                    {unreadCount > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{unreadCount}</span>}
                </div>
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
        if (chats === null) {
          setDataLoading(chatsLoading);
          return;
        }
        if (chatsLoading) return;

        const enrichChats = async () => {
            setDataLoading(true);
            const participantIds = chats.map(c => c.participants.find(p => p !== user?.uid)).filter(Boolean) as string[];
            
            if(participantIds.length === 0) {
                setEnrichedChats([]);
                setDataLoading(false);
                return;
            }

            const uniqueIds = [...new Set(participantIds)];
            
            const usersMap = new Map<string, NdaraUser>();
            if (uniqueIds.length > 0) {
                // Fetch users in chunks of 30
                for (let i = 0; i < uniqueIds.length; i += 30) {
                    const chunk = uniqueIds.slice(i, i+30);
                    const usersQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
                    const usersSnap = await getDocs(usersQuery);
                    usersSnap.forEach(doc => usersMap.set(doc.data().uid, doc.data() as NdaraUser));
                }
            }
            
            const newEnrichedChats = chats.map(chat => {
                const otherId = chat.participants.find(p => p !== user?.uid);
                return {
                    ...chat,
                    otherParticipant: usersMap.get(otherId || '') || { fullName: 'Utilisateur Supprimé', uid: '' }
                }
            }).filter(c => c.otherParticipant.uid);

            setEnrichedChats(newEnrichedChats);
            setDataLoading(false);
        };

        enrichChats();
    }, [chats, user, db, chatsLoading]);
    
    const isLoading = chatsLoading || dataLoading;

    return (
        <div className="bg-slate-900/70 h-full flex flex-col">
            <header className="p-4 border-b border-slate-800 flex-shrink-0">
                 <Button className="w-full" variant="outline" onClick={() => router.push('/student/annuaire')}>
                    <UserPlus className="mr-2 h-4 w-4"/>
                    Nouveau message
                </Button>
            </header>
            <ScrollArea className="flex-1">
                <div className="p-2">
                {isLoading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[76px] w-full rounded-lg bg-slate-800" />)}
                    </div>
                ) : enrichedChats.length > 0 ? (
                    enrichedChats.map(chat => (
                        <ChatListItem 
                            key={chat.id} 
                            chat={chat} 
                            isSelected={chat.id === selectedChatId}
                            unreadCount={chat.unreadBy?.includes(user!.uid) ? 1 : 0}
                        />
                    ))
                ) : (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        <p>Aucune conversation. Trouvez des membres dans l'annuaire pour commencer à discuter !</p>
                    </div>
                )}
                </div>
            </ScrollArea>
        </div>
    );
}
