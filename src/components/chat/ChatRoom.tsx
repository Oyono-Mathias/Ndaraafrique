'use client';

/**
 * @fileOverview Salon de discussion entre membres Ndara Afrique.
 * Design inspiré de WhatsApp : bulles asymétriques, en-tête fixe et saisie immersive.
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
import { Loader2, Send, ArrowLeft, MoreVertical } from 'lucide-react';
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

            if (data.unreadBy?.includes(user.uid)) {
                updateDoc(chatRef, { unreadBy: arrayRemove(user.uid) });
            }
        }
    });

    return () => unsubChat();
  }, [chatId, user, db]);

  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(db, `chats/${chatId}/messages`), orderBy('createdAt', 'asc'));
    const unsubMsgs = onSnapshot(q, (snap) => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
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
    <div className="flex flex-col h-full bg-[#0b141a] relative overflow-hidden bg-grainy">
       {/* --- WHATSAPP STYLE HEADER --- */}
       <header className="flex items-center p-3 border-b border-white/10 bg-[#111b21] backdrop-blur-xl sticky top-0 z-30 shadow-md">
            <Button variant="ghost" size="icon" className="mr-1 text-slate-400 h-9 w-9 rounded-full" onClick={() => router.push('/student/messages')}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
              <Avatar className="h-10 w-10 border border-white/10 shadow-lg">
                  <AvatarImage src={otherParticipant?.profilePictureURL} className="object-cover" />
                  <AvatarFallback className="bg-[#2a3942] text-slate-400 font-bold">{otherParticipant?.fullName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                  <h2 className="font-bold text-sm text-white truncate leading-tight">{otherParticipant?.fullName}</h2>
                  <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-0.5 uppercase tracking-widest">
                      {otherParticipant?.isOnline ? (
                        <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>En ligne</>
                      ) : (
                        <span className="text-slate-500">Ndara Afrique</span>
                      )}
                  </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-slate-400 h-9 w-9 rounded-full"><MoreVertical className="h-5 w-5" /></Button>
        </header>

        {/* --- MESSAGES AREA --- */}
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-3 max-w-3xl mx-auto flex flex-col">
                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    const date = (msg.createdAt as any)?.toDate?.();
                    
                    return (
                        <div key={msg.id} className={cn(
                            "flex flex-col animate-in fade-in slide-in-from-bottom-1 duration-300",
                            isMe ? "items-end" : "items-start"
                        )}>
                            <div className={cn(
                                "max-w-[85%] px-3 py-2 rounded-xl text-[14px] leading-relaxed shadow-lg relative",
                                isMe 
                                    ? "bg-[#CC7722] text-white rounded-tr-none" 
                                    : "bg-[#202c33] text-slate-200 rounded-tl-none border border-white/5"
                            )}>
                                {msg.text}
                                <div className={cn(
                                  "text-[9px] mt-1 flex items-center justify-end gap-1 opacity-60 font-medium",
                                  isMe ? "text-white" : "text-slate-400"
                                )}>
                                  {date ? format(date, 'HH:mm', { locale: fr }) : '...'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>

        {/* --- INPUT BAR --- */}
        <div className="p-3 bg-[#111b21] border-t border-white/5 safe-area-pb">
            <form onSubmit={handleSend} className="flex items-center gap-2 max-w-3xl mx-auto">
                <div className="flex-1">
                  <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Écrire un message..."
                      className="w-full h-11 rounded-full bg-[#2a3942] border-none text-white placeholder:text-slate-500 text-[14px] pl-5 focus-visible:ring-0 shadow-inner"
                  />
                </div>
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!newMessage.trim() || isSending} 
                  className="h-11 w-11 rounded-full bg-[#CC7722] hover:bg-[#CC7722]/90 shadow-xl shrink-0 transition-transform active:scale-90"
                >
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 text-white" />}
                </Button>
            </form>
        </div>
    </div>
  );
}
