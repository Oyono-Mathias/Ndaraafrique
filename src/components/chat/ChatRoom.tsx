'use client';

/**
 * @fileOverview Salon de discussion immersif (Style WhatsApp Android exact).
 * Gère l'affichage des messages en temps réel et l'interface flottante.
 */

import { useState, useEffect, useRef } from 'react';
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
import { Loader2, Send, ArrowLeft, MoreVertical, Phone, Video, CheckCheck, Paperclip, Smile, Camera, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, NdaraUser } from '@/lib/types';
import { format } from 'date-fns';
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

  useEffect(() => {
    if (!chatId || !user) return;

    const chatRef = doc(db, 'chats', chatId);
    const unsubChat = onSnapshot(chatRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            const otherId = data.participants.find((p: string) => p !== user.uid);
            
            if (otherId && (!otherParticipant || otherParticipant.uid !== otherId)) {
                onSnapshot(doc(db, 'users', otherId), (uSnap) => {
                    if (uSnap.exists()) {
                        setOtherParticipant({ uid: uSnap.id, ...uSnap.data() } as NdaraUser);
                    }
                });
            }

            // Marquage comme lu
            if (data.unreadBy?.includes(user.uid)) {
                updateDoc(chatRef, { 
                    unreadBy: arrayRemove(user.uid) 
                }).catch(err => console.error("Error marking as read:", err));
            }
        }
    });

    return () => unsubChat();
  }, [chatId, user, db, otherParticipant]);

  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(db, `chats/${chatId}/messages`), orderBy('createdAt', 'asc'));
    
    const unsubMsgs = onSnapshot(q, (snap) => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        setMessages(msgs);
        
        setTimeout(() => {
            if (scrollAreaRef.current) {
                const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
                if (viewport) {
                    viewport.scrollTop = viewport.scrollHeight;
                }
            }
        }, 100);
    });
    
    return () => unsubMsgs();
  }, [chatId, db]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending) return;
    
    const text = newMessage.trim();
    setNewMessage("");
    setIsSending(true);
    
    try {
        const batch = writeBatch(db);
        const msgRef = doc(collection(db, `chats/${chatId}/messages`));
        const chatRef = doc(db, 'chats', chatId);

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
        console.error("Failed to send message:", err);
    } finally {
        setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a] relative overflow-hidden">
       {/* Fond doodle WhatsApp exact */}
       <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('https://i.postimg.cc/9FmXdBZ0/whatsapp-bg.png')] z-0 bg-repeat" />

       {/* --- HEADER --- */}
       <header className="flex items-center p-2 border-b border-white/5 bg-[#111b21] z-30 shadow-md">
            <Button 
                variant="ghost" 
                size="icon" 
                className="mr-0 text-slate-300 h-10 w-8 rounded-full" 
                onClick={() => router.push('/student/messages')}
            >
                <ArrowLeft className="h-6 w-6" />
            </Button>
            
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
              <Avatar className="h-9 w-9 border border-white/10">
                  <AvatarImage src={otherParticipant?.profilePictureURL} className="object-cover" />
                  <AvatarFallback className="bg-[#2a3942] text-slate-400 font-bold">
                      {otherParticipant?.fullName?.charAt(0)}
                  </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                  <h2 className="font-bold text-sm text-white truncate leading-none">
                      {otherParticipant?.fullName || 'Chargement...'}
                  </h2>
                  <p className="text-[10px] text-emerald-500 font-medium mt-1">
                      {otherParticipant?.isOnline ? 'en ligne' : ''}
                  </p>
              </div>
            </div>

            <div className="flex items-center gap-0">
                <Button variant="ghost" size="icon" className="text-slate-300 h-10 w-10"><Video className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-300 h-10 w-10"><Phone className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-300 h-10 w-10"><MoreVertical className="h-5 w-5" /></Button>
            </div>
        </header>

        {/* --- MESSAGES --- */}
        <ScrollArea className="flex-1 z-10" ref={scrollAreaRef}>
            <div className="p-4 space-y-2 flex flex-col min-h-full">
                <div className="self-center my-4">
                    <span className="bg-[#182229] text-[11px] font-medium text-[#8696a0] px-3 py-1 rounded-lg shadow-sm">
                        Aujourd'hui
                    </span>
                </div>

                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    const date = (msg.createdAt as any)?.toDate?.() || new Date();
                    
                    return (
                        <div key={msg.id} className={cn(
                            "flex flex-col mb-1",
                            isMe ? "items-end" : "items-start"
                        )}>
                            <div className={cn(
                                "max-w-[85%] px-2.5 py-1.5 rounded-lg text-[14.5px] leading-relaxed shadow-sm relative min-w-[60px]",
                                isMe 
                                    ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none" 
                                    : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                            )}>
                                <span className="pr-12">{msg.text}</span>
                                <div className={cn(
                                  "absolute bottom-1 right-1.5 flex items-center gap-1",
                                  isMe ? "text-[#e9edef]/60" : "text-[#8696a0]"
                                )}>
                                  <span className="text-[10px]">{format(date, 'HH:mm', { locale: fr })}</span>
                                  {isMe && <CheckCheck className="h-3 w-3 text-[#53bdeb]" />}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>

        {/* --- INPUT (BARRE DE SAISIE FLOTTANTE) --- */}
        <div className="p-2 bg-transparent safe-area-pb z-20 flex items-end gap-2">
            <div className="flex-1 bg-[#2a3942] rounded-[24px] flex items-center px-3 py-1 min-h-[48px] shadow-md">
                <Button variant="ghost" size="icon" className="text-[#8696a0] h-10 w-10 shrink-0"><Smile className="h-6 w-6" /></Button>
                <form onSubmit={handleSend} className="flex-1 flex items-center">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Message"
                        className="flex-1 bg-transparent border-none text-white placeholder:text-[#8696a0] text-[16px] h-10 focus-visible:ring-0 shadow-none px-1"
                    />
                </form>
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="text-[#8696a0] h-10 w-10 shrink-0"><Paperclip className="h-5 w-5 -rotate-45" /></Button>
                    {!newMessage.trim() && <Button variant="ghost" size="icon" className="text-[#8696a0] h-10 w-10 shrink-0"><Camera className="h-5 w-5" /></Button>}
                </div>
            </div>
            
            <Button 
                onClick={handleSend}
                disabled={isSending}
                className={cn(
                    "h-12 w-12 rounded-full shadow-lg shrink-0 flex items-center justify-center p-0 transition-all active:scale-90",
                    "bg-[#00a884] hover:bg-[#00a884]/90"
                )}
            >
                {newMessage.trim() ? (
                    isSending ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Send className="h-5 w-5 text-white fill-white translate-x-0.5" />
                ) : (
                    <Mic className="h-5 w-5 text-white" />
                )}
            </Button>
        </div>
    </div>
  );
}