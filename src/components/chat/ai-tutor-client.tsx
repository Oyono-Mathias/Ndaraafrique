"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { mathiasTutor } from "@/ai/flows/mathias-tutor-flow";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, RefreshCw, ArrowLeft, MoreVertical, CheckCheck } from "lucide-react";
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
    <div className="flex flex-col h-screen bg-[#0b141a] relative overflow-hidden bg-grainy">
      {/* Fond doodle WhatsApp discret */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://i.postimg.cc/9FmXdBZ0/whatsapp-bg.png')] z-0" />

      <header className="flex items-center p-3 border-b border-white/10 bg-[#111b21]/95 backdrop-blur-xl sticky top-0 z-30 shadow-md">
        <Button variant="ghost" size="icon" className="mr-1 text-slate-400 h-10 w-10 rounded-full" onClick={() => router.push('/student/dashboard')}>
            <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="relative flex items-center gap-3 flex-1">
          <div className="relative">
            <div className="absolute -inset-1 bg-[#CC7722] rounded-full blur opacity-20 animate-pulse"></div>
            <Avatar className="h-10 w-10 border-2 border-[#CC7722]/50 z-10 relative">
                <AvatarFallback className="bg-[#111b21] text-[#CC7722] font-black"><Bot className="h-6 w-6" /></AvatarFallback>
            </Avatar>
          </div>
          <div className="flex flex-col">
            <h2 className="font-black text-sm text-white leading-tight uppercase tracking-widest">MATHIAS</h2>
            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1.5 uppercase tracking-tighter mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Tuteur Interactif
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-slate-400 h-10 w-10 rounded-full"><MoreVertical className="h-5 w-5" /></Button>
      </header>

      <ScrollArea className="flex-1 z-10" ref={scrollAreaRef}>
        <div className="p-4 space-y-2 max-w-3xl mx-auto flex flex-col min-h-full">
          {(isUserLoading || isHistoryLoading) && (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#CC7722]" /></div>
          )}
          
          {!isHistoryLoading && hasMore && (
            <div className="text-center py-4">
                <Button variant="ghost" size="sm" onClick={() => fetchMessages(true)} disabled={isFetchingMore} className="text-[9px] uppercase font-black tracking-widest text-slate-500 bg-[#182229]/50 px-4 rounded-full border border-white/5">
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
                  "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                  isMe ? "items-end" : "items-start"
                )}
              >
                <div className={cn(
                    "max-w-[85%] px-3 py-1.5 rounded-xl text-[15px] leading-relaxed shadow-md relative",
                    isMe 
                      ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none" 
                      : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                )}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <div className={cn(
                    "text-[9px] mt-1 flex items-center justify-end gap-1 font-black opacity-60",
                    isMe ? "text-[#e9edef]/70" : "text-slate-400"
                  )}>
                    {format(date, 'HH:mm', { locale: fr })}
                    {isMe && <CheckCheck className="h-3.5 w-3.5 ml-1 text-[#53bdeb]" />}
                  </div>
                </div>
              </div>
            );
          })}

          {isAiResponding && (
            <div className="flex flex-col items-start">
              <div className="px-4 py-2 bg-[#202c33] text-[#e9edef] text-[15px] rounded-xl rounded-tl-none flex items-center gap-3 shadow-md border border-white/5">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                <span className="italic opacity-70">En train d'écrire...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 bg-[#111b21] border-t border-white/5 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-3xl mx-auto">
            <div className="flex-1 bg-[#2a3942] rounded-full flex items-center px-4 h-12 shadow-inner">
              <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message"
                  disabled={isAiResponding}
                  className="flex-1 bg-transparent border-none text-white placeholder:text-slate-500 text-[16px] p-0 h-full focus-visible:ring-0 shadow-none"
              />
            </div>
            <Button 
              type="submit" 
              size="icon" 
              disabled={isAiResponding || !input.trim()} 
              className={cn(
                  "h-12 w-12 rounded-full shadow-2xl shrink-0 transition-all active:scale-90",
                  input.trim() ? "bg-[#00a884] hover:bg-[#00a884]/90" : "bg-slate-800 text-slate-500"
              )}
            >
                <Send className="h-5 w-5 text-white fill-white" />
            </Button>
        </form>
      </div>
    </div>
  );
}
