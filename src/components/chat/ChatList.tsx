'use client';

/**
 * @fileOverview Liste des conversations Ndara Afrique (Android-First).
 * Synchronisation en temps réel avec Firestore et horodatage dynamique.
 * Design inspiré par Qwen : Fintech Vintage & WhatsApp Style.
 */

import { useState, useMemo, useEffect } from 'react';
import { getFirestore, collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { MessageSquare, Search, UserPlus, MoreVertical, ShieldAlert, Users, GraduationCap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Chat, NdaraUser } from '@/lib/types';
import { isToday, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface EnrichedChat extends Chat {
  otherParticipant: Partial<NdaraUser>;
}

const ChatListItem = ({ chat, isSelected, isUnread, isAdmin }: { chat: EnrichedChat, isSelected: boolean, isUnread: boolean, isAdmin: boolean }) => {
    const router = useRouter();
    const { user } = useRole();
    
    const lastDate = useMemo(() => {
        if (!chat.updatedAt) return new Date();
        return (chat.updatedAt as any).toDate ? (chat.updatedAt as any).toDate() : new Date(chat.updatedAt as any);
    }, [chat.updatedAt]);

    const displayTime = useMemo(() => {
        if (isToday(lastDate)) {
            return format(lastDate, 'HH:mm', { locale: fr });
        }
        return format(lastDate, 'dd/MM/yy', { locale: fr });
    }, [lastDate]);

    const isInstructor = chat.otherParticipant.role === 'instructor';

    return (
        <button 
            onClick={() => router.push(`${isAdmin ? '/admin' : '/student'}/messages?chatId=${chat.id}`)}
            className={cn(
                "w-full text-left p-4 flex items-center gap-4 transition-all active:scale-[0.97] border-b border-white/5",
                isSelected ? "bg-primary/10" : "hover:bg-slate-900/40"
            )}
        >
            <div className="relative flex-shrink-0">
                <Avatar className={cn(
                    "h-14 w-14 border-2 shadow-xl",
                    isInstructor ? "border-primary/30" : "border-white/10"
                )}>
                    <AvatarImage src={chat.otherParticipant.profilePictureURL} className="object-cover" />
                    <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase text-lg">
                        {chat.otherParticipant.fullName?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                {chat.otherParticipant.isOnline && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full border-2 border-slate-950 shadow-lg animate-pulse" />
                )}
                {isInstructor && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md">
                        <GraduationCap className="h-2.5 w-2.5 text-slate-950" />
                    </div>
                )}
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <p className={cn(
                            "truncate text-[15px] tracking-tight",
                            isUnread ? "font-black text-white" : "font-bold text-slate-300"
                        )}>
                            {chat.otherParticipant.fullName}
                        </p>
                        {chat.status === 'blocked' && isAdmin && (
                            <ShieldAlert className="h-3 w-3 text-red-500 shrink-0" />
                        )}
                    </div>
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-tighter shrink-0",
                        isUnread ? "text-primary" : "text-slate-500"
                    )}>
                        {displayTime}
                    </span>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                        "text-sm truncate leading-snug flex-1",
                        isUnread ? "text-slate-100 font-bold" : "text-slate-500 font-medium"
                    )}>
                        {chat.lastMessage}
                    </p>
                    {isUnread && (
                        <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 animate-in zoom-in">
                            <span className="text-slate-950 text-[9px] font-black">!</span>
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
};

export function ChatList({ selectedChatId }: { selectedChatId: string | null }) {
    const { user, currentUser } = useRole();
    const db = getFirestore();
    const router = useRouter();
    const [enrichedChats, setEnrichedChats] = useState<EnrichedChat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        if (!user) return;

        const chatsQuery = query(
            collection(db, 'chats'), 
            where('participants', 'array-contains', user.uid), 
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(chatsQuery, async (snap) => {
            const chatsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
            const otherIds = chatsData.map(c => c.participants.find(p => p !== user.uid)).filter(Boolean) as string[];
            
            if (otherIds.length === 0) {
                setEnrichedChats([]);
                setIsLoading(false);
                return;
            }

            const usersMap = new Map<string, NdaraUser>();
            const uniqueOtherIds = [...new Set(otherIds)];

            for (let i = 0; i < uniqueOtherIds.length; i += 30) {
                const chunk = uniqueOtherIds.slice(i, i + 30);
                const q = query(collection(db, 'users'), where('uid', 'in', chunk));
                const userSnap = await getDocs(q);
                userSnap.forEach(d => usersMap.set(d.id, d.data() as NdaraUser));
            }

            const enriched = chatsData.map(chat => {
                const otherId = chat.participants.find(p => p !== user.uid);
                return {
                    ...chat,
                    otherParticipant: usersMap.get(otherId || '') || { fullName: 'Utilisateur Ndara' }
                };
            });

            setEnrichedChats(enriched);
            setIsLoading(false);
        }, (error) => {
            console.error("Firestore Chat Error:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, db]);

    const filteredChats = useMemo(() => {
        let results = enrichedChats.filter(c => 
            c.otherParticipant.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (activeFilter === 'unread') {
            results = results.filter(c => c.unreadBy?.includes(user!.uid));
        } else if (activeFilter === 'instructors') {
            results = results.filter(c => c.otherParticipant.role === 'instructor');
        }

        return results;
    }, [enrichedChats, searchTerm, activeFilter, user]);

    return (
        <div className="flex flex-col h-full bg-slate-950 relative overflow-hidden">
            <header className="px-4 pt-6 space-y-4 border-b border-white/5 bg-slate-950/95 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase">Messages</h1>
                    <Button variant="ghost" size="icon" className="rounded-full text-slate-400 h-10 w-10">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </div>
                
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                        <Search className="h-3.5 w-3.5 text-slate-500 group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input 
                        placeholder="Chercher une discussion..." 
                        className="h-12 pl-14 bg-slate-900 border-none rounded-[2rem] text-white placeholder:text-slate-600 focus-visible:ring-primary/20 shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-4">
                    <button 
                        onClick={() => setActiveFilter('all')}
                        className={cn(
                            "flex-shrink-0 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                            activeFilter === 'all' ? "bg-primary text-slate-950 shadow-lg shadow-primary/20" : "bg-slate-900 border border-white/5 text-slate-500"
                        )}
                    >
                        Tous
                    </button>
                    <button 
                        onClick={() => setActiveFilter('unread')}
                        className={cn(
                            "flex-shrink-0 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                            activeFilter === 'unread' ? "bg-primary text-slate-950" : "bg-slate-900 border border-white/5 text-slate-500"
                        )}
                    >
                        Non-lus
                    </button>
                    <button 
                        onClick={() => setActiveFilter('instructors')}
                        className={cn(
                            "flex-shrink-0 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                            activeFilter === 'instructors' ? "bg-primary text-slate-950" : "bg-slate-900 border border-white/5 text-slate-500"
                        )}
                    >
                        Formateurs
                    </button>
                </div>
            </header>

            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="px-4 space-y-4 pt-4">
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
                                isAdmin={isAdmin}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center opacity-20 h-full mt-20 animate-in zoom-in duration-700">
                        <div className="p-10 bg-slate-900/50 rounded-full mb-6 border border-white/5">
                            <MessageSquare className="h-20 w-20 text-slate-500" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-widest text-slate-400 leading-none">Silence radio</h2>
                        {!isAdmin && <p className="mt-3 text-sm font-medium tracking-tight max-w-[200px] mx-auto">Démarrez une conversation en consultant l'annuaire.</p>}
                    </div>
                )}
            </ScrollArea>

            {!isAdmin && (
                <button 
                    onClick={() => router.push('/student/annuaire')}
                    className="fixed bottom-24 right-6 h-16 w-16 rounded-full bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/40 z-40 transition-all active:scale-90 md:hidden flex items-center justify-center text-slate-950"
                >
                    <UserPlus className="h-6 w-6" />
                </button>
            )}
        </div>
    );
}
