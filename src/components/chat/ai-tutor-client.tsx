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
};

export function AiTutorClient() {
  const { user, isUserLoading } = useRole();
  const db = getFirestore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isAiResponding, setIsAiResponding] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const chatHistoryQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, `users/${user.uid}/chatHistory`), orderBy("timestamp", "asc"));
  }, [db, user]);

  const { data: initialMessages, isLoading: isHistoryLoading } = useCollection<{
    sender: 'user' | 'ai';
    text: string;
    timestamp: any;
  }>(chatHistoryQuery);

  useEffect(() => {
    const greetingMessage = { id: 'initial-greeting', sender: "ai" as const, text: "Bonjour ! Je suis MATHIAS, votre tuteur IA. Comment puis-je vous aider aujourd'hui ?" };

    if (initialMessages) {
      const formattedMessages = initialMessages.map(msg => ({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
      }));
       // Add initial greeting if history is empty
      if (formattedMessages.length === 0) {
        setMessages([greetingMessage]);
      } else {
        setMessages([greetingMessage, ...formattedMessages]);
      }
    } else if (!isHistoryLoading && !isUserLoading) {
      // If there are no initial messages after loading, and we are logged in, show greeting.
      setMessages([greetingMessage]);
    }
  }, [initialMessages, isHistoryLoading, isUserLoading]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAiResponding || !user) return;

    const currentInput = input;
    setInput("");

    const userMessage: Omit<Message, 'id'> = { sender: "user", text: currentInput };
    setMessages((prev) => [...prev, { ...userMessage, id: `temp-user-${Date.now()}` }]);

    // Save user message to Firestore
    const chatCollectionRef = collection(db, `users/${user.uid}/chatHistory`);
    const userMessagePayload = { ...userMessage, timestamp: serverTimestamp() };
    addDoc(chatCollectionRef, userMessagePayload).catch(err => {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: chatCollectionRef.path,
            operation: 'create',
            requestResourceData: userMessagePayload,
        }));
    });

    setIsAiResponding(true);

    try {
      const chatInput: MathiasTutorInput = { query: currentInput };
      const result = await mathiasTutor(chatInput);
      const aiMessage: Omit<Message, 'id'> = { sender: "ai", text: result.response };
      
      // Save AI message to Firestore
      const aiMessagePayload = { ...aiMessage, timestamp: serverTimestamp() };
      addDoc(chatCollectionRef, aiMessagePayload).catch(err => {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: chatCollectionRef.path,
            operation: 'create',
            requestResourceData: aiMessagePayload,
        }));
      });
      // The useCollection hook will add the new messages to the UI automatically, so we don't manually add the AI response to the state here.
    } catch (error) {
      console.error("AI chat error:", error);
      const errorMessage: Omit<Message, 'id'> = { sender: "ai", text: "Désolé, une erreur est survenue. Veuillez réessayer." };
      setMessages((prev) => [...prev, {...errorMessage, id: `error-${Date.now()}`}]);
    } finally {
      setIsAiResponding(false);
    }
  };

  const isLoading = isUserLoading || isHistoryLoading;

  return (
    <div className="flex flex-col h-full bg-card">
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="space-y-6 p-6">
          {isLoading && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {!isLoading && messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex items-start gap-4", message.sender === "user" && "justify-end")}
            >
              {message.sender === "ai" && (
                <Avatar className="h-9 w-9 border">
                  <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5" /></AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "rounded-lg px-4 py-2 max-w-[80%]",
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              </div>
              {message.sender === "user" && (
                 <Avatar className="h-9 w-9 border">
                  <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isAiResponding && (
            <div className="flex items-start gap-3">
              <Avatar className="h-9 w-9 border">
                <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div className="rounded-lg px-4 py-3 bg-muted flex items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                MATHIAS est en train de réfléchir...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessage} className="flex items-center gap-4">
            <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "Chargement de l'historique..." : "Posez votre question à MATHIAS..."}
            disabled={isLoading || isAiResponding}
            className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading || isAiResponding || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Envoyer</span>
            </Button>
        </form>
      </div>
    </div>
  );
}
