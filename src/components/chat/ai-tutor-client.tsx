"use client";

/**
 * @fileOverview Client de chat pour le Tuteur MATHIAS.
 * Gère l'historique et l'interactivité en temps réel.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { mathiasTutor } from "@/ai/flows/mathias-tutor-flow";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, RefreshCw, ArrowLeft, MoreVertical, CheckCheck, Smile, Paperclip, Camera, Mic, Phone, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/context/RoleContext";
import { useRouter } from "next/navigation";
import { 
    collection, 
    query, 
    orderBy, 
    getFirestore, 
    limit, 
    startAfter, 
    QueryDocumentSnapshot, 
    DocumentData, 
    getDocs, 
    doc,
    writeBatch,
    serverTimestamp
} from "firebase/firestore";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AiTutorMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: any;
}

interface AiTutorClientProps {
    initialQuery?: string | null;
    initialContext?: string | null;
}

export function AiTutorClient({ initialQuery, initialContext }: AiTutorClientProps) {
  const { user, isUserLoading } = useRole();
  const db = getFirestore();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isAiResponding, setIsAiResponding] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<AiTutorMessage[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const initialGreeting = useMemo(() => ({ 
    id: 'initial-greeting', 
    sender: "ai" as const, 
    text: "Bara ala ! Je suis MATHIAS, votre tuteur personnel. Je connais parfaitement nos formations et je suis là pour répondre à vos questions. Comment puis-je vous aider ?", 
    timestamp: new Date() 
  }), []);

  const fetchMessages = useCallback(async (loadMore = false) => {
    if (!user) {
        setIsHistoryLoading(false);
        return;
    }

    if (loadMore) setIsFetchingMore(true);
    else setIsHistoryLoading(true);
    
    try {
        const chatCollectionRef = collection(db, `users/${user.uid}/chatHistory`);
        let q = query(chatCollectionRef, orderBy("timestamp", "desc"), limit(20));
        
        if (loadMore && lastVisible) {
            q = query(chatCollectionRef, orderBy("timestamp", "desc"), startAfter(lastVisible), limit(20));
        }

        const querySnapshot = await getDocs(q);
        const newMessages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AiTutorMessage));
        
        setHasMore(newMessages.length === 20);
        if (querySnapshot.docs.length > 0) {
            setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        }

        if(loadMore) setMessages(prev => [...prev, ...newMessages]);
        else setMessages(newMessages);
    } catch (error) {
        console.error("Failed to fetch history:", error);
    } finally {
        setIsHistoryLoading(false);
        setIsFetchingMore(false);
    }
  }, [user, db, lastVisible]);
  
  useEffect(() => {
    fetchMessages();
  }, [user, fetchMessages]);

  useEffect(() => {
    if (initialQuery) setInput(initialQuery);
  }, [initialQuery]);

  const displayedMessages = useMemo(() => {
    const sorted = [...messages].sort((a, b) => {
        const timeA = (a.timestamp as any)?.toDate?.()?.getTime() || new Date(a.timestamp).getTime();
        const timeB = (b.timestamp as any)?.toDate?.()?.getTime() || new Date(b.timestamp).getTime();
        return timeA - timeB;
    });
    
    if (messages.length === 0 && !isHistoryLoading) return [initialGreeting];
    return sorted;
  }, [messages, isHistoryLoading, initialGreeting]);


  useEffect(() => {
    if (!isFetchingMore && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [displayedMessages, isAiResponding, isFetchingMore]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isAiResponding || !user) return;

    const userText = input;
    setInput("");
    
    const tempUserMsg = { id: 'temp-' + Date.now(), sender: "user" as const, text: userText, timestamp: new Date() };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsAiResponding(true);

    try {
      const result = await mathiasTutor({ query: userText, courseContext: initialContext || undefined });
      
      const batch = writeBatch(db);
      const userRef = doc(collection(db, `users/${user.uid}/chatHistory`));
      const aiRef = doc(collection(db, `users/${user.uid}/chatHistory`));
      
      batch.set(userRef, { sender: "user", text: userText, timestamp: serverTimestamp() });
      batch.set(aiRef, { sender: "ai", text: result.response, timestamp: serverTimestamp() });
      await batch.commit();

      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id).concat([
          { id: userRef.id, sender: 'user', text: userText, timestamp: new Date() },
          { id: aiRef.id, sender: 'ai', text: result.response, timestamp: new Date() }
      ]));
    } catch (error) {
      console.error("Action error:", error);
      setMessages(prev => [...prev, { id: 'err-'+Date.now(), sender: 'ai', text: "Oups, Mathias est un peu fatigué. Réessayez dans un instant !", timestamp: new Date() }]);
    } finally {
      setIsAiResponding(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('https://i.postimg.cc/9FmXdBZ0/whatsapp-bg.png')] z-0 bg-repeat" />

      {/* --- HEADER --- */}
      <header className="flex items-center p-2 border-b border-white/5 bg-[#111b21] z-30 shadow-md">
        <Button variant="ghost" size="icon" className="mr-0 text-slate-300 h-10 w-8 rounded-full" onClick={() => router.push('/student/dashboard')}>
            <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2 flex-1 overflow-hidden">
          <Avatar className="h-9 w-9 border border-white/10">
              <AvatarFallback className="bg-[#2a3942] text-primary font-black"><Bot className="h-6 w-6" /></AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <h2 className="font-bold text-sm text-white truncate leading-none uppercase tracking-widest">MATHIAS</h2>
            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1.5 uppercase tracking-tighter mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Tuteur Interactif
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0">
            <Button variant="ghost" size="icon" className="text-slate-300 h-10 w-10"><Video className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="text-slate-300 h-10 w-10"><Phone className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="text-slate-300 h-10 w-10"><MoreVertical className="h-5 w-5" /></Button>
        </div>
      </header>

      <ScrollArea className="flex-1 z-10" ref={scrollAreaRef}>
        <div className="p-4 space-y-2 flex flex-col min-h-full">
          <div className="self-center my-4">
              <span className="bg-[#182229] text-[11px] font-medium text-[#8696a0] px-3 py-1 rounded-lg shadow-sm">
                  Aujourd'hui
              </span>
          </div>

          {(isUserLoading || isHistoryLoading) && (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          )}
          
          {!isHistoryLoading && hasMore && (
            <div className="text-center py-4">
                <Button variant="ghost" size="sm" onClick={() => fetchMessages(true)} disabled={isFetchingMore} className="text-[10px] uppercase font-bold text-slate-500">
                    {isFetchingMore ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <RefreshCw className="h-3 w-3 mr-2"/>}
                    Charger l'historique
                </Button>
            </div>
          )}

          {displayedMessages.map((msg) => {
            const isMe = msg.sender === "user";
            const date = msg.timestamp ? new Date((msg.timestamp as any)?.toDate?.() || msg.timestamp) : new Date();
            
            return (
              <div 
                key={msg.id} 
                className={cn(
                  "flex flex-col mb-1",
                  isMe ? "items-end" : "items-start"
                )}
              >
                <div className={cn(
                    "max-w-[85%] px-2.5 py-1.5 rounded-lg text-[14.5px] leading-relaxed shadow-sm relative min-w-[60px]",
                    isMe 
                      ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none" 
                      : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                )}>
                  <p className="whitespace-pre-wrap pr-10">{msg.text}</p>
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

          {isAiResponding && (
            <div className="flex flex-col items-start mb-1">
              <div className="px-3 py-2 bg-[#202c33] text-[#e9edef] text-[14.5px] rounded-lg rounded-tl-none flex items-center gap-3 shadow-sm border border-white/5">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                <span className="italic opacity-70">réfléchit...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 bg-transparent safe-area-pb z-20 flex items-end gap-2">
        <div className="flex-1 bg-[#2a3942] rounded-[24px] flex items-center px-3 py-1 min-h-[48px] shadow-md">
            <Button variant="ghost" size="icon" className="text-[#8696a0] h-10 w-10 shrink-0"><Smile className="h-6 w-6" /></Button>
            <form onSubmit={handleSendMessage} className="flex-1 flex items-center">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Message"
                    autoComplete="off"
                    disabled={isAiResponding}
                    className="flex-1 bg-transparent border-none text-white placeholder:text-[#8696a0] text-[16px] h-10 focus-visible:ring-0 shadow-none px-1"
                />
            </form>
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="text-[#8696a0] h-10 w-10 shrink-0"><Paperclip className="h-5 w-5 -rotate-45" /></Button>
                {!input.trim() && <Button variant="ghost" size="icon" className="text-[#8696a0] h-10 w-10 shrink-0"><Camera className="h-5 w-5" /></Button>}
            </div>
        </div>
        
        <Button 
          onClick={handleSendMessage}
          disabled={isAiResponding} 
          className={cn(
              "h-12 w-12 rounded-full shadow-lg shrink-0 flex items-center justify-center p-0 transition-all active:scale-90",
              "bg-[#00a884] hover:bg-[#00a884]/90"
          )}
        >
            {input.trim() ? (
                isAiResponding ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Send className="h-5 w-5 text-white fill-white translate-x-0.5" />
            ) : (
                <Mic className="h-5 w-5 text-white" />
            )}
        </Button>
      </div>
    </div>
  );
}