
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  getFirestore,
  where,
  getDocs,
  deleteDoc,
  writeBatch,
  FieldValue
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Shield, ArrowLeft, User, BookOpen, Trash2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { refundAndRevokeAccess } from '@/app/actions/supportActions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


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
  const { user: adminUser } = useRole();
  const router = useRouter();
  const { toast } = useToast();
  const db = getFirestore();

  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isCloseAlertOpen, setIsCloseAlertOpen] = useState(false);
  const [isRefundAlertOpen, setIsRefundAlertOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const ticketRef = useMemoFirebase(() => doc(db, "support_tickets", ticketId as string), [db, ticketId]);
  const { data: ticket, isLoading: isTicketLoading } = useDoc(ticketRef);
  
  const messagesQuery = useMemoFirebase(() => query(collection(db, "support_tickets", ticketId as string, "messages"), orderBy("createdAt", "asc")), [db, ticketId]);
  const { data: messages, isLoading: areMessagesLoading } = useCollection<Message>(messagesQuery);
  
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  
  useEffect(() => {
    if (ticket && (ticket.userId || ticket.instructorId)) {
      const fetchParticipants = async () => {
        const ids = [ticket.userId, ticket.instructorId, adminUser?.uid].filter(Boolean) as string[];
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
  }, [ticket, db, adminUser]);

  useEffect(() => {
    setTimeout(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" })}, 100);
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !adminUser || !ticket) return;

    setIsSending(true);
    const textToSend = newMessage.trim();
    setNewMessage("");

    const messagePayload = {
      senderId: adminUser.uid,
      text: `[Support FormaAfrique] : ${textToSend}`,
      createdAt: serverTimestamp()
    };
    
    const batch = writeBatch(db);
    
    const messageRef = doc(collection(db, `support_tickets/${ticketId}/messages`));
    batch.set(messageRef, messagePayload);

    batch.update(ticketRef, {
      lastMessage: textToSend,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    setIsSending(false);
  };
  
  const handleCloseTicket = async () => {
    if (!ticket) return;
    setIsClosing(true);
    try {
        await updateDoc(ticketRef, {
            status: 'fermé',
            updatedAt: serverTimestamp()
        });
        toast({ title: 'Ticket clôturé', description: 'Cette conversation est maintenant archivée.' });
        router.push('/admin/support');
    } catch(error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de clôturer le ticket.' });
    } finally {
        setIsClosing(false);
        setIsCloseAlertOpen(false);
    }
  };

  const handleRefund = async () => {
    if (!ticket?.userId || !ticket?.courseId) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Informations de ticket manquantes pour le remboursement.' });
        return;
    }
    setIsRefunding(true);
    const result = await refundAndRevokeAccess({ 
        userId: ticket.userId, 
        courseId: ticket.courseId, 
        ticketId: ticket.id 
    });

    if (result.success) {
        toast({ title: 'Succès', description: 'Le cours a été remboursé et l\'accès révoqué.' });
        router.push('/admin/support');
    } else {
        toast({ variant: 'destructive', title: 'Erreur de remboursement', description: result.error });
    }
    setIsRefunding(false);
    setIsRefundAlertOpen(false);
  };
  
  const isLoading = isTicketLoading || areMessagesLoading || participants.size === 0;

  const student = ticket ? participants.get(ticket.userId) : null;
  const instructor = ticket ? participants.get(ticket.instructorId) : null;

  return (
    <div className="flex flex-col h-full bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <header className="p-4 border-b bg-slate-900/50 backdrop-blur z-10 border-slate-700 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-white">{ticket?.subject}</h2>
              <div className="text-xs text-slate-400 flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1.5"><User className="h-3 w-3"/> {student?.fullName || '...'}</span>
                <span className="flex items-center gap-1.5"><BookOpen className="h-3 w-3"/> {instructor?.fullName || '...'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsCloseAlertOpen(true)} disabled={ticket?.status === 'fermé'}>
                    <CheckCircle className="h-4 w-4 mr-2"/>
                    Clôturer le ticket
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsRefundAlertOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-2"/>
                    Rembourser & Révoquer
                </Button>
            </div>
          </header>

          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6 space-y-4">
              {messages && messages.map((msg) => {
                const senderDetails = participants.get(msg.senderId);
                const isAdminMsg = msg.senderId === adminUser?.uid;
                return (
                  <div key={msg.id} className={cn("flex items-start gap-3", isAdminMsg && "justify-end")}>
                    {isAdminMsg ? null : (
                      <Avatar className="h-8 w-8 border-2 border-slate-600">
                        <AvatarImage src={senderDetails?.profilePictureURL} />
                        <AvatarFallback className="bg-slate-700 text-slate-300">{senderDetails?.fullName?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className={cn("font-semibold text-sm text-slate-300", isAdminMsg && "text-right")}>{senderDetails?.fullName || 'Support'}</p>
                      <div className={cn(
                          "rounded-lg border mt-1 px-4 py-2 text-white text-sm shadow-sm",
                          isAdminMsg ? "bg-blue-600 border-blue-500" : "bg-slate-700 border-slate-600"
                      )}>
                        {msg.text.replace('[Support FormaAfrique] :', '')}
                      </div>
                       <p className="text-xs text-slate-500 mt-1">{msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : ''}</p>
                    </div>
                    {isAdminMsg && (
                      <Avatar className="h-8 w-8 border-2 border-blue-500">
                        <AvatarFallback className="bg-blue-600 text-white"><Shield className="h-4 w-4"/></AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-slate-700 bg-slate-900">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Répondre en tant que Support FormaAfrique..."
                  className="flex-1 bg-slate-800 border-slate-600 text-white"
                  disabled={isSending}
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending} className="shrink-0">
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                </Button>
            </form>
          </div>
        </>
      )}

        <AlertDialog open={isCloseAlertOpen} onOpenChange={setIsCloseAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la clôture ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action marquera le ticket comme résolu et l'archivera. Vous pourrez toujours le consulter plus tard.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCloseTicket} disabled={isClosing}>
                         {isClosing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmer la clôture'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isRefundAlertOpen} onOpenChange={setIsRefundAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer le remboursement et la révocation ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action est irréversible. L'étudiant sera remboursé, son accès au cours sera supprimé et ce ticket sera fermé.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRefund} disabled={isRefunding} className="bg-destructive hover:bg-destructive/90">
                         {isRefunding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmer'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
