'use client';

/**
 * @fileOverview Salle de Discussion Support - Design Qwen Immersif.
 * ✅ DESIGN : Bulles de message dégradées, Header contextualisé.
 * ✅ ACTIONS : Remboursement direct et Clôture.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useDoc, useCollection } from '@/firebase';
import { getFirestore, doc, collection, query, orderBy } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { addAdminReplyToTicket, closeTicket, refundAndRevokeAccess } from '@/actions/supportActions';
import type { SupportTicket, Message, NdaraUser, Course } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Loader2, 
    Send, 
    ShieldCheck, 
    User, 
    BookOpen, 
    Clock, 
    AlertTriangle, 
    CheckCircle2, 
    X, 
    ArrowLeft,
    HandCoins,
    Ban
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
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

export function TicketDetailsClient({ ticketId }: { ticketId: string }) {
    const db = getFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { currentUser: adminUser } = useRole();
    const [replyText, setReplyText] = useState('');
    const [isActionPending, setIsActionPending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const ticketRef = useMemo(() => doc(db, 'support_tickets', ticketId), [db, ticketId]);
    const { data: ticket, isLoading: ticketLoading } = useDoc<SupportTicket>(ticketRef);

    const messagesQuery = useMemo(() => query(collection(db, `support_tickets/${ticketId}/messages`), orderBy('createdAt', 'asc')), [db, ticketId]);
    const { data: messages, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);
    
    const userRef = useMemo(() => ticket ? doc(db, 'users', ticket.userId) : null, [ticket, db]);
    const { data: user } = useDoc<NdaraUser>(userRef);
    
    const courseRef = useMemo(() => (ticket && ticket.courseId !== 'none') ? doc(db, 'courses', ticket.courseId) : null, [ticket, db]);
    const { data: course } = useDoc<Course>(courseRef);

    useEffect(() => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) viewport.scrollTop = viewport.scrollHeight;
        }
    }, [messages]);

    const handleReply = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!replyText.trim() || !adminUser || isActionPending) return;
        setIsActionPending(true);
        const result = await addAdminReplyToTicket({ ticketId, adminId: adminUser.uid, text: replyText });
        if (result.success) {
            setReplyText('');
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsActionPending(false);
    };

    const handleCloseTicket = async () => {
        if (!adminUser) return;
        setIsActionPending(true);
        const result = await closeTicket({ ticketId, adminId: adminUser.uid, resolution: 'Résolu par l\'administrateur.' });
        if (result.success) toast({ title: "Ticket clôturé" });
        setIsActionPending(false);
    };
    
    const handleRefund = async () => {
        if (!ticket) return;
        setIsActionPending(true);
        const result = await refundAndRevokeAccess({ userId: ticket.userId, courseId: ticket.courseId, ticketId });
        if (result.success) toast({ title: "Remboursement traité et accès révoqué." });
        setIsActionPending(false);
    }

    const isLoading = ticketLoading || messagesLoading;
    const isOpen = ticket?.status === 'ouvert';

    if (isLoading) return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="flex flex-col h-[85vh] bg-slate-950 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
            <div className="grain-overlay opacity-[0.03]" />

            {/* --- IMMERSIVE HEADER --- */}
            <header className="px-6 py-4 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 z-20">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 active:scale-90 transition">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="relative">
                            <Avatar className="h-12 w-12 border-2 border-primary/30 shadow-xl">
                                <AvatarImage src={user?.profilePictureURL} className="object-cover" />
                                <AvatarFallback className="bg-slate-800 text-slate-500 font-black">{user?.fullName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {user?.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-primary rounded-full border-2 border-slate-900" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-black text-white text-base truncate uppercase tracking-tight leading-none mb-1.5">{user?.fullName}</h2>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-blue-500/10 text-blue-400 border-none text-[8px] font-black uppercase px-1.5 h-4">{ticket?.category}</Badge>
                                {course && (
                                    <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[150px]">
                                        {course.title}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {ticket?.category === 'Paiement' && isOpen && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="hidden sm:flex h-9 rounded-xl bg-red-500/10 text-red-500 border-none hover:bg-red-500 hover:text-white font-black uppercase text-[9px] tracking-widest">
                                        Rembourser
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-900 border-slate-800 rounded-[2rem]">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-white uppercase tracking-tight">Rembourser & Révoquer ?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-400 italic">"Ceci annulera l'accès au cours et marquera le paiement comme remboursé."</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-slate-800 border-none rounded-xl">Annuler</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleRefund} className="bg-red-600 text-white rounded-xl">Confirmer</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        
                        {isOpen ? (
                            <Button onClick={handleCloseTicket} disabled={isActionPending} className="h-9 px-4 rounded-xl bg-primary hover:bg-emerald-400 text-slate-950 font-black uppercase text-[9px] tracking-widest shadow-lg active:scale-95 transition-all">
                                {isActionPending ? <Loader2 className="h-3 w-3 animate-spin"/> : "Clôturer"}
                            </Button>
                        ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[9px] uppercase px-3 py-1.5">RÉSOLU</Badge>
                        )}
                    </div>
                </div>
            </header>

            {/* --- MESSAGES AREA --- */}
            <ScrollArea className="flex-1 z-10" ref={scrollAreaRef}>
                <div className="p-6 space-y-4 flex flex-col min-h-full">
                    <div className="self-center mb-6">
                        <span className="bg-slate-900/80 text-[10px] font-black text-slate-500 px-4 py-2 rounded-full border border-white/5 uppercase tracking-[0.2em]">Sujet: {ticket?.subject}</span>
                    </div>

                    {messages?.map((msg, idx) => {
                        const isMe = msg.senderId === adminUser?.uid || msg.senderId === 'SYSTEM';
                        const date = (msg.createdAt as any)?.toDate?.() || new Date();
                        
                        return (
                            <div key={msg.id} className={cn(
                                "flex flex-col mb-1 max-w-[85%] animate-in slide-in-from-bottom-2 duration-300",
                                isMe ? "self-end items-end" : "self-start items-start"
                            )}>
                                <div className={cn(
                                    "px-4 py-3 rounded-[1.5rem] text-sm leading-relaxed shadow-xl border border-white/5",
                                    isMe 
                                        ? "bg-gradient-to-br from-primary to-[#005c4b] text-white rounded-tr-none" 
                                        : "bg-slate-900 text-slate-200 rounded-tl-none",
                                    msg.senderId === 'SYSTEM' && "bg-slate-800 text-slate-400 border-dashed italic"
                                )}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    <p className={cn(
                                        "text-[9px] font-black uppercase mt-2 opacity-50 text-right",
                                        isMe ? "text-white" : "text-slate-500"
                                    )}>
                                        {format(date, 'HH:mm', { locale: fr })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* --- INPUT AREA --- */}
            {isOpen ? (
                <footer className="p-4 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 z-20 safe-area-pb">
                    <form onSubmit={handleReply} className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <Textarea 
                                value={replyText} 
                                onChange={(e) => setReplyText(e.target.value)} 
                                placeholder="Écrire une réponse..." 
                                className="min-h-[50px] h-12 py-3.5 bg-slate-950 border-white/5 rounded-[1.5rem] text-white focus-visible:ring-primary/20 resize-none pr-12 scrollbar-hide"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleReply();
                                    }
                                }}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700">
                                <ShieldCheck size={18} />
                            </div>
                        </div>
                        <Button 
                            type="submit" 
                            disabled={!replyText.trim() || isActionPending}
                            className="h-12 w-12 rounded-full bg-primary hover:bg-emerald-400 text-slate-950 shadow-xl shadow-primary/20 shrink-0 transition-all active:scale-90 border-none"
                        >
                            {isActionPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={20} className="ml-1" />}
                        </Button>
                    </form>
                </footer>
            ) : (
                <div className="p-6 bg-slate-900/50 border-t border-white/5 text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] z-20">
                    Cette conversation est clôturée
                </div>
            )}
        </div>
    );
}
