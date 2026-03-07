'use client';

/**
 * @fileOverview Salon de discussion immersif (Style WhatsApp Android exact).
 * ✅ SÉCURITÉ : Gère le blocage silencieux (shadow block) par l'admin.
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
  updateDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, ArrowLeft, MoreVertical, Phone, Video, Check, CheckCheck, Paperclip, Smile, Camera, Mic, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, NdaraUser, Chat } from '@/lib/types';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export function ChatRoom({ chatId }: { chatId: string }) {
  const { user, currentUser } = useRole();
  const db = getFirestore();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherParticipant, setOtherParticipant] = useState<Partial<NdaraUser> | null>(null);
  const [chatData, setChatData] = useState<Chat | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!chatId || !user) return;

    const chatRef = doc(db, 'chats', chatId);
    const unsubChat = onSnapshot(chatRef, (snap) => {
        if (snap.exists()) {
            const data = { id: snap.id, ...snap.data() } as Chat;
            setChatData(data);
            const otherId = data.participants.find((p: string) => p !== user.uid);
            
            if (otherId && (!otherParticipant || otherParticipant.uid !== otherId)) {
                onSnapshot(doc(db, 'users', otherId), (uSnap) => {
                    if (uSnap.exists()) {
                        setOtherParticipant({ uid: uSnap.id, ...uSnap.data() } as NdaraUser);
                    }
                });
            }

            // Marquer comme lu uniquement si le chat n'est pas bloqué (ou si on est admin)
            if (data.unreadBy?.includes(user.uid) && (data.status !== 'blocked' || isAdmin)) {
                updateDoc(chatRef, { unreadBy: arrayRemove(user.uid) });
                
                const msgsQuery = query(
                    collection(db, `chats/${chatId}/messages`), 
                    where('senderId', '==', otherId),
                    where('status', '!=', 'read')
                );
                getDocs(msgsQuery).then(mSnap => {
                    if (!mSnap.empty) {
                        const batch = writeBatch(db);
                        mSnap.docs.forEach(d => batch.update(d.ref, { status: 'read' }));
                        batch.commit();
                    }
                });
            }
        }
    });

    return () => unsubChat();
  }, [chatId, user, db, otherParticipant, isAdmin]);

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

        const now = serverTimestamp();

        // LOGIQUE CEO : Si le chat est bloqué silensieusement, on enregistre le message 
        // mais on ne notifie pas le destinataire (unreadBy reste inchangé pour lui)
        const isBlocked = chatData?.status === 'blocked';

        batch.set(msgRef, {
            senderId: user.uid,
            text,
            createdAt: now,
            status: 'sent',
        });

        const updateData: any = {
            lastMessage: text,
            updatedAt: now,
            lastSenderId: user.uid,
        };

        if (!isBlocked) {
            updateData.unreadBy = arrayUnion(otherParticipant?.uid || '');
        }

        batch.update(chatRef, updateData);
        
        await batch.commit();
    } catch (err) {
        console.error("Failed to send message:", err);
    } finally {
        setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a] relative overflow-hidden">
       <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />

       <header className="flex items-center p-2 border-b border-white/5 bg-[#111b21] z-30 shadow-md">
            <Button 
                variant="ghost" 
                size="icon" 
                className="mr-0 text-slate-300 h-10 w-8 rounded-full" 
                onClick={() => router.back()}
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
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-white truncate leading-none">
                        {otherParticipant?.fullName || 'Chargement...'}
                    </h2>
                    {chatData?.status === 'blocked' && isAdmin && (
                        <ShieldAlert className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-500 font-medium mt-1 uppercase tracking-widest">
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

        {chatData?.status === 'blocked' && isAdmin && (
            <div className="bg-red-500/10 border-b border-red-500/20 p-2 text-center">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Cette conversation est bloquée silensieusement par l'admin.</p>
            </div>
        )}

        <ScrollArea className="flex-1 z-10" ref={scrollAreaRef}>
            <div className="p-4 space-y-2 flex flex-col min-h-full">
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.uid;
                    const date = (msg.createdAt as any)?.toDate ? (msg.createdAt as any).toDate() : new Date();
                    const isRead = msg.status === 'read';
                    
                    const prevMsg = messages[idx - 1];
                    const prevDate = prevMsg ? ((prevMsg.createdAt as any)?.toDate ? (prevMsg.createdAt as any).toDate() : new Date()) : null;
                    const showDateSeparator = !prevDate || !isSameDay(date, prevDate);

                    return (
                        <div key={msg.id} className="flex flex-col">
                            {showDateSeparator && (
                                <div className="self-center my-4">
                                    <span className="bg-[#182229] text-[11px] font-medium text-[#8696a0] px-3 py-1 rounded-lg shadow-sm">
                                        {format(date, 'd MMMM yyyy', { locale: fr })}
                                    </span>
                                </div>
                            )}
                            <div className={cn(
                                "flex flex-col mb-1",
                                isMe ? "items-end" : "items-start"
                            )}>
                                <div className={cn(
                                    "max-w-[85%] px-2.5 py-1.5 rounded-lg text-[14.5px] leading-relaxed shadow-sm relative min-w-[60px]",
                                    isMe 
                                        ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none" 
                                        : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                                )}>
                                    <span className="pr-12 block whitespace-pre-wrap">{msg.text}</span>
                                    <div className={cn(
                                      "absolute bottom-1 right-1.5 flex items-center gap-1",
                                      isMe ? "text-[#e9edef]/60" : "text-[#8696a0]"
                                    )}>
                                      <span className="text-[10px]">{format(date, 'HH:mm', { locale: fr })}</span>
                                      {isMe && (
                                          isRead 
                                            ? <CheckCheck className="h-3 w-3 text-[#53bdeb]" /> 
                                            : <Check className="h-3 w-3" />
                                      )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>

        <div className="p-2 bg-transparent safe-area-pb z-20 flex items-end gap-2">
            <div className="flex-1 bg-[#2a3942] rounded-[24px] flex items-center px-3 py-1 min-h-[48px] shadow-md">
                <Button variant="ghost" size="icon" className="text-[#8696a0] h-10 w-10 shrink-0"><Smile className="h-6 w-6" /></Button>
                <form onSubmit={handleSend} className="flex-1 flex items-center">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Message"
                        autoComplete="off"
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
