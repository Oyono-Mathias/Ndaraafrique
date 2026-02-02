'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useDoc, useCollection } from '@/firebase';
import { getFirestore, doc, collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { addAdminReplyToTicket, closeTicket, refundAndRevokeAccess } from '@/actions/supportActions';
import type { SupportTicket, Message, NdaraUser, Course } from '@/lib/types';

import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Send, Shield, Briefcase, User, Ticket, BookOpen, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | undefined }) => (
    value ? (
        <div className="flex items-start gap-2 text-sm">
            <Icon className="h-4 w-4 text-slate-400 mt-0.5" />
            <span className="font-semibold text-slate-300">{label}:</span>
            <span className="text-slate-200">{value}</span>
        </div>
    ) : null
);

export function TicketDetailsClient({ ticketId }: { ticketId: string }) {
    const db = getFirestore();
    const { toast } = useToast();
    const { currentUser: adminUser } = useRole();
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const ticketRef = useMemo(() => doc(db, 'support_tickets', ticketId), [db, ticketId]);
    const { data: ticket, isLoading: ticketLoading } = useDoc<SupportTicket>(ticketRef);

    const messagesQuery = useMemo(() => query(collection(db, `support_tickets/${ticketId}/messages`), orderBy('createdAt', 'asc')), [db, ticketId]);
    const { data: messages, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);
    
    const userRef = useMemo(() => ticket ? doc(db, 'users', ticket.userId) : null, [ticket, db]);
    const { data: user, isLoading: userLoading } = useDoc<NdaraUser>(userRef);
    
    const courseRef = useMemo(() => ticket ? doc(db, 'courses', ticket.courseId) : null, [ticket, db]);
    const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

    useEffect(() => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) viewport.scrollTop = viewport.scrollHeight;
        }
    }, [messages]);

    const handleReply = async () => {
        if (!replyText.trim() || !adminUser) return;
        setIsSending(true);
        const result = await addAdminReplyToTicket({ ticketId, adminId: adminUser.uid, text: replyText });
        if (result.success) {
            setReplyText('');
            toast({ title: 'Réponse envoyée' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsSending(false);
    };

    const handleCloseTicket = async () => {
        if (!adminUser) return;
        const result = await closeTicket({ ticketId, adminId: adminUser.uid, resolution: 'Résolu par l\'équipe de support.' });
        if (!result.success) toast({ variant: 'destructive', title: 'Erreur', description: result.error });
    };
    
    const handleRefund = async () => {
        if (!ticket) return;
        const result = await refundAndRevokeAccess({ userId: ticket.userId, courseId: ticket.courseId, ticketId });
         if (!result.success) toast({ variant: 'destructive', title: 'Erreur', description: result.error });
    }

    const isLoading = ticketLoading || messagesLoading || userLoading || courseLoading;
    const isTicketOpen = ticket?.status === 'ouvert';

    return (
        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <Card className="dark:bg-slate-800/50 dark:border-slate-700/80 h-[75vh] flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-white line-clamp-1">{isLoading ? <Skeleton className="h-8 w-3/4"/> : ticket?.subject}</CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
                        <div className="space-y-6 pb-6">
                             {messages?.map(msg => {
                                const isAdminReply = msg.senderId === adminUser?.uid || msg.senderId === 'SYSTEM';
                                return (
                                <div key={msg.id} className={cn("flex gap-3", isAdminReply && "justify-end")}>
                                    {!isAdminReply && <Avatar><AvatarImage src={user?.profilePictureURL}/><AvatarFallback>{user?.fullName?.charAt(0)}</AvatarFallback></Avatar>}
                                    <div className={cn("max-w-md rounded-lg p-3 text-sm", isAdminReply ? "bg-primary text-primary-foreground" : "bg-slate-700 text-slate-200")}>
                                        <p className="font-bold text-xs mb-1">{isAdminReply ? 'Support Ndara' : user?.fullName}</p>
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                        <p className="text-xs opacity-70 mt-2 text-right">
                                            {/* ✅ Correction robuste du .toDate() */}
                                            {msg.createdAt && typeof (msg.createdAt as any).toDate === 'function' 
                                                ? format((msg.createdAt as any).toDate(), 'd MMM HH:mm', {locale: fr}) 
                                                : ''}
                                        </p>
                                    </div>
                                    {isAdminReply && <Avatar><AvatarFallback className="bg-primary/50"><Shield className="h-5 w-5"/></AvatarFallback></Avatar>}
                                </div>
                            )})}
                        </div>
                    </ScrollArea>
                    {isTicketOpen && (
                        <CardFooter className="border-t dark:border-slate-700 p-4">
                            <div className="flex w-full items-start gap-4">
                                <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Votre réponse..." rows={2} />
                                <Button onClick={handleReply} disabled={isSending || !replyText.trim()}>
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                                </Button>
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>

            <div className="lg:col-span-1">
                 <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                     <CardHeader>
                        <CardTitle className="text-lg">Détails du Ticket</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        {isLoading ? <Skeleton className="h-40 w-full" /> : (
                            <>
                            <DetailRow icon={User} label="Utilisateur" value={user?.fullName} />
                            <DetailRow icon={BookOpen} label="Cours concerné" value={course?.title} />
                            <Separator />
                            <DetailRow icon={Ticket} label="Catégorie" value={ticket?.category} />
                            <DetailRow icon={Clock} label="Créé le" value={ticket?.createdAt && typeof (ticket.createdAt as any).toDate === 'function' ? format((ticket.createdAt as any).toDate(), 'PPP', {locale: fr}) : ''} />
                            <Badge variant={isTicketOpen ? 'destructive' : 'success'} className="capitalize">{ticket?.status}</Badge>
                            </>
                        )}
                     </CardContent>
                     {isTicketOpen && (
                         <CardFooter className="flex-col gap-2">
                             <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="outline" className="w-full">Fermer le ticket</Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Fermer ce ticket ?</AlertDialogTitle><AlertDialogDescription>Le ticket sera marqué comme résolu.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleCloseTicket}>Confirmer</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                             </AlertDialog>
                              {ticket?.category === 'Paiement' && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="destructive" className="w-full gap-2"><AlertTriangle className="h-4 w-4"/>Rembourser & Révoquer</Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Action Irréversible</AlertDialogTitle><AlertDialogDescription>Ceci va marquer le paiement comme remboursé et retirer l'accès de l'étudiant au cours. Confirmer ?</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleRefund} className="bg-destructive hover:bg-destructive/90">Confirmer le remboursement</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                              )}
                         </CardFooter>
                     )}
                 </Card>
            </div>
        </div>
    );
}