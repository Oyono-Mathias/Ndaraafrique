'use client';

import { useState, useRef, useEffect } from 'react';
import { adminAssistant } from '@/ai/flows/generate-promo-code-flow';
import { useRole } from '@/context/RoleContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, User, Send, Loader2, Sparkles, Code, Gift, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const SuggestionButton = ({ icon: Icon, text, onSelect }: { icon: React.ElementType, text: string, onSelect: (text: string) => void }) => (
    <button onClick={() => onSelect(text)} className="p-3 text-left bg-slate-800/70 rounded-lg hover:bg-slate-700/90 transition-colors w-full flex items-start gap-3">
        <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
            <p className="text-sm font-semibold text-slate-200">{text}</p>
        </div>
    </button>
);

export function AdminAssistantClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useRole();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSuggestionSelect = (text: string) => {
    setInput(text);
  };
  
  const suggestions = [
      { icon: Gift, text: "Crée un code promo de 25% pour Pâques, valable une semaine." },
      { icon: Mic, text: "Rédige une annonce pour une vente flash ce week-end sur tous les cours de développement." },
      { icon: Code, text: "Offre le cours 'Introduction à l'IA' à l'étudiant 'test@ndara.com' comme récompense." },
  ];

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentUser) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      const response = await adminAssistant({
        prompt: input,
        adminId: currentUser.uid,
      });
      const aiMessage: Message = { sender: 'ai', text: response.response };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI assistant error:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de l\'assistant',
        description: 'Une erreur est survenue. Veuillez réessayer.',
      });
      // Optionally add an error message to the chat
      const errorMessage: Message = { sender: 'ai', text: "Désolé, je rencontre des difficultés. Veuillez réessayer plus tard." };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-[70vh] flex flex-col dark:bg-slate-800/50 dark:border-slate-700/80">
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="p-6 space-y-6">
            {messages.length === 0 && !isLoading ? (
               <div className="text-center py-8">
                    <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                        <Sparkles className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Comment puis-je vous aider ?</h3>
                    <p className="text-slate-400 mt-1 mb-6">Essayez une de ces commandes pour commencer :</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl mx-auto">
                        {suggestions.map((s, i) => (
                            <SuggestionButton key={i} icon={s.icon} text={s.text} onSelect={handleSuggestionSelect} />
                        ))}
                    </div>
                </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-start gap-3',
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.sender === 'ai' && (
                    <Avatar className="h-8 w-8 border-2 border-primary/50">
                      <AvatarFallback className="bg-primary/20 text-primary">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-lg rounded-xl px-4 py-2.5 text-sm',
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-slate-700 text-slate-200'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  </div>
                  {message.sender === 'user' && currentUser && (
                     <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser.profilePictureURL} />
                        <AvatarFallback>{currentUser.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            {isLoading && (
               <div className="flex items-start gap-3 justify-start">
                    <Avatar className="h-8 w-8 border-2 border-primary/50">
                      <AvatarFallback className="bg-primary/20 text-primary">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                     <div className="max-w-lg rounded-xl px-4 py-3 text-sm bg-slate-700 text-slate-200 flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span>Réflexion...</span>
                    </div>
               </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t dark:border-slate-700">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: 'Crée un code promo de 10% pour la fête des mères...'"
              disabled={isLoading}
              className="h-12 text-base dark:bg-slate-800"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="h-12 w-12 flex-shrink-0">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
