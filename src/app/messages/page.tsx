
'use client';

import { useRole } from '@/context/RoleContext';
import {
  collection,
  query,
  where,
  getFirestore,
  orderBy,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareDashed } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// --- INTERFACES ---
interface Chat {
  id: string;
  participants: string[];
  participantDetails: Record<string, { fullName: string; profilePictureURL?: string; isOnline?: boolean }>;
  lastMessage?: string;
  updatedAt?: any;
  lastSenderId?: string;
  unreadBy?: string[];
}

// --- MAIN PAGE COMPONENT ---
export default function MessagesPage() {
  const { user, isUserLoading } = useRole();
  const db = getFirestore();
  
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for user's conversations in real-time
  useEffect(() => {
    if (!user?.uid) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const chatsQuery = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid), orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(chatsQuery, async (querySnapshot) => {
        const rawChats = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const allParticipantIds = [...new Set(rawChats.flatMap(c => c.participants))];
        
        if (allParticipantIds.length === 0) {
            setChatList([]);
            setIsLoading(false);
            return;
        }

        const detailsMap: Record<string, any> = {};
        const usersRef = collection(db, 'users');

        // Firestore 'in' query is limited to 30 items. Batching for larger scale apps would be needed.
        for (let i = 0; i < allParticipantIds.length; i += 30) {
            const batchIds = allParticipantIds.slice(i, i + 30);
            if (batchIds.length === 0) continue;
            const q = query(usersRef, where('uid', 'in', batchIds));
            const snap = await getDocs(q);
            snap.forEach(d => detailsMap[d.data().uid] = d.data());
        }
      
        const populated = rawChats.map(chat => ({
            ...chat,
            participantDetails: chat.participants.reduce((acc: any, pid: string) => {
              acc[pid] = detailsMap[pid] || { fullName: "Utilisateur inconnu" };
              return acc;
            }, {})
        }));

        setChatList(populated);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching chats:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, db, isUserLoading]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Messagerie</CardTitle>
        </CardHeader>
        <CardContent>
             <ScrollArea className="h-[calc(100vh-250px)]">
                {chatList.length > 0 ? (
                    <div className="space-y-1">
                        {chatList.map(chat => {
                            const otherId = chat.participants.find(p => p !== user?.uid);
                            const other = otherId ? chat.participantDetails[otherId] : null;
                            const isUnread = chat.unreadBy?.includes(user?.uid || '');

                            return (
                                <Link
                                    key={chat.id}
                                    href={`/messages/${chat.id}`}
                                    className={cn(
                                        "block p-3 rounded-lg flex items-center gap-4 transition-all hover:bg-muted",
                                        isUnread && "bg-primary/10"
                                    )}
                                >
                                    <div className="relative">
                                      <Avatar className="h-12 w-12 border-2 border-white">
                                          <AvatarImage src={other?.profilePictureURL} alt={other?.fullName}/>
                                          <AvatarFallback>{other?.fullName?.charAt(0) || '?'}</AvatarFallback>
                                      </Avatar>
                                      {other?.isOnline && <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />}
                                    </div>

                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-baseline">
                                            <p className={cn("truncate text-sm", isUnread ? "font-bold text-foreground" : "font-semibold text-foreground")}>
                                              {other?.fullName || "Utilisateur"}
                                            </p>
                                            {chat.updatedAt && (
                                                <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                                                    {formatDistanceToNow(chat.updatedAt.toDate(), { addSuffix: true, locale: fr })}
                                                </span>
                                            )}
                                        </div>
                                        <p className={cn("text-sm truncate leading-relaxed", isUnread ? "font-semibold text-foreground" : "text-muted-foreground")}>
                                            {chat.lastMessage || "Cliquez pour lire les messages"}
                                        </p>
                                    </div>
                                    {isUnread && <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0"></div>}
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-8 text-center text-muted-foreground h-full flex flex-col justify-center items-center">
                        <MessageSquareDashed className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <h3 className="font-semibold text-lg">Aucune conversation</h3>
                        <p className="text-sm">Commencez une nouvelle discussion pour la voir apparaître ici.</p>
                    </div>
                )}
            </ScrollArea>
        </CardContent>
    </Card>
  );
}
