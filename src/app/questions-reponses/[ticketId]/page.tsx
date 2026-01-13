
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  getFirestore,
  where,
  getDocs
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt?: any;
}

interface Participant {
    id: string;
    fullName: string;
    profilePictureURL?: string;
}

export default function TicketConversationPage() {
  const { ticketId } = useParams();
  const { user } = useRole();
  const db = getFirestore();
  const router = useRouter();

  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const ticketRef = useMemoFirebase(() => doc(db, "support_tickets", ticketId as string), [db, ticketId]);
  const { data: ticket, isLoading: isTicketLoading } = useDoc(ticketRef);
  
  const messagesQuery = useMemoFirebase(() => query(collection(db, "support_tickets", ticketId as string, "messages"), orderBy("createdAt", "asc")), [db, ticketId]);
  const { data: messages, isLoading: areMessagesLoading } = useCollection<Message>(messagesQuery);
  
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  
  useEffect(() => {
    if (ticket && (ticket.userId || ticket.instructorId)) {
      const fetchParticipants = async () => {
        const ids = [ticket.userId, ticket.instructorId].filter(Boolean);
        if (ids.length === 0) return;
        
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, where('uid', 'in', ids));
        const userSnapshots = await getDocs(usersQuery);
        
        const newParticipants = new Map<string, Participant>();
        userSnapshots.forEach(doc => {
            const userData = doc.data();
            newParticipants.set(userData.uid, {
                id: userData.uid,
                fullName: userData.fullName || 'Utilisateur inconnu',
                profilePictureURL: userData.profilePictureURL,
            });
        });
        setParticipants(newParticipants);
      };
      fetchParticipants();
    }
  }, [ticket, db]);

  useEffect(() => {
    setTimeout(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" })}, 100);
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !ticket) return;

    setIsSending(true);
    const textToSend = newMessage.trim();
    setNewMessage("");

    const messagePayload = {
      senderId: user.uid,
      text: textToSend,
      createdAt: serverTimestamp()
    };
    
    const updatePayload = {
      lastMessage: textToSend,
      updatedAt: serverTimestamp(),
      status: 'ouvert' // Re-open ticket on new message
    };

    try {
      await addDoc(collection(db, `support_tickets/${ticketId}/messages`), messagePayload);
      await updateDoc(doc(db, 'support_tickets', ticketId as string), updatePayload);

    } catch (err) {
      console.error(err);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `support_tickets/${ticketId}/messages`,
        operation: 'write'
      }));
    } finally {
      setIsSending(false);
    }
  };
  
  const isLoading = isTicketLoading || areMessagesLoading;

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!ticket) {
      return <div className="p-8 text-center text-muted-foreground">Cette conversation n'a pas été trouvée.</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh_-_theme(spacing.16))] bg-card -m-6">
      <header className="p-4 border-b bg-card/50 backdrop-blur z-10 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold text-card-foreground">{ticket.subject}</h2>
            <p className="text-sm text-muted-foreground">
              Ticket créé le {ticket.createdAt ? format(ticket.createdAt.toDate(), 'dd MMMM yyyy', {locale: fr}) : ''}
            </p>
          </div>
      </header>

      <ScrollArea className="flex-1 bg-muted/20">
        <div className="p-4 sm:p-6 space-y-4">
          {messages && messages.map((msg) => {
            const senderDetails = participants.get(msg.senderId);
            const isUserMessage = msg.senderId === user?.uid;
            
            return (
              <div 
                key={msg.id} 
                className={cn("flex items-end gap-3 max-w-[85%]", isUserMessage ? "ml-auto flex-row-reverse" : "mr-auto")}
              >
                 <Avatar className="h-8 w-8 border">
                    <AvatarImage src={senderDetails?.profilePictureURL} />
                    <AvatarFallback>{senderDetails?.fullName?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div>
                   <p className={cn("text-xs font-semibold mb-1", isUserMessage ? "text-right" : "text-left")}>
                      {senderDetails?.fullName || 'Chargement...'}
                    </p>
                  <div className={cn("rounded-lg px-4 py-2 text-card-foreground text-sm shadow-sm", isUserMessage ? "bg-primary text-primary-foreground" : "bg-background border")}>
                    {msg.text}
                  </div>
                   <p className={cn("text-xs text-slate-500 mt-1", isUserMessage ? "text-right" : "text-left")}>
                    {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : ''}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre réponse..."
              className="flex-1"
              disabled={isSending}
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending} className="shrink-0">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                <span className="sr-only">Envoyer</span>
            </Button>
        </form>
      </div>
    </div>
  );
}
