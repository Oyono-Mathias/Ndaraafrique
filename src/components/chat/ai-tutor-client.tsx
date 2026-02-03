
"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { mathiasTutor, type MathiasTutorInput } from "@/ai/flows/mathias-tutor-flow";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2 } from "lucide-react";
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

  const initialGreeting = { 
    id: 'initial-greeting', 
    sender: "ai" as const, 
    text: "Bonjour ! Je suis MATHIAS, votre tuteur IA. Comment puis-je vous aider aujourd'hui ?", 
    timestamp: new Date() 
  };

  const fetchMessages = useCallback(async (loadMore = false) => {
    if (!user) {
        setIsHistoryLoading(false);
        return;
    }

    if (loadMore) {
        setIsFetchingMore(true);
    } else {
        setIsHistoryLoading(true);
    }
    
    const chatCollectionRef = collection(db, `users/${user.uid}/chatHistory`);
    let q = query(chatCollectionRef, orderBy("timestamp", "desc"), limit(25));
    
    if (loadMore && lastVisible) {
        q = query(chatCollectionRef, orderBy("timestamp", "desc"), startAfter(lastVisible), limit(25));
    }

    try {
        const querySnapshot = await getDocs(q);
        const newMessages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AiTutorMessage));
        
        setHasMore(newMessages.length === 25);
        if (querySnapshot.docs.length > 0) {
            setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        }

        if(loadMore) {
            setMessages(prev => [...prev, ...newMessages]);
        } else {
            setMessages(newMessages);
        }
    } catch (error) {
        console.error("Failed to fetch messages:", error);
    } finally {
        setIsHistoryLoading(false);
        setIsFetchingMore(false);
    }
  }, [user, db, lastVisible]);
  
  useEffect(() => {
    fetchMessages();
  }, [user, fetchMessages]);

  useEffect(() => {
    if (initialQuery) {
        setInput(initialQuery);
    }
  }, [initialQuery]);

  const displayedMessages = useMemo(() => {
    const sortedMessages = [...messages].sort((a, b) => {
        const timeA = (a.timestamp as any)?.toDate?.() || a.timestamp;
        const timeB = (b.timestamp as any)?.toDate?.() || b.timestamp;
        return timeA - timeB;
    });
    
    if (messages.length === 0 && !isHistoryLoading) {
        return [initialGreeting];
    }
    return sortedMessages;
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

    const userMessageText = input;
    setInput("");
    
    const tempUserMessage = { id: 'temp-user-' + Date.now(), sender: "user" as const, text: userMessageText, timestamp: new Date() };
    setMessages(prev => [...prev, tempUserMessage]);

    setIsAiResponding(true);

    try {
      const chatInput: MathiasTutorInput = { 
        query: userMessageText,
        courseContext: initialContext || undefined 
      };
      const result = await mathiasTutor(chatInput);
      
      const batch = writeBatch(db);
      
      const userMessageRef = doc(collection(db, `users/${user.uid}/chatHistory`));
      batch.set(userMessageRef, { sender: "user", text: userMessageText, timestamp: serverTimestamp() });
      
      const aiMessageRef = doc(collection(db, `users/${user.uid}/chatHistory`));
      batch.set(aiMessageRef, { sender: "ai", text: result.response, timestamp: serverTimestamp() });

      await batch.commit();

      const newAiMessage = { id: aiMessageRef.id, sender: "ai" as const, text: result.response, timestamp: new Date() };
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id).concat([{ id: userMessageRef.id, sender: 'user', text: userMessageText, timestamp: new Date()}, newAiMessage]));
      
    } catch (error) {
      console.error("AI chat error:", error);
      const errorMessagePayload = { sender: "ai" as const, text: "Désolé, une erreur est survenue. Veuillez réessayer.", timestamp: serverTimestamp() };
      const errorDocRef = await addDoc(collection(db, `users/${user.uid}/chatHistory`), errorMessagePayload);
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id).concat([{ id: errorDocRef.id, ...errorMessagePayload, timestamp: new Date()}]));
    } finally {
      setIsAiResponding(false);
    }
  };

  const isLoading = isUserLoading || isHistoryLoading;

  return (
    <div className="flex flex-col h-full chat-background dark:bg-[#0b141a]">
      <header className="flex items-center p-3 border-b bg-slate-100 dark:bg-[#202c33] sticky top-0 z-10 dark:border-slate-700/80">
        <div className="relative ai-avatar-container">
          <Avatar className="h-10 w-10 ai-avatar z-10 relative border-2 border-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-6 w-6" /></AvatarFallback>
          </Avatar>
        </div>
        <div className="ml-3">
          <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 uppercase tracking-wide">MATHIAS</h2>
          <p className="text-xs text-green-500 font-semibold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            En ligne pour vous aider
          </p>
        </div>
      </header>

      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="space-y-1 p-4 sm:p-6">
          {isLoading && (
            <div className="flex justify-center items-center h-full pt-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
           {!isLoading && hasMore && (
              <div className="text-center mb-4">
                  <Button variant="outline" size="sm" onClick={() => fetchMessages(true)} disabled={isFetchingMore} className="rounded-full text-xs h-8">
                      {isFetchingMore ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : null}
                      Charger l'historique
                  </Button>
              </div>
            )}
          {!isLoading && displayedMessages.map((message, index) => (
            <div
              key={message.id || `msg-${index}`}
              className={cn(
                "flex items-end gap-2 max-w-[85%]",
                message.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed shadow-sm relative mb-1",
                  message.sender === "user"
                    ? "bg-primary text-white rounded-br-none"
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700"
                )}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                 <span className={cn(
                     "text-[9px] opacity-60 float-right mt-1 ml-2",
                     message.sender === "user" ? "text-white/80" : "text-slate-500"
                 )}>
                    {message.timestamp ? new Date((message.timestamp as any)?.toDate?.() || message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>
          ))}
          {isAiResponding && (
            <div className="flex items-end gap-2 max-w-[85%] mr-auto">
              <div className="rounded-2xl px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center text-sm text-muted-foreground shadow-sm rounded-bl-none">
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
                MATHIAS réfléchit...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-slate-100 dark:bg-[#202c33] border-slate-200 dark:border-slate-700/50">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
            <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "Initialisation..." : "Écrivez votre message ici..."}
            disabled={isLoading || isAiResponding}
            className="flex-1 h-12 rounded-xl bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus-visible:ring-primary text-base shadow-inner"
            />
            <Button type="submit" size="icon" disabled={isLoading || isAiResponding || !input.trim()} className="shrink-0 h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95">
                {isAiResponding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                <span className="sr-only">Envoyer</span>
            </Button>
        </form>
      </div>
    </div>
  );
}
