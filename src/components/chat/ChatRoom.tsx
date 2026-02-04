'use client';

/**
 * @fileOverview Salon de discussion immersif (WhatsApp Android Style).
 * Gère l'affichage des messages en temps réel, l'envoi atomique et le scroll automatique.
 * Incorpore la logique de marquage comme "lu" (Product Engineer).
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
import { Loader2, Send, ArrowLeft, MoreVertical, Phone, Video, CheckCheck } from 'lucide-react';
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

  // 1. Récupération des infos du correspondant et gestion de l'état "lu"
  useEffect(() => {
    if (!chatId || !user) return;

    const chatRef = doc(db, 'chats', chatId);
    const unsubChat = onSnapshot(chatRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            const otherId = data.participants.find((p: string) => p !== user.uid);
            
            // Récupérer le profil de l'autre participant si pas encore chargé
            if (otherId && (!otherParticipant || otherParticipant.uid !== otherId)) {
                onSnapshot(doc(db, 'users', otherId), (uSnap) => {
                    if (uSnap.exists()) {
                        setOtherParticipant({ uid: uSnap.id, ...uSnap.data() } as NdaraUser);
                    }
                });
            }

            // LOGIQUE PRODUIT : Marquer comme lu pour l'utilisateur actuel
            if (data.unreadBy?.includes(user.uid)) {
                updateDoc(chatRef, { 
                    unreadBy: arrayRemove(user.uid) 
                }).catch(err => console.error("Error marking as read:", err));
            }
        }
    });

    return () => unsubChat();
  }, [chatId, user, db, otherParticipant]);

  // 2. Écoute des messages en temps réel
  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(db, `chats/${chatId}/messages`), orderBy('createdAt', 'asc'));
    
    const unsubMsgs = onSnapshot(q, (snap) => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        setMessages(msgs);
        
        // Auto-scroll vers le bas
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

  // 3. Envoi de message
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
       {/* Fond doodle WhatsApp discret */}
       <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://i.postimg.cc/9FmXdBZ0/whatsapp-bg.png')] z-0" />

       {/* --- HEADER --- */}
       <header className="flex items-center p-2.5 border-b border-white/5 bg-[#111b21]/95 backdrop-blur-xl sticky top-0 z-30 shadow-2xl">
            <Button 
                variant="ghost" 
                size="icon" 
                className="mr-1 text-slate-400 h-10 w-10 rounded-full active:bg-white/10" 
                onClick={() => router.push('/student/messages')}
            >
                <ArrowLeft className="h-6 w-6" />
            </Button>
            
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
              <Avatar className="h-10 w-10 border border-white/5 shadow-lg">
                  <AvatarImage src={otherParticipant?.profilePictureURL} className="object-cover" />
                  <AvatarFallback className="bg-[#2a3942] text-slate-400 font-bold">
                      {otherParticipant?.fullName?.charAt(0)}
                  </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                  <h2 className="font-bold text-sm text-white truncate leading-none">
                      {otherParticipant?.fullName || 'Chargement...'}
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-1">
                      {otherParticipant?.isOnline ? (
                        <span className="flex items-center gap-1.5 text-emerald-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            En ligne
                        </span>
                      ) : (
                        <span className="text-slate-500 tracking-tighter uppercase font-black">Hors ligne</span>
                      )}
                  </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-slate-400 h-10 w-10 rounded-full">
                    <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400 h-10 w-10 rounded-full">
                    <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400 h-10 w-10 rounded-full">
                    <MoreVertical className="h-5 w-5" />
                </Button>
            </div>
        </header>

        {/* --- MESSAGES --- */}
        <ScrollArea className="flex-1 z-10" ref={scrollAreaRef}>
            <div className="p-4 space-y-2 max-w-3xl mx-auto flex flex-col">
                <div className="self-center my-4">
                    <span className="bg-[#182229] text-[9px] font-black uppercase tracking-[0.2em] text-[#e9edef]/60 px-3 py-1.5 rounded-lg shadow-sm border border-white/5">
                        🛡️ Chiffrement de bout en bout
                    </span>
                </div>

                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    const date = (msg.createdAt as any)?.toDate?.() || new Date();
                    
                    return (
                        <div key={msg.id} className={cn(
                            "flex flex-col animate-in fade-in slide-in-from-bottom-1 duration-300",
                            isMe ? "items-end" : "items-start"
                        )}>
                            <div className={cn(
                                "max-w-[85%] px-3 py-1.5 rounded-xl text-[15px] leading-relaxed shadow-md relative",
                                isMe 
                                    ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none" 
                                    : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                            )}>
                                {msg.text}
                                <div className={cn(
                                  "text-[9px] mt-1 flex items-center justify-end gap-1 font-black uppercase tracking-tighter opacity-60",
                                  isMe ? "text-[#e9edef]/70" : "text-slate-400"
                                )}>
                                  {format(date, 'HH:mm', { locale: fr })}
                                  {isMe && <CheckCheck className="h-3.5 w-3.5 ml-1 text-[#53bdeb]" />}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>

        {/* --- INPUT --- */}
        <div className="p-3 bg-[#111b21] border-t border-white/5 safe-area-pb z-20">
            <form onSubmit={handleSend} className="flex items-center gap-2 max-w-3xl mx-auto">
                <div className="flex-1 bg-[#2a3942] rounded-full flex items-center px-4 h-12 shadow-inner">
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
                      newMessage.trim() ? "bg-[#00a884] hover:bg-[#00a884]/90" : "bg-slate-800 text-slate-500"
                  )}
                >
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 text-white fill-white" />}
                </Button>
            </form>
        </div>
    </div>
  );
}
