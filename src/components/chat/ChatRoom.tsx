'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  addDoc,
  Timestamp,
  getDoc,
  arrayRemove,
  arrayUnion,
  updateDoc
} from 'firebase/firestore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Loader2, Send, Shield, ArrowLeft, Video, Phone, Check, CheckCheck, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '../ui/badge';
import type { NdaraUser, UserRole, Message } from '@/lib/types';
import { useRouter } from 'next/navigation';
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
  const [otherParticipant, setOtherParticipant] = useState<ParticipantDetails | null>(null);
  const [otherParticipantId, setOtherParticipantId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastMessageRef = useRef<string | null>(null);
  
  const [timeSinceLastSeen, setTimeSinceLastSeen] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
        audioRef.current = new Audio('/sounds/message-sent.mp3');
        audioRef.current.volume = 0.5;
    }
  }, []);
  
  const playSentSound = useCallback(() => {
    audioRef.current?.play().catch(e => console.error("Failed to play sound", e));
  }, []);
  
  // Update "last seen" time every minute
  useEffect(() => {
    const updateLastSeen = () => {
       if (otherParticipant?.lastSeen) {
            setTimeSinceLastSeen(formatDistanceToNowStrict(otherParticipant.lastSeen.toDate(), { addSuffix: true, locale: fr }));
        }
    };
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000);
    return () => clearInterval(interval);
  }, [otherParticipant?.lastSeen]);
  
  // Fetch chat doc and other participant details
  useEffect(() => {
    if (!chatId || !user) return;
    setIsLoading(true);
    const chatRef = doc(db, 'chats', chatId);
    const unsubscribe = onSnapshot(chatRef, async (docSnap) => {
        if (docSnap.exists()) {
            const chatData = docSnap.data();
            const otherId = chatData.participants.find((p: string) => p !== user.uid);
            setOtherParticipantId(otherId);

            if (otherId) {
                const userRef = doc(db, 'users', otherId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setOtherParticipant(userSnap.data() as ParticipantDetails);
                }
            }
            if (chatData.unreadBy?.includes(user.uid)) {
                updateDoc(chatRef, { unreadBy: arrayRemove(user.uid) });
            }
        } else {
            router.push('/messages');
        }
    });
    return () => unsubscribe();
  }, [chatId, user, db, router]);

  // Fetch messages
  useEffect(() => {
    if (!chatId) return;
    const messagesQuery = query(collection(db, `chats/${chatId}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
        const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        
        // Optimistic check to avoid re-adding local messages
        const serverMessages = msgs.filter(m => !m.id.startsWith('temp-'));
        
        const latestServerMessageId = serverMessages[serverMessages.length - 1]?.id;
        
        setMessages(prev => {
            const tempMessages = prev.filter(m => m.id.startsWith('temp-'));
            if(latestServerMessageId === lastMessageRef.current) {
                return [...serverMessages, ...tempMessages];
            }
            lastMessageRef.current = latestServerMessageId;
            return serverMessages;
        });

        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [chatId, db]);

  // Auto-scroll logic
  useEffect(() => {
    setTimeout(() => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }
    }, 100);
  }, [messages]);


  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending || !otherParticipantId) return;
    
    setIsSending(true);
    const textToSend = newMessage.trim();
    setNewMessage("");
    playSentSound();
    
    const tempId = 'temp-' + Date.now();
    const tempMessage = {
        id: tempId,
        text: textToSend,
        senderId: user.uid,
        createdAt: Timestamp.now(),
        status: 'sent' as const
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
        const batch = writeBatch(db);
        const messagesRef = collection(db, `chats/${chatId}/messages`);
        const newMsgRef = doc(messagesRef);
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
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setNewMessage(textToSend);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `chats/${chatId}/messages`,
            operation: 'create'
        }));
    } finally {
        setIsSending(false);
    }
  };
  
  const RoleBadge = ({ role }: { role: UserRole | undefined }) => {
    if (!role || role === 'student') return null;

    const roleInfo = {
        admin: {
            label: 'Admin', icon: Shield,
            className: 'bg-destructive/10 text-destructive border-destructive/30',
        },
        instructor: {
            label: 'Formateur', icon: Briefcase,
            className: 'bg-primary/10 text-primary border-primary/30',
        },
        student: {}
    };
    
    const currentRole = roleInfo[role];
    if (!currentRole.label) return null;
    
    const { label, icon: Icon, className } = currentRole;

    return (
        <Badge className={cn('ml-2 capitalize text-xs font-semibold', className)}>
            <Icon className="h-3 w-3 mr-1"/>
            {label}
        </Badge>
    );
  };

  const ReadReceipt = ({ status }: { status: Message['status'] }) => {
    if (status === 'read') return <CheckCheck className="h-4 w-4 text-blue-500" />;
    if (status === 'delivered') return <CheckCheck className="h-4 w-4 text-slate-400" />;
    return <Check className="h-4 w-4 text-slate-400" />;
  };

  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full chat-background dark:bg-[#0b141a]">
       <header className="flex items-center p-3 border-b bg-slate-100 dark:bg-[#202c33] backdrop-blur-sm sticky top-0 z-10 dark:border-slate-700/80">
            <Button variant="ghost" size="icon" className="mr-2 md:hidden" onClick={() => router.push('/messages')}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10">
                <AvatarImage src={otherParticipant?.profilePictureURL} />
                <AvatarFallback>{otherParticipant?.username?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div className="ml-3 flex-1">
                <h2 className="font-bold text-base flex items-center text-slate-900 dark:text-slate-100">
                    {otherParticipant?.username || "Utilisateur"}
                    <RoleBadge role={otherParticipant?.role} />
                </h2>
                 <p className="text-xs text-slate-500 dark:text-slate-400">
                    {otherParticipant?.isOnline ? <span className="text-green-500 font-semibold">En ligne</span> : (timeSinceLastSeen ? `Vu ${timeSinceLastSeen}` : `Hors ligne`)}
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon"><Video className="h-5 w-5 text-slate-600 dark:text-slate-400" /></Button>
                <Button variant="ghost" size="icon"><Phone className="h-5 w-5 text-slate-600 dark:text-slate-400" /></Button>
            </div>
        </header>

        <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 sm:p-6 space-y-1">
                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                        <div 
                            key={msg.id} 
                            className={cn("flex items-end gap-2 max-w-[85%]", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}
                        >
                            <div className={cn(
                                "rounded-xl px-3 py-2 text-[15px] shadow-sm relative",
                                isMe 
                                    ? "chat-bubble-sent bg-[#dcf8c6] text-slate-800 dark:bg-[#075e54] dark:text-slate-100" 
                                    : "chat-bubble-received bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                            )}>
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                {isMe && (
                                  <div className="flex items-center gap-1 justify-end mt-1">
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                      {msg.createdAt ? new Date(msg.createdAt.toDate ? msg.createdAt.toDate() : msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                    <ReadReceipt status={msg.status} />
                                  </div>
                                )}
                                {!isMe && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 float-right mt-1 ml-2">
                                      {msg.createdAt ? new Date(msg.createdAt.toDate ? msg.createdAt.toDate() : msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>

        <div className="p-2 border-t bg-slate-100 dark:bg-[#202c33] border-slate-200 dark:border-slate-700/50">
            <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrire un message..."
                    disabled={isSending}
                    className="flex-1 h-12 rounded-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus-visible:ring-primary text-base shadow-md"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending} className="shrink-0 h-12 w-12 rounded-full bg-primary hover:bg-primary/90 shadow-md">
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    <span className="sr-only">Envoyer</span>
                </Button>
            </form>
        </div>
    </div>
  );
}
