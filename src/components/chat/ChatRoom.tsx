
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRole } from '@/context/RoleContext';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
  getFirestore,
  where,
  getDocs,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Loader2, Send, Shield, ArrowLeft, Video, Phone, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '../ui/badge';
import type { NdaraUser, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import type { Message } from '@/lib/types';


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
  const { t } = useTranslation();
  const { toast } = useToast();

  const [timeSinceLastSeen, setTimeSinceLastSeen] = useState('');

  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderId !== user?.uid && lastMessage.status !== 'read') {
        if (document.hidden) {
          document.title = '(1) Nouveau message | Ndara Afrique';
          audioRef.current?.play().catch(e => console.log("Audio play failed:", e));
        } else {
            audioRef.current?.play().catch(e => console.log("Audio play failed:", e));
        }
      }
    }
  }, [messages, user?.uid]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        document.title = 'Ndara Afrique | Messagerie';
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);


  useEffect(() => {
    if (!chatId || !user) return;
    setIsLoading(true);

    const chatDocRef = doc(db, "chats", chatId);
    const messagesCollectionRef = collection(chatDocRef, "messages");

    const fetchParticipantDetails = async () => {
      const chatDoc = await getDoc(chatDocRef);
      if (chatDoc.exists()) {
        const participants = chatDoc.data().participants as string[];
        const otherId = participants.find(p => p !== user.uid);
        if (otherId) {
          setOtherParticipantId(otherId);
          const userDocRef = doc(db, 'users', otherId);
          onSnapshot(userDocRef, (userDoc) => {
            if (userDoc.exists()) {
                setOtherParticipant(userDoc.data() as ParticipantDetails);
            }
          });
        }
      }
    };

    fetchParticipantDetails();

    const q = query(messagesCollectionRef, orderBy("createdAt", "asc"));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(docs);
      setIsLoading(false);
    }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `chats/${chatId}/messages`,
            operation: 'list'
        }));
        setIsLoading(false);
    });

    return () => {
      unsubscribeMessages();
    };
  }, [chatId, user, db]);

  useEffect(() => {
    if (messages.length === 0 || !otherParticipantId) return;

    const markAsRead = async () => {
        const chatRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatRef);
        if (chatSnap.exists() && chatSnap.data().unreadBy?.includes(user?.uid || '')) {
            const batch = writeBatch(db);
            batch.update(chatRef, { unreadBy: [] });
            
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.senderId !== user?.uid) {
                const messageRef = doc(db, 'chats', chatId, 'messages', lastMessage.id);
                batch.update(messageRef, { status: 'read' });
            }

            await batch.commit();
        }
    };

    if (document.visibilityState === 'visible') {
        markAsRead();
    }
    
    const handleVisibility = () => {
        if(document.visibilityState === 'visible') {
            markAsRead();
        }
    }
    
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => document.removeEventListener('visibilitychange', handleVisibility);

  }, [messages, otherParticipantId, chatId, db, user?.uid]);


  useEffect(() => {
     if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    const updateLastSeen = () => {
        if (otherParticipant?.lastSeen?.toDate) {
            setTimeSinceLastSeen(formatDistanceToNow(otherParticipant.lastSeen.toDate(), { locale: fr, addSuffix: true }));
        } else {
            setTimeSinceLastSeen('Récemment');
        }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000); // Update every minute
    return () => clearInterval(interval);

  }, [otherParticipant]);


  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !otherParticipantId) return;
    
    setIsSending(true);
    const textToSend = newMessage.trim();
    setNewMessage("");
    
    const chatDocRef = doc(db, "chats", chatId);
    const messagesCollectionRef = collection(chatDocRef, "messages");

    try {
        const batch = writeBatch(db);
        
        const messagePayload = {
            text: textToSend,
            senderId: user.uid,
            createdAt: serverTimestamp(),
            status: 'sent' as const,
        };
        const messageRef = doc(messagesCollectionRef);
        batch.set(messageRef, messagePayload);
        
        batch.update(chatDocRef, {
            lastMessage: textToSend,
            updatedAt: serverTimestamp(),
            lastSenderId: user.uid,
            unreadBy: [otherParticipantId],
        });

        await batch.commit();

    } catch (err: any) {
      console.error(err);
       toast({ variant: 'destructive', title: 'Erreur', description: err.message.includes('permission-denied') ? t('chat_permission_denied') : "Impossible d'envoyer le message." });
    } finally {
        setIsSending(false);
    }
  };
  
  const RoleBadge = ({ role }: { role: UserRole | undefined }) => {
    if (!role || role === 'student') return null;

    const styles = {
        admin: 'bg-destructive text-destructive-foreground',
        instructor: 'bg-blue-600 text-white',
    };

    return (
        <Badge className={cn('ml-2 capitalize text-xs', styles[role])}>
            <Shield className="h-3 w-3 mr-1"/>
            {role}
        </Badge>
    );
  };

  const ReadReceipt = ({ status }: { status: Message['status'] }) => {
    if (status === 'read') {
      return <CheckCheck className="h-4 w-4 text-blue-500" />;
    }
    if (status === 'delivered') {
      return <CheckCheck className="h-4 w-4 text-slate-400" />;
    }
    // Default to 'sent'
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
                    {otherParticipant?.isOnline ? <span className="text-green-500 font-semibold">{t('online')}</span> : `${t('seen')} ${timeSinceLastSeen}`}
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
                                {msg.text}
                                {isMe && (
                                  <div className="flex items-center gap-1 justify-end mt-1">
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                      {msg.createdAt ? msg.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                    <ReadReceipt status={msg.status} />
                                  </div>
                                )}
                                {!isMe && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 float-right mt-1 ml-2">
                                      {msg.createdAt ? msg.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>

        <div className="p-2 border-t bg-slate-100 dark:bg-[#202c33] border-slate-200 dark:border-slate-900/50">
            <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('write_msg')}
                    disabled={isSending}
                    className="flex-1 h-12 rounded-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus-visible:ring-primary text-base shadow-md"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending} className="shrink-0 h-12 w-12 rounded-full bg-primary hover:bg-primary/90 shadow-md">
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    <span className="sr-only">{t('send')}</span>
                </Button>
            </form>
        </div>
    </div>
  );
}
