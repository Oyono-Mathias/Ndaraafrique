
'use client';

/**
 * @fileOverview Salon de discussion Android-First & Vintage.
 * Bulles contrastées, saisie fixe et temps réel Firestore.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
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
import { Loader2, Send, ArrowLeft, MoreVertical, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, NdaraUser } from '@/lib/types';
import { format, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

export function ChatRoom({ chatId }: { chatId: string }) {
  const { user } = useRole();
  const db = getFirestore();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherParticipant, setOtherParticipant] = useState<Partial<NdaraUser> | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 1. Charger les infos de l'autre personne et marquer comme lu
  useEffect(() => {
    if (!chatId || !user) return;

    const chatRef = doc(db, 'chats', chatId);
    const unsubChat = onSnapshot(chatRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            const otherId = data.participants.find((p: string) => p !== user.uid);
            
            if (otherId) {
                onSnapshot(doc(db, 'users', otherId), (uSnap) => {
                    setOtherParticipant(uSnap.data() as NdaraUser);
                });
            }

            // Marquer comme lu
            if (data.unreadBy?.includes(user.uid)) {
                updateDoc(chatRef, { unreadBy: arrayRemove(user.uid) });
            }
        }
    });

    return () => unsubChat();
  }, [chatId, user, db]);

  // 2. Charger les messages en temps réel
  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(db, `chats/${chatId}/messages`), orderBy('createdAt', 'asc'));
    const unsubMsgs = onSnapshot(q, (snap) => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
        // Scroll to bottom
        setTimeout(() => {
            if (scrollAreaRef.current) {
                const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
                if (viewport) viewport.scrollTop = viewport.scrollHeight;
            }
        }, 100);
    });
    return () => unsubMsgs();
  }, [chatId, db]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending) return;
    
    setIsSending(true);
    const text = newMessage.trim();
    setNewMessage("");
    
    try {
        const batch = writeBatch(db);
        const msgRef = doc(collection(db, `chats/${chatId}/messages`));
        const chatRef = doc(db, 'chats', chatId);
        const otherId = chatId.split('_').find(id => id !== user.uid); // Fallback logic

        batch.set(msgRef, {
            senderId: user.uid,
            text,
            createdAt: serverTimestamp(),
            status: 'sent',
        });

        batch.update(chatRef, {
            lastMessage: text,
            updatedAt: serverTimestamp(),
            lastSenderId: user.uid,
            unreadBy: arrayUnion(otherParticipant?.uid || '')
        });
        
        await batch.commit();
    } catch (err) {
        console.error(err);
    } finally {
        setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 relative overflow-hidden bg-grainy">
       <header className="flex items-center p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-20">
            <Button variant="ghost" size="icon" className="mr-3 text-slate-400" onClick={() => router.push('/student/messages')}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10 border border-slate-700 shadow-lg">
                <AvatarImage src={otherParticipant?.profilePictureURL} className="object-cover" />
                <AvatarFallback>{otherParticipant?.fullName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="ml-3 flex-1 overflow-hidden">
                <h2 className="font-bold text-sm text-white truncate">{otherParticipant?.fullName}</h2>
                <p className="text-[9px] font-black text-[#CC7722] uppercase tracking-widest">
                    {otherParticipant?.isOnline ? "En ligne" : "Membre Ndara"}
                </p>
            </div>
            <Button variant="ghost" size="icon" className="text-slate-600"><MoreVertical className="h-5 w-5" /></Button>
        </header>

        <ScrollArea className="flex-1 px-4 py-6" ref={scrollAreaRef}>
            <div className="space-y-4 max-w-2xl mx-auto">
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.uid;
                    const date = (msg.createdAt as any)?.toDate?.();
                    
                    return (
                        <div key={msg.id} className={cn(
                            "flex flex-col",
                            isMe ? "items-end" : "items-start"
                        )}>
                            <div className={cn(
                                "max-w-[85%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-xl border-2",
                                isMe 
                                    ? "bg-[#CC7722] border-[#CC7722]/50 text-white rounded-tr-none" 
                                    : "bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none"
                            )}>
                                {msg.text}
                            </div>
                            <span className="text-[8px] font-bold text-slate-600 mt-1 uppercase tracking-tighter">
                                {date ? format(date, isToday(date) ? 'HH:mm' : 'dd MMM HH:mm', { locale: fr }) : '...'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>

        <div className="p-4 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800 safe-area-pb">
            <form onSubmit={handleSend} className="flex items-center gap-3 max-w-2xl mx-auto">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrire à votre Ndara..."
                    className="flex-1 h-12 rounded-2xl bg-slate-900 border-slate-800 text-sm focus-visible:ring-[#CC7722]/30"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending} className="h-12 w-12 rounded-2xl bg-[#CC7722] hover:bg-[#CC7722]/90 shadow-lg shadow-[#CC7722]/20">
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
            </form>
        </div>
    </div>
  );
}
