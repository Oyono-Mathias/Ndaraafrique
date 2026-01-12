
"use client";

import { useState, useRef, useEffect } from "react";
import { mathiasTutor, type MathiasTutorInput } from "@/ai/flows/mathias-tutor-flow";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/context/RoleContext";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, getFirestore } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp?: any;
};

export function AiTutorClient() {
  const { user, isUserLoading } = useRole();
  const db = getFirestore();
  const [input, setInput] = useState("");
  const [isAiResponding, setIsAiResponding] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const chatHistoryQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, `users/${user.uid}/chatHistory`), orderBy("timestamp", "asc"));
  }, [db, user]);

  const { data: messages, isLoading: isHistoryLoading } = useCollection<Message>(chatHistoryQuery);

  const initialGreeting = { id: 'initial-greeting', sender: "ai" as const, text: "Bonjour ! Je suis MATHIAS, votre tuteur IA. Comment puis-je vous aider aujourd'hui ?", timestamp: new Date() };

  const displayedMessages = useMemo(() => {
    const history = messages?.map(msg => ({
      ...msg,
      timestamp: msg.timestamp?.toDate() || new Date(),
    })) || [];
    // We only want to show the initial greeting if there's no history yet.
    return history.length > 0 ? history : [initialGreeting];
  }, [messages, initialGreeting]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [displayedMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAiResponding || !user) return;

    const userMessageText = input;
    setInput("");

    // 1. Save user message to Firestore
    const chatCollectionRef = collection(db, `users/${user.uid}/chatHistory`);
    const userMessagePayload = { sender: "user", text: userMessageText, timestamp: serverTimestamp() };
    
    addDoc(chatCollectionRef, userMessagePayload).catch(err => {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: chatCollectionRef.path,
            operation: 'create',
            requestResourceData: userMessagePayload,
        }));
    });

    setIsAiResponding(true);

    try {
      // 2. Call the AI flow
      const chatInput: MathiasTutorInput = { query: userMessageText };
      const result = await mathiasTutor(chatInput);
      
      // 3. Save AI message to Firestore
      const aiMessagePayload = { sender: "ai", text: result.response, timestamp: serverTimestamp() };
      addDoc(chatCollectionRef, aiMessagePayload).catch(err => {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: chatCollectionRef.path,
            operation: 'create',
            requestResourceData: aiMessagePayload,
        }));
      });

    } catch (error) {
      console.error("AI chat error:", error);
      const errorMessagePayload = { sender: "ai" as const, text: "Désolé, une erreur est survenue. Veuillez réessayer.", timestamp: serverTimestamp() };
      addDoc(chatCollectionRef, errorMessagePayload);
    } finally {
      setIsAiResponding(false);
    }
  };

  const isLoading = isUserLoading || isHistoryLoading;

  return (
    <div className="flex flex-col h-full chat-background dark:bg-[#0b141a]">
      <header className="flex items-center p-3 border-b bg-slate-100 dark:bg-[#202c33] sticky top-0 z-10 dark:border-slate-700/80">
        <div className="relative ai-avatar-container">
          <Avatar className="h-10 w-10 ai-avatar z-10 relative">
              <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-6 w-6" /></AvatarFallback>
          </Avatar>
        </div>
        <div className="ml-3">
          <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">MATHIAS</h2>
          <p className="text-xs text-green-500 font-semibold">En ligne</p>
        </div>
      </header>

      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="space-y-1 p-4 sm:p-6">
          {isLoading && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {!isLoading && displayedMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-end gap-2 max-w-[85%]",
                message.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-[14.5px] leading-snug shadow-sm relative",
                  message.sender === "user"
                    ? "chat-bubble-sent bg-[#dcf8c6] dark:bg-[#075e54] text-slate-800 dark:text-slate-100 rounded-br-none"
                    : "chat-bubble-received bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none"
                )}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                 <span className="text-[10px] text-slate-500 dark:text-slate-400 float-right mt-1 ml-2">
                    {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>
          ))}
          {isAiResponding && (
            <div className="flex items-end gap-2 max-w-[85%] mr-auto">
               <div className="relative ai-avatar-container self-end">
                    <Avatar className="h-8 w-8 ai-avatar z-10 relative">
                        <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                </div>
              <div className="rounded-lg px-4 py-3 bg-white dark:bg-slate-700 flex items-center text-sm text-muted-foreground shadow-sm chat-bubble-received rounded-bl-none">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                MATHIAS est en train d'écrire...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-2 border-t bg-[#f0f0f0] dark:bg-[#202c33] border-slate-200 dark:border-slate-700/50">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
            <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "Chargement de l'historique..." : "Posez votre question à MATHIAS..."}
            disabled={isLoading || isAiResponding}
            className="flex-1 h-12 rounded-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus-visible:ring-primary text-base"
            />
            <Button type="submit" size="icon" disabled={isLoading || isAiResponding || !input.trim()} className="shrink-0 h-12 w-12 rounded-full bg-primary hover:bg-primary/90 shadow-md">
            <Send className="h-5 w-5" />
            <span className="sr-only">Envoyer</span>
            </Button>
        </form>
      </div>
    </div>
  );
}
