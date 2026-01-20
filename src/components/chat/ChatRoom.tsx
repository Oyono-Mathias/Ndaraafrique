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
import { Loader2, Send, Shield, ArrowLeft, Video, Phone, Check, CheckCheck, Briefcase, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '../ui/badge';
import type { NdaraUser, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
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
  
  const [timeSinceLastSeen, setTimeSinceLastSeen] = useState('');

  // Static data for UI design
  useEffect(() => {
    setIsLoading(true);
    setOtherParticipant({
        username: 'Amina Diallo', profilePictureURL: '/placeholder-avatars/amina.jpg',
        isOnline: true, role: 'student', lastSeen: new Date()
    });
    setMessages([
        { id: 'm1', senderId: 'other', text: 'Salut ! 👋', createdAt: new Timestamp(Date.now() / 1000 - 600, 0), status: 'read' },
        { id: 'm2', senderId: 'me', text: 'Hey Amina ! Bien ?', createdAt: new Timestamp(Date.now() / 1000 - 500, 0), status: 'read' },
        { id: 'm3', senderId: 'other', text: "Super et toi ? J'ai une petite question concernant la leçon sur le CSS Grid.", createdAt: new Timestamp(Date.now() / 1000 - 400, 0), status: 'read' },
    ]);
    setIsLoading(false);
  }, [chatId]);


  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user ) return;
    
    setIsSending(true);
    const textToSend = newMessage.trim();
    setNewMessage("");

    // optimistic UI update
    const tempMessage = {
        id: 'temp-' + Date.now(),
        text: textToSend,
        senderId: user.uid,
        createdAt: Timestamp.now(),
        status: 'sent' as const
    };
    setMessages(prev => [...prev, tempMessage]);

    // Simulate sending
    setTimeout(() => {
      setIsSending(false);
    }, 500);
  };
  
  const RoleBadge = ({ role }: { role: UserRole | undefined }) => {
    if (!role || role === 'student') return null;

    const roleInfo = {
        admin: {
            label: 'Admin',
            icon: Shield,
            className: 'bg-destructive/10 text-destructive border-destructive/30',
        },
        instructor: {
            label: 'Formateur',
            icon: Briefcase,
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
    if (status === 'read') {
      return <CheckCheck className="h-4 w-4 text-blue-500" />;
    }
    if (status === 'delivered') {
      return <CheckCheck className="h-4 w-4 text-slate-400" />;
    }
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
                    {otherParticipant?.isOnline ? <span className="text-green-500 font-semibold">En ligne</span> : `Vu il y a 2h`}
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
                    const isMe = msg.senderId !== 'other';
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
    