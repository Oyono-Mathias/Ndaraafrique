
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRole } from '@/context/RoleContext';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
  getFirestore
} from 'firebase/firestore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Loader2, Send, ShieldAlert, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '../ui/badge';
import type { FormaAfriqueUser, UserRole } from '@/context/RoleContext';

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt?: any;
}

interface ParticipantDetails {
    fullName: string;
    profilePictureURL?: string;
    role: UserRole;
}

export function ChatRoom({ chatId }: { chatId: string }) {
  const { user } = useRole();
  const db = getFirestore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherParticipant, setOtherParticipant] = useState<ParticipantDetails | null>(null);
  const [otherParticipantId, setOtherParticipantId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch chat details, listen for messages, and mark as read
  useEffect(() => {
    if (!chatId || !user) return;
    setIsLoading(true);

    const chatDocRef = doc(db, "chats", chatId);

    // Mark chat as read when it's opened
    const markAsRead = async () => {
        try {
            const chatDoc = await getDoc(chatDocRef);
            if (chatDoc.exists()) {
                const data = chatDoc.data();
                const unreadBy = data.unreadBy || [];
                // Mark as read only if current user is in the unread list
                if (unreadBy.includes(user.uid)) {
                    const batch = writeBatch(db);
                    batch.update(chatDocRef, {
                        unreadBy: unreadBy.filter((uid: string) => uid !== user.uid)
                    });
                    await batch.commit();
                }
            }
        } catch (error) {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: chatDocRef.path,
                operation: 'update',
                requestResourceData: { unreadBy: [] }
            }));
        }
    };
    markAsRead();

    // Fetch details of the other participant
    getDoc(chatDocRef).then(async (chatDoc) => {
        if(chatDoc.exists()) {
            const participants = chatDoc.data().participants as string[];
            const otherId = participants.find(p => p !== user.uid);
            if(otherId) {
                setOtherParticipantId(otherId);
                const userDocRef = doc(db, 'users', otherId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setOtherParticipant(userDoc.data() as ParticipantDetails);
                }
            }
        }
    });

    // Listen for new messages
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(docs);
      setIsLoading(false);
    }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `chats/${chatId}/messages`,
            operation: 'list'
        }));
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, user, db]);

  // Auto-scroll to the bottom
  useEffect(() => {
    setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
  }, [messages]);


  // Send a message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !otherParticipantId) return;
    
    const textToSend = newMessage.trim();
    setNewMessage("");
    
    const chatDocRef = doc(db, "chats", chatId);
    const messageDocRef = doc(collection(chatDocRef, "messages"));

    try {
        const batch = writeBatch(db);
        
        // 1. Add new message to the subcollection
        batch.set(messageDocRef, {
            text: textToSend,
            senderId: user.uid,
            createdAt: serverTimestamp(),
        });
        
        // 2. Update the parent chat document for sorting, preview and unread status
        batch.update(chatDocRef, {
            lastMessage: textToSend,
            updatedAt: serverTimestamp(),
            lastSenderId: user.uid,
            unreadBy: [otherParticipantId] // Mark as unread for the other person
        });

        await batch.commit();

    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: chatDocRef.path,
        operation: 'write'
      }));
    }
  };
  
  const RoleBadge = ({ role }: { role: UserRole | undefined }) => {
    if (!role || role === 'student') return null;

    const styles = {
        admin: 'bg-destructive text-destructive-foreground',
        instructor: 'bg-blue-600 text-white',
    };

    return (
        <Badge className={cn('ml-2 capitalize', styles[role])}>
            <Shield className="h-3 w-3 mr-1"/>
            {role}
        </Badge>
    );
};


  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <header className="p-4 border-b flex items-center gap-3 bg-card/50 backdrop-blur z-10">
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={otherParticipant?.profilePictureURL} />
          <AvatarFallback>{otherParticipant?.fullName?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <div className="flex items-center">
          <h2 className="font-semibold text-sm">{otherParticipant?.fullName || 'Chargement...'}</h2>
          <RoleBadge role={otherParticipant?.role} />
        </div>
      </header>

      <div className="bg-amber-50 border-b border-amber-200 p-3 flex gap-2 items-start">
        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          <strong>Conseil de sécurité :</strong> Pour votre protection, gardez les échanges et paiements sur FormaAfrique. 
          Tout partage de numéro (WhatsApp, Telegram) est interdit.
        </p>
      </div>

      <ScrollArea className="flex-1 bg-muted/20">
        <div className="p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <div 
                key={msg.id} 
                className={cn("flex items-end gap-2", isMe && "justify-end")}
              >
                {!isMe && (
                  <Avatar className="h-6 w-6 border">
                    <AvatarImage src={otherParticipant?.profilePictureURL} />
                    <AvatarFallback>{otherParticipant?.fullName?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                )}
                 <div className={cn(
                  "rounded-2xl px-4 py-2 max-w-[75%] text-sm shadow-sm",
                  isMe 
                    ? "bg-primary text-primary-foreground rounded-br-none" 
                    : "bg-background border rounded-bl-none text-card-foreground"
                )}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()} className="shrink-0">
                <Send className="h-4 w-4" />
                <span className="sr-only">Envoyer</span>
            </Button>
        </form>
      </div>
    </div>
  );
}
