"use client";

/**
 * @fileOverview Client de chat pour le Tuteur MATHIAS - Redesign WhatsApp Android.
 * Gère l'historique et l'interactivité en temps réel avec une esthétique familière.
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { mathiasTutor } from "@/ai/flows/mathias-tutor-flow";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Bot, 
    Send, 
    Loader2, 
    RefreshCw, 
    ArrowLeft, 
    MoreVertical, 
    Check,
    CheckCheck, 
    Smile, 
    Paperclip, 
    Camera, 
    Mic, 
    Phone, 
    Video, 
    Sparkles 
} from "lucide-react";
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
    serverTimestamp,
    onSnapshot
} from "firebase/firestore";
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AiTutorMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: any;
  error?: boolean;
}

interface AiTutorClientProps {
    initialQuery?: string | null;
    initialContext?: string | null;
}

export function AiTutorClient({ initialQuery, initialContext }: AiTutorClientProps) {
  const { user } = useRole();
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
  const [hasError, setHasError] = useState(false);

  const initialGreeting = useMemo((): AiTutorMessage => ({ 
    id: 'initial-greeting', 
    sender: "ai", 
    text: "Bara ala ! Je suis MATHIAS, votre tuteur personnel. Je connais parfaitement nos formations et je suis là pour répondre à vos questions. Comment puis-je vous aider ?", 
    timestamp: new Date(),
    error: false
  }), []);

  const suggestions = [
    "📊 Explique-moi le levier",
    "💰 Comment calculer les profits ?",
    "📚 Résumer la leçon 3"
  ];

  useEffect(() => {
    if (!user) return;

    const chatCollectionRef = collection(db, `users/${user.uid}/chatHistory`);
    const q = query(chatCollectionRef, orderBy("timestamp", "desc"), limit(20));

    const unsubscribe = onSnapshot(q, (snap) => {
        const newMessages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AiTutorMessage));
        setMessages(newMessages);
        if (snap.docs.length > 0) {
            setLastVisible(snap.docs[snap.docs.length - 1]);
        }
        setIsHistoryLoading(false);
        
        setTimeout(() => {
            if (scrollAreaRef.current) {
                const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
                if (viewport) viewport.scrollTop = viewport.scrollHeight;
            }
        }, 100);
    }, (error) => {
        console.error("Firestore Listen Error:", error);
        setIsHistoryLoading(false);
    });

    return () => unsubscribe();
  }, [user, db]);

  const loadMoreMessages = async () => {
    if (!user || !lastVisible || isFetchingMore) return;
    setIsFetchingMore(true);
    
    try {
        const chatCollectionRef = collection(db, `users/${user.uid}/chatHistory`);
        const q = query(chatCollectionRef, orderBy("timestamp", "desc"), startAfter(lastVisible), limit(20));
        const snap = await getDocs(q);
        
        const moreMessages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AiTutorMessage));
        setHasMore(moreMessages.length === 20);
        if (snap.docs.length > 0) {
            setLastVisible(snap.docs[snap.docs.length - 1]);
            setMessages(prev => [...prev, ...moreMessages]);
        }
    } catch (err) {
        console.error("Load more error:", err);
    } finally {
        setIsFetchingMore(false);
    }
  };

  const displayedMessages = useMemo(() => {
    const sorted = [...messages].sort((a, b) => {
        const timeA = (a.timestamp as any)?.toDate ? (a.timestamp as any).toDate().getTime() : new Date(a.timestamp || 0).getTime();
        const timeB = (b.timestamp as any)?.toDate ? (b.timestamp as any).toDate().getTime() : new Date(b.timestamp || 0).getTime();
        return timeA - timeB;
    });
    
    if (messages.length === 0 && !isHistoryLoading) return [initialGreeting];
    return sorted;
  }, [messages, isHistoryLoading, initialGreeting]);

  useEffect(() => {
    if (initialQuery) setInput(initialQuery);
  }, [initialQuery]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const messageToSend = customText || input.trim();
    if (!messageToSend || isAiResponding || !user) return;

    setInput("");
    setIsAiResponding(true);
    setHasError(false);

    try {
      // 1. Enregistrer le message de l'utilisateur immédiatement
      const batch = writeBatch(db);
      const userMsgRef = doc(collection(db, `users/${user.uid}/chatHistory`));
      batch.set(userMsgRef, { sender: "user", text: messageToSend, timestamp: serverTimestamp() });
      await batch.commit();

      // 2. Appeler Mathias
      const result = await mathiasTutor({ query: messageToSend, courseContext: initialContext || undefined });
      
      // 3. Enregistrer la réponse de Mathias
      const aiMsgRef = doc(collection(db, `users/${user.uid}/chatHistory`));
      await setDoc(aiMsgRef, { 
        sender: "ai", 
        text: result.response, 
        timestamp: serverTimestamp(),
        error: result.isError 
      });

      if (result.isError) {
          setHasError(true);
      }
    } catch (error: any) {
      console.error("Tutor communication error:", error);
      setHasError(true);
      // Fallback message en cas d'erreur de communication serveur
      const aiMsgRef = doc(collection(db, `users/${user.uid}/chatHistory`));
      await setDoc(aiMsgRef, { 
        sender: "ai", 
        text: "Bara ala ! Je n'ai pas pu vous répondre car mon cerveau est temporairement déconnecté. Vérifiez votre clé API Gemini sur Vercel.", 
        timestamp: serverTimestamp(),
        error: true 
      }).catch(console.error);
    } finally {
      setIsAiResponding(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a] relative overflow-hidden">
      {/* WhatsApp Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />

      <header className="flex items-center p-2 border-b border-white/5 bg-[#111b21] z-30 shadow-md">
        <Button variant="ghost" size="icon" className="mr-0 text-slate-300 h-10 w-8 rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2 flex-1 overflow-hidden">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#10b981] to-teal-600 flex items-center justify-center text-white font-black text-lg border-2 border-white/10">
                <Bot className="h-6 w-6" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10b981] rounded-full border-2 border-[#111b21] shadow-[0_0_10px_#10b981]"></span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <h2 className="font-bold text-sm text-white truncate leading-none uppercase tracking-widest">MATHIAS</h2>
            <p className="text-[#10b981] text-[10px] font-bold uppercase tracking-tighter mt-1">
              En ligne
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0">
            <Button variant="ghost" size="icon" className="text-slate-300 h-10 w-10"><Video className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="text-slate-300 h-10 w-10"><Phone className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="text-slate-400 h-10 w-10"><MoreVertical className="h-5 w-5" /></Button>
        </div>
      </header>

      <ScrollArea className="flex-1 z-10" ref={scrollAreaRef}>
        <div className="p-4 space-y-2 flex flex-col min-h-full">
          {hasMore && messages.length >= 20 && (
            <div className="text-center py-2">
                <Button variant="ghost" size="sm" onClick={loadMoreMessages} disabled={isFetchingMore} className="text-[10px] uppercase font-bold text-slate-500">
                    {isFetchingMore ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <RefreshCw className="h-3 w-3 mr-2"/>}
                    Anciens messages
                </Button>
            </div>
          )}

          {displayedMessages.map((msg, idx) => {
            const isMe = msg.sender === "user";
            const date = (msg.timestamp as any)?.toDate ? (msg.timestamp as any).toDate() : new Date(msg.timestamp || 0);
            
            const prevMsg = displayedMessages[idx - 1];
            const prevDate = prevMsg ? ((prevMsg.timestamp as any)?.toDate ? (prevMsg.timestamp as any).toDate() : new Date(prevMsg.timestamp || 0)) : null;
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
                        : "bg-[#202c33] text-[#e9edef] rounded-tl-none",
                      msg.error && !isMe && "border border-red-500/30"
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
              </div>
            );
          })}

          {isAiResponding && (
            <div className="flex flex-col items-start mb-1">
              <div className="px-3 py-2 bg-[#202c33] text-[#e9edef] text-[14.5px] rounded-lg rounded-tl-none flex items-center gap-3 shadow-sm border border-white/5">
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                </div>
                <span className="italic opacity-70 text-xs">Mathias réfléchit...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Suggestions Chips */}
      <div className="z-20 px-4 mb-2">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {suggestions.map((suggestion, i) => (
                <button 
                    key={i}
                    onClick={() => handleSendMessage(undefined, suggestion.substring(3))}
                    className="flex-shrink-0 bg-[#1e293b]/80 backdrop-blur-sm border border-[#10b981]/30 text-[#10b981] text-[11px] font-bold px-4 py-2 rounded-full hover:bg-[#10b981]/20 transition whitespace-nowrap active:scale-95"
                >
                    {suggestion}
                </button>
            ))}
        </div>
      </div>

      {/* Input Bar (Floating Pill) */}
      <div className="p-2 bg-transparent safe-area-pb z-30 flex items-end gap-2">
        <div className="flex-1 bg-[#2a3942] rounded-[24px] flex items-center px-3 py-1 min-h-[48px] shadow-md border border-white/5">
            <Button variant="ghost" size="icon" className="text-[#8696a0] h-10 w-10 shrink-0 hover:bg-white/5 rounded-full"><Smile className="h-6 w-6" /></Button>
            <form onSubmit={handleSendMessage} className="flex-1 flex items-center">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Écrire un message..."
                    autoComplete="off"
                    disabled={isAiResponding}
                    className="flex-1 bg-transparent border-none text-white placeholder:text-[#8696a0] text-[16px] h-10 focus-visible:ring-0 shadow-none px-1"
                />
            </form>
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="text-[#8696a0] h-10 w-10 shrink-0 hover:bg-white/5 rounded-full"><Paperclip className="h-5 w-5 -rotate-45" /></Button>
                {!input.trim() && <Button variant="ghost" size="icon" className="text-[#8696a0] h-10 w-10 shrink-0 hover:bg-white/5 rounded-full"><Camera className="h-5 w-5" /></Button>}
            </div>
        </div>
        
        <Button 
          onClick={() => handleSendMessage()}
          disabled={isAiResponding} 
          className={cn(
              "h-12 w-12 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] shrink-0 flex items-center justify-center p-0 transition-all active:scale-90 border-none",
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
