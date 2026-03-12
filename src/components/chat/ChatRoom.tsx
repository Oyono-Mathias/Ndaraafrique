'use client';

/**
 * @fileOverview Salle de discussion immersive (Style WhatsApp Android exact).
 * ✅ DESIGN : Bulles dégradées, Header immersif, barre de saisie flottante.
 * ✅ SÉCURITÉ : Gère le blocage silencieux (shadow block) par l'admin.
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
  updateDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    Loader2, 
    Send, 
    ArrowLeft, 
    MoreVertical, 
    Phone, 
    Video, 
    Check, 
    CheckCheck, 
    Paperclip, 
    Smile, 
    Camera, 
    Mic, 
    ShieldAlert,
    ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, NdaraUser, Chat } from '@/lib/types';
import { format, isSameDay, isToday } from 'date-fns';
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
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === 'admin';

  // 1. Écouteur des métadonnées du chat et du second participant
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

  // 2. Écouteur des messages en temps réel
  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(db, `chats/${chatId}/messages`), orderBy('createdAt', 'asc'));
    
    const unsubMsgs = onSnapshot(q, (snap) => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        setMessages(msgs);
        scrollToBottom();
    });
    
    return () => unsubMsgs();
  }, [chatId, db]);

  const scrollToBottom = () => {
    setTimeout(() => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }
    }, 100);
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const text = customText || newMessage.trim();
    if (!text || !user || isSending) return;
    
    setNewMessage("");
    setIsSending(true);
    
    try {
        const batch = writeBatch(db);
        const msgRef = doc(collection(db, `chats/${chatId}/messages`));
        const chatRef = doc(db, 'chats', chatId);

        const now = serverTimestamp();
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
        scrollToBottom();
    } catch (err) {
        console.error("Failed to send message:", err);
    } finally {
        setIsSending(false);
    }
  };

  const onScroll = () => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            const threshold = 300;
            const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < threshold;
            setShowScrollBtn(!isNearBottom);
        }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a] relative overflow-hidden font-sans">
       {/* WhatsApp Style Grain Texture */}
       <div className="grain-overlay opacity-[0.03]" />

       {/* --- CHAT HEADER --- */}
       <header className="fixed top-0 w-full z-50 bg-[#1e293b]/95 backdrop-blur-md border-b border-white/5 safe-area-pt shadow-md">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition text-gray-400 active:scale-90">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="relative flex-shrink-0">
                        <Avatar className="h-11 w-11 border-2 border-primary/30 shadow-xl">
                            <AvatarImage src={otherParticipant?.profilePictureURL} className="object-cover" />
                            <AvatarFallback className="bg-[#2a3942] text-slate-400 font-bold uppercase">
                                {otherParticipant?.fullName?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        {otherParticipant?.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-[#1e293b] shadow-lg animate-pulse" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="font-black text-white text-base leading-tight truncate uppercase tracking-tight">
                                {otherParticipant?.fullName || 'Chargement...'}
                            </h1>
                            {chatData?.status === 'blocked' && isAdmin && (
                                <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                            )}
                        </div>
                        <p className={cn(
                            "text-[10px] font-bold uppercase tracking-widest transition-colors",
                            otherParticipant?.isOnline ? "text-primary" : "text-slate-500"
                        )}>
                            {otherParticipant?.isOnline ? 'En ligne' : 'Hors ligne'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-primary active:scale-90 transition-all">
                        <Video size={20} />
                    </button>
                    <button className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-primary active:scale-90 transition-all">
                        <Phone size={18} />
                    </button>
                    <button className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-slate-500 active:scale-90 transition-all">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>
        </header>

        {/* --- CHAT MESSAGES --- */}
        <ScrollArea className="flex-1 z-10" ref={scrollAreaRef} onScroll={onScroll}>
            <div className="p-4 pt-24 pb-32 space-y-2 flex flex-col min-h-full">
                
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
                                <div className="self-center my-6 sticky top-2 z-20">
                                    <span className="bg-[#1e293b]/80 backdrop-blur-md text-[10px] font-black text-slate-400 px-4 py-2 rounded-full border border-white/5 uppercase tracking-[0.2em] shadow-lg">
                                        {isToday(date) ? "Aujourd'hui" : format(date, 'd MMMM yyyy', { locale: fr })}
                                    </span>
                                </div>
                            )}
                            <div className={cn(
                                "flex flex-col mb-1 animate-in slide-in-from-bottom-2 duration-300",
                                isMe ? "items-end" : "items-start"
                            )}>
                                <div className={cn(
                                    "max-w-[85%] px-4 py-3 rounded-[1.5rem] text-[14.5px] leading-relaxed shadow-xl relative min-w-[80px] border border-white/5",
                                    isMe 
                                        ? "bg-gradient-to-br from-[#10b981] to-[#005c4b] text-white rounded-tr-none" 
                                        : "bg-[#1e293b] text-slate-200 rounded-tl-none"
                                )}>
                                    <span className="block whitespace-pre-wrap pb-2">{msg.text}</span>
                                    <div className={cn(
                                      "flex items-center justify-end gap-1.5",
                                      isMe ? "text-white/60" : "text-slate-500"
                                    )}>
                                      <span className="text-[9px] font-black font-mono">{format(date, 'HH:mm')}</span>
                                      {isMe && (
                                          isRead 
                                            ? <CheckCheck className="h-3 w-3 text-emerald-300" /> 
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

        {/* --- FLOATING ACTION BAR --- */}
        <footer className="fixed bottom-0 w-full max-w-md bg-gradient-to-t from-[#0b141a] via-[#0b141a] to-transparent pt-6 pb-4 px-4 safe-area-pb z-40">
            
            {/* Quick Reply Chips */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4">
                <button 
                    onClick={() => handleSend(undefined, "Oui, je suis disponible")}
                    className="flex-shrink-0 bg-[#1e293b]/80 backdrop-blur-sm border border-primary/30 text-primary text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full hover:bg-primary/20 transition active:scale-95 shadow-xl"
                >
                    👍 Oui, disponible
                </button>
                <button 
                    onClick={() => handleSend(undefined, "Merci beaucoup !")}
                    className="flex-shrink-0 bg-[#1e293b]/80 backdrop-blur-sm border border-primary/30 text-primary text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full hover:bg-primary/20 transition active:scale-95 shadow-xl"
                >
                    🙏 Merci !
                </button>
                <button 
                    onClick={() => handleSend(undefined, "Je regarde ça tout de suite")}
                    className="flex-shrink-0 bg-[#1e293b]/80 backdrop-blur-sm border border-primary/30 text-primary text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full hover:bg-primary/20 transition active:scale-95 shadow-xl"
                >
                    👀 Je regarde
                </button>
            </div>

            {/* Input Field Area */}
            <div className="flex items-end gap-2">
                <button className="w-12 h-12 rounded-full bg-[#1e293b] flex items-center justify-center text-slate-400 hover:text-primary transition active:scale-90 border border-white/5 shadow-xl">
                    <Paperclip size={20} className="-rotate-45" />
                </button>

                <div className="flex-1 bg-[#1e293b] rounded-full flex items-center px-2 py-1 border border-white/5 shadow-2xl transition-all focus-within:border-primary/30">
                    <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-primary transition active:scale-90">
                        <Smile size={22} />
                    </button>
                    <form onSubmit={handleSend} className="flex-1">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Écrire un message..."
                            autoComplete="off"
                            className="bg-transparent border-none text-white placeholder:text-slate-600 text-base h-12 focus-visible:ring-0 shadow-none px-2 font-medium"
                        />
                    </form>
                    <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-primary transition active:scale-90">
                        <Camera size={22} />
                    </button>
                </div>
                
                <Button 
                    onClick={() => handleSend()}
                    disabled={isSending}
                    className={cn(
                        "h-14 w-14 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] shrink-0 flex items-center justify-center p-0 transition-all active:scale-90 border-none",
                        "bg-primary hover:bg-primary/90 text-slate-950"
                    )}
                >
                    {newMessage.trim() ? (
                        isSending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send size={24} className="ml-1" />
                    ) : (
                        <Mic size={24} />
                    )}
                </Button>
            </div>
        </footer>

        {/* Scroll to Bottom FAB */}
        <button 
            onClick={scrollToBottom}
            className={cn(
                "fixed bottom-28 right-6 w-12 h-12 bg-[#1e293b] rounded-full flex items-center justify-center text-primary shadow-2xl border border-white/5 transition-all z-30 active:scale-90",
                showScrollBtn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
            )}
        >
            <ArrowDown size={20} />
        </button>
    </div>
  );
}
