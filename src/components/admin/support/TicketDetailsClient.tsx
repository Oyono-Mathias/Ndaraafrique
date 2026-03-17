
'use client';

/**
 * @fileOverview Salle de Discussion Support Ndara Afrique - Design Qwen WhatsApp Premium.
 * ✅ DESIGN : Bulles de message dégradées, Header immersif, safe-areas Android.
 * ✅ ACTIONS : Barre d'actions rapides (Rembourser, Clôturer, Transférer).
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
import { 
    Loader2, 
    Send, 
    ShieldCheck, 
    ArrowLeft,
    HandCoins,
    CheckCircle2,
    RefreshCw,
    Paperclip,
    Smile,
    MoreVertical,
    Check,
    AlertCircle
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
        if (result.success) {
            toast({ title: "Ticket clôturé" });
            router.push('/admin/support');
        }
        setIsActionPending(false);
    };
    
    const handleRefund = async () => {
        if (!ticket) return;
        setIsActionPending(true);
        const result = await refundAndRevokeAccess({ userId: ticket.userId, courseId: ticket.courseId, ticketId });
        if (result.success) {
            toast({ title: "Remboursement traité !" });
            router.push('/admin/support');
        }
        setIsActionPending(false);
    }

    const isLoading = ticketLoading || messagesLoading;
    const isOpen = ticket?.status === 'ouvert';

    if (isLoading) return <div className="h-[70vh] flex items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="fixed inset-0 lg:relative lg:h-[85vh] z-[100] flex flex-col bg-[#0b141a] lg:rounded-[2.5rem] lg:border lg:border-white/5 lg:shadow-2xl overflow-hidden font-sans">
            <div className="grain-overlay opacity-[0.03]" />

            {/* --- IMMERSIVE CHAT HEADER --- */}
            <header className="px-4 py-3 bg-[#1e293b]/95 backdrop-blur-xl border-b border-white/5 z-20 safe-area-pt shadow-md">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="relative flex-shrink-0">
                            <Avatar className="h-11 w-11 border-2 border-primary/30 shadow-xl">
                                <AvatarImage src={user?.profilePictureURL} className="object-cover" />
                                <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">{user?.fullName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {user?.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-[#1e293b] shadow-lg animate-pulse" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-black text-white text-base truncate uppercase tracking-tight leading-none mb-1">{user?.fullName}</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-[#10b981] text-[10px] font-black uppercase tracking-widest truncate">{ticket?.subject}</span>
                            </div>
                        </div>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 active:scale-90">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </header>

            {/* --- QUICK ACTIONS BAR (QWEN DESIGN) --- */}
            <div className="px-4 py-2 bg-slate-900/50 border-b border-white/5 flex gap-2 overflow-x-auto hide-scrollbar z-20">
                <button className="flex-shrink-0 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition active:scale-95 flex items-center gap-2">
                    <RefreshCw size={12} /> Transférer
                </button>
                
                {ticket?.category === 'Paiement' && isOpen && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <button className="flex-shrink-0 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition active:scale-95 flex items-center gap-2">
                                <HandCoins size={12} /> Rembourser
                            </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-slate-800 rounded-[2.5rem] p-8">
                            <AlertDialogHeader className="items-center text-center space-y-4">
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 shadow-xl">
                                    <AlertCircle size={32} />
                                </div>
                                <AlertDialogTitle className="text-white font-black uppercase tracking-tight">Rembourser & Révoquer ?</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400 font-medium italic">
                                    "Action irréversible. L'étudiant perdra ses accès au cours immédiatement."
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-8 gap-3">
                                <AlertDialogCancel className="bg-slate-800 border-none text-white rounded-2xl h-14 font-black uppercase text-[10px] flex-1">Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleRefund} className="bg-red-600 hover:bg-red-700 text-white rounded-2xl h-14 font-black uppercase text-[10px] flex-1 shadow-lg shadow-red-600/20">Confirmer</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                {isOpen ? (
                    <button 
                        onClick={handleCloseTicket}
                        disabled={isActionPending}
                        className="flex-shrink-0 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition active:scale-95 flex items-center gap-2"
                    >
                        {isActionPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Clôturer
                    </button>
                ) : (
                    <Badge className="bg-emerald-500 text-slate-950 border-none font-black text-[9px] uppercase px-3 py-1.5 rounded-full shadow-lg">RÉSOLU</Badge>
                )}
            </div>

            {/* --- MESSAGES AREA --- */}
            <ScrollArea className="flex-1 z-10" ref={scrollAreaRef}>
                <div className="p-4 space-y-4 flex flex-col min-h-full pb-32">
                    <div className="self-center mb-6">
                        <span className="bg-slate-900/80 backdrop-blur-md text-[10px] font-black text-slate-500 px-4 py-2 rounded-full border border-white/5 uppercase tracking-[0.2em] shadow-lg">
                            Canal de Support Certifié Ndara
                        </span>
                    </div>

                    {messages?.map((msg) => {
                        const isMe = msg.senderId === adminUser?.uid || msg.senderId === 'SYSTEM';
                        const date = (msg.createdAt as any)?.toDate?.() || new Date();
                        
                        return (
                            <div key={msg.id} className={cn(
                                "flex flex-col mb-1 max-w-[85%] animate-in slide-in-from-bottom-2 duration-300",
                                isMe ? "self-end items-end" : "self-start items-start"
                            )}>
                                <div className={cn(
                                    "px-4 py-3 rounded-[1.5rem] text-[14.5px] leading-relaxed shadow-xl relative min-w-[100px] border border-white/5",
                                    isMe 
                                        ? "bg-gradient-to-br from-primary to-[#005c4b] text-white rounded-tr-none" 
                                        : "bg-slate-900 text-slate-200 rounded-tl-none",
                                    msg.senderId === 'SYSTEM' && "bg-slate-800 text-slate-400 border-dashed italic opacity-80"
                                )}>
                                    <p className="whitespace-pre-wrap pb-2">{msg.text}</p>
                                    <div className={cn(
                                      "flex items-center justify-end gap-1.5",
                                      isMe ? "text-white/60" : "text-slate-500"
                                    )}>
                                      <span className="text-[9px] font-black font-mono">{format(date, 'HH:mm', { locale: fr })}</span>
                                      {isMe && <Check size={10} className="stroke-[3px]" />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* --- INPUT BAR --- */}
            {isOpen && (
                <footer className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0b141a] via-[#0b141a] to-transparent pt-10 safe-area-pb z-40">
                    <div className="max-w-4xl mx-auto flex items-end gap-3">
                        <button className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 hover:text-white transition active:scale-90 shadow-xl border border-white/5">
                            <Paperclip size={20} className="-rotate-45" />
                        </button>

                        <div className="flex-1 bg-slate-900 rounded-[2rem] flex items-center px-2 py-1 border border-white/5 shadow-2xl focus-within:border-primary/30 transition-all">
                            <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:text-primary transition active:scale-90">
                                <Smile size={22} />
                            </button>
                            <form onSubmit={handleReply} className="flex-1">
                                <Textarea 
                                    value={replyText} 
                                    onChange={(e) => setReplyText(e.target.value)} 
                                    placeholder="Répondre au Ndara..." 
                                    className="min-h-[48px] h-12 py-3.5 bg-transparent border-none text-white placeholder:text-slate-600 text-[15px] focus-visible:ring-0 shadow-none resize-none px-2 scrollbar-hide"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleReply();
                                        }
                                    }}
                                />
                            </form>
                        </div>
                        
                        <Button 
                            onClick={() => handleReply()}
                            disabled={!replyText.trim() || isActionPending}
                            className="h-14 w-14 rounded-full bg-primary hover:bg-emerald-400 text-slate-950 shadow-xl shadow-primary/40 shrink-0 transition-all active:scale-90 border-none"
                        >
                            {isActionPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send size={24} className="ml-1" />}
                        </Button>
                    </div>
                </footer>
            )}
        </div>
    );
}
