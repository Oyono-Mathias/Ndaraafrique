
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc,
  writeBatch,
  serverTimestamp,
  getFirestore,
  arrayRemove,
  arrayUnion,
  updateDoc
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Shield, ArrowLeft, Video, Phone, Check, CheckCheck, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { NdaraUser, UserRole, Message } from '@/lib/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ParticipantDetails {
    username: string;
    profilePictureURL?: string;
    role: UserRole;
    isOnline?: boolean;
    lastSeen?: any;
}

export function ChatRoom({ chatId }: { chatId: string }) {
  const { user } = useRole();
  const db = getFirestore();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherParticipant, setOtherParticipant] = useState<ParticipantDetails | null>(null);
  const [otherParticipantId, setOtherParticipantId] = useState<string | null>(null);
  const [participantLoading, setParticipantLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [timeSinceLastSeen, setTimeSinceLastSeen] = useState('');

  const isLoading = participantLoading || messagesLoading;

  useEffect(() => {
    const updateLastSeen = () => {
       const date = (otherParticipant?.lastSeen as any)?.toDate?.();
       if (date) {
            setTimeSinceLastSeen(formatDistanceToNowStrict(date, { addSuffix: true, locale: fr }));
        }
    };
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000);
    return () => clearInterval(interval);
  }, [otherParticipant?.lastSeen]);
  
  useEffect(() => {
    if (!chatId || !user) {
        setParticipantLoading(false);
        return;
    }
    setParticipantLoading(true);
    const chatRef = doc(db, 'chats', chatId);
    const unsubscribe = onSnapshot(chatRef, (docSnap) => {
        if (docSnap.exists()) {
            const chatData = docSnap.data();
            const otherId = chatData.participants.find((p: string) => p !== user.uid);
            setOtherParticipantId(otherId);

            if (otherId) {
                const userRef = doc(db, 'users', otherId);
                onSnapshot(userRef, (userSnap) => {
                    if (userSnap.exists()) {
                        setOtherParticipant(userSnap.data() as ParticipantDetails);
                    }
                })
            }

            if (chatData.unreadBy?.includes(user.uid)) {
                updateDoc(chatRef, { unreadBy: arrayRemove(user.uid) });
            }
        }
        setParticipantLoading(false);
    });
    return () => unsubscribe();
}, [chatId, user, db, router]);

  useEffect(() => {
    if (!chatId) return;
    const messagesQuery = query(collection(db, `chats/${chatId}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
        const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(msgs);
        setMessagesLoading(false);
    });
    return () => unsubscribe();
  }, [chatId, db]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);


  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending || !otherParticipantId) return;
    
    setIsSending(true);
    const textToSend = newMessage.trim();
    setNewMessage("");
    
    try {
        const batch = writeBatch(db);
        const newMsgRef = doc(collection(db, `chats/${chatId}/messages`));
        batch.set(newMsgRef, {
            senderId: user.uid,
            text: textToSend,
            createdAt: serverTimestamp(),
            status: 'sent',
        });

        const chatRef = doc(db, 'chats', chatId);
        batch.update(chatRef, {
            lastMessage: textToSend,
            updatedAt: serverTimestamp(),
            lastSenderId: user.uid,
            unreadBy: arrayUnion(otherParticipantId)
        });
        
        await batch.commit();
    } catch(err) {
        console.error("Error sending message:", err);
    } finally {
        setIsSending(false);
    }
  };
  
  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
       <header className="flex items-center p-3 border-b bg-slate-800/80 backdrop-blur-sm border-slate-700">
            <Button variant="ghost" size="icon" className="mr-2 md:hidden" onClick={() => router.push('/student/messages')}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10">
                <AvatarImage src={otherParticipant?.profilePictureURL} />
                <AvatarFallback>{otherParticipant?.username?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div className="ml-3 flex-1">
                <h2 className="font-bold text-base text-slate-100">
                    {otherParticipant?.username || "Utilisateur"}
                </h2>
                 <p className="text-xs text-slate-400">
                    {otherParticipant?.isOnline ? <span className="text-green-500 font-semibold">En ligne</span> : (timeSinceLastSeen ? `Vu ${timeSinceLastSeen}` : `Hors ligne`)}
                </p>
            </div>
        </header>

        <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 sm:p-6 space-y-1">
                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                        <div key={msg.id} className={cn("flex items-end gap-2 max-w-[85%]", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
                            <div className={cn("rounded-xl px-3 py-2 text-[15px] shadow-sm relative", isMe ? "bg-primary text-primary-foreground" : "bg-slate-700 text-slate-100")}>
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                <span className="text-[10px] opacity-70 float-right mt-1 ml-2">
                                    {(msg.createdAt as any)?.toDate?.()?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>

        <div className="p-2 border-t bg-slate-800/80 border-slate-700">
            <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrire un message..."
                    className="flex-1 h-12 rounded-full bg-slate-700 border-slate-600 text-base"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending} className="shrink-0 h-12 w-12 rounded-full">
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
            </form>
        </div>
    </div>
  );
}
