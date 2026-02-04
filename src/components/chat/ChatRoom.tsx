
'use client';

/**
 * @fileOverview Salon de discussion immersif (Android WhatsApp Style).
 * Design sans distracteurs pour une concentration totale sur l'échange.
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
import { Loader2, Send, ArrowLeft, MoreVertical, Phone, Video } from 'lucide-react';
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

  // 1. Infos du correspondant et marquage comme lu
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

  // 2. Écoute des messages
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
       {/* --- HEADER WHATSAPP STYLE --- */}
       <header className="flex items-center p-2.5 border-b border-white/5 bg-[#111b21]/95 backdrop-blur-xl sticky top-0 z-30 shadow-2xl">
            <Button variant="ghost" size="icon" className="mr-1 text-slate-400 h-10 w-10 rounded-full active:bg-white/10" onClick={() => router.push('/student/messages')}>
                <ArrowLeft className="h-6 w-6" />
            </Button>
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
              <Avatar className="h-10 w-10 border border-white/5 shadow-lg">
                  <AvatarImage src={otherParticipant?.profilePictureURL} className="object-cover" />
                  <AvatarFallback className="bg-[#2a3942] text-slate-400 font-bold">{otherParticipant?.fullName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                  <h2 className="font-bold text-sm text-white truncate leading-none">{otherParticipant?.fullName}</h2>
                  <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-1">
                      {otherParticipant?.isOnline ? (
                        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>En ligne</span>
                      ) : (
                        <span className="text-slate-500 tracking-tighter">Ndara Afrique</span>
                      )}
                  </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-slate-400 h-10 w-10 rounded-full opacity-40 cursor-not-allowed"><Video className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-400 h-10 w-10 rounded-full opacity-40 cursor-not-allowed"><Phone className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-400 h-10 w-10 rounded-full"><MoreVertical className="h-5 w-5" /></Button>
            </div>
        </header>

        {/* --- CONVERSATION ZONE --- */}
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-2 max-w-3xl mx-auto flex flex-col">
                <div className="self-center my-4">
                    <span className="bg-[#182229] text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-3 py-1 rounded-md shadow-sm border border-white/5">
                        Chiffrement de bout en bout
                    </span>
                </div>

                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    const date = (msg.createdAt as any)?.toDate?.();
                    
                    return (
                        <div key={msg.id} className={cn(
                            "flex flex-col animate-in fade-in slide-in-from-bottom-1 duration-300",
                            isMe ? "items-end" : "items-start"
                        )}>
                            <div className={cn(
                                "max-w-[85%] px-3 py-1.5 rounded-2xl text-[15px] leading-relaxed shadow-xl relative",
                                isMe 
                                    ? "bg-[#CC7722] text-white rounded-tr-none" 
                                    : "bg-[#202c33] text-slate-200 rounded-tl-none border border-white/5"
                            )}>
                                {msg.text}
                                <div className={cn(
                                  "text-[9px] mt-1.5 flex items-center justify-end gap-1 font-black uppercase tracking-tighter opacity-60",
                                  isMe ? "text-white" : "text-slate-500"
                                )}>
                                  {date ? format(date, 'HH:mm', { locale: fr }) : '...'}
                                  {isMe && (
                                      <svg viewBox="0 0 16 11" width="14" height="10" className="ml-1 text-blue-400" fill="currentColor">
                                          <path d="M11.05 1.05l-6.5 6.5-2.5-2.5-1.05 1.05 3.55 3.55 7.55-7.55-1.05-1.05zM15.05 1.05l-6.5 6.5-1.05-1.05 6.5-6.5 1.05 1.05z"/>
                                      </svg>
                                  )}
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
                <div className="flex-1 bg-[#2a3942] rounded-full flex items-center px-4 h-12 shadow-inner group focus-within:ring-1 focus-within:ring-[#CC7722]/30 transition-all">
                  <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Message"
                      className="flex-1 bg-transparent border-none text-white placeholder:text-slate-500 text-[16px] p-0 h-full focus-visible:ring-0 shadow-none"
                  />
                </div>
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!newMessage.trim() || isSending} 
                  className={cn(
                      "h-12 w-12 rounded-full shadow-2xl shrink-0 transition-all active:scale-90",
                      newMessage.trim() ? "bg-[#CC7722] hover:bg-[#CC7722]/90" : "bg-slate-800 text-slate-500"
                  )}
                >
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 text-white" />}
                </Button>
            </form>
        </div>
    </div>
  );
}
