"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { mathiasTutor } from "@/ai/flows/mathias-tutor-flow";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, RefreshCw, Smartphone, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/context/RoleContext";
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    query, 
    orderBy, 
    getFirestore, 
    limit, 
    startAfter, 
    QueryDocumentSnapshot, 
    DocumentData, 
    getDocs, 
    doc,
    writeBatch
} from "firebase/firestore";
import { format, isToday } from 'date-fns';
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
    <div className="flex flex-col h-full bg-[#0b141a] relative overflow-hidden bg-grainy">
      {/* --- WHATSAPP STYLE HEADER --- */}
      <header className="flex items-center p-3 border-b border-white/10 bg-[#111b21] backdrop-blur-xl sticky top-0 z-30 shadow-md">
        <div className="relative flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1 bg-[#CC7722] rounded-full blur opacity-20 animate-pulse"></div>
            <Avatar className="h-10 w-10 border-2 border-[#CC7722]/50 z-10 relative">
                <AvatarFallback className="bg-[#111b21] text-[#CC7722]"><Bot className="h-6 w-6" /></AvatarFallback>
            </Avatar>
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-sm text-white leading-tight">MATHIAS</h2>
            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              En ligne
            </p>
          </div>
        </div>
      </header>

      {/* --- CHAT AREA --- */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-4 max-w-3xl mx-auto flex flex-col">
          {(isUserLoading || isHistoryLoading) && (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#CC7722]" /></div>
          )}
          
          {!isHistoryLoading && hasMore && (
            <div className="text-center py-2">
                <Button variant="ghost" size="sm" onClick={() => fetchMessages(true)} disabled={isFetchingMore} className="text-[10px] uppercase font-black tracking-widest text-slate-500 hover:text-slate-300">
                    {isFetchingMore ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <RefreshCw className="h-3 w-3 mr-2"/>}
                    Voir les messages plus anciens
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
                  "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                  isMe ? "items-end" : "items-start"
                )}
              >
                <div className={cn(
                    "max-w-[85%] px-3 py-2 rounded-xl text-[14px] leading-relaxed shadow-lg relative",
                    isMe 
                      ? "bg-[#CC7722] text-white rounded-tr-none" 
                      : "bg-[#202c33] text-slate-200 rounded-tl-none border border-white/5"
                )}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <div className={cn(
                    "text-[9px] mt-1 flex items-center justify-end gap-1 opacity-60 font-medium",
                    isMe ? "text-white" : "text-slate-400"
                  )}>
                    {format(date, 'HH:mm', { locale: fr })}
                  </div>
                </div>
              </div>
            );
          })}

          {isAiResponding && (
            <div className="flex flex-col items-start animate-pulse">
              <div className="px-4 py-3 bg-[#202c33] border border-white/5 text-slate-400 text-sm rounded-xl rounded-tl-none flex items-center gap-3 shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin text-[#CC7722]" />
                Mathias écrit...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* --- WHATSAPP STYLE INPUT --- */}
      <div className="p-3 bg-[#111b21] border-t border-white/5 safe-area-pb">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez une question à Mathias..."
                  disabled={isAiResponding}
                  className="w-full h-11 rounded-full bg-[#2a3942] border-none text-white placeholder:text-slate-500 text-[14px] pl-5 pr-10 focus-visible:ring-0 shadow-inner"
              />
            </div>
            <Button 
              type="submit" 
              size="icon" 
              disabled={isAiResponding || !input.trim()} 
              className="h-11 w-11 rounded-full bg-[#CC7722] hover:bg-[#CC7722]/90 shadow-xl shrink-0 transition-transform active:scale-90"
            >
                <Send className="h-5 w-5 text-white" />
            </Button>
        </form>
      </div>
    </div>
  );
}
