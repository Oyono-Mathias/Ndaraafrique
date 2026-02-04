'use client';

/**
 * @fileOverview Centre d'Aide Étudiant Ndara Afrique.
 * Supporte la création de tickets et le contact direct (WhatsApp/Email).
 * Design Android-First & Vintage.
 */

import { useState, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  LifeBuoy, 
  Mail, 
  MessageCircle, 
  Plus, 
  Ticket, 
  Clock, 
  ShieldCheck, 
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NewTicketForm } from '@/components/support/NewTicketForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { SupportTicket } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function StudentSupportPage() {
  const { currentUser } = useRole();
  const db = getFirestore();
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 1. Récupération des tickets de l'étudiant
  const ticketsQuery = useMemo(() => 
    currentUser?.uid 
      ? query(
          collection(db, 'support_tickets'), 
          where('userId', '==', currentUser.uid),
          orderBy('updatedAt', 'desc')
        )
      : null,
    [db, currentUser]
  );

  const { data: tickets, isLoading } = useCollection<SupportTicket>(ticketsQuery);

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
      
      {/* --- HEADER --- */}
      <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-2 text-[#CC7722] mb-2">
            <LifeBuoy className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Assistance</span>
        </div>
        <h1 className="text-3xl font-black text-white leading-tight">Centre d'<br/><span className="text-[#CC7722]">Aide</span></h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">Une question ? L'équipe Ndara est là pour vous.</p>
      </header>

      <div className="px-4 space-y-8">
        
        {/* --- CONTACT DIRECT --- */}
        <section className="grid gap-3">
            <a 
              href="https://wa.me/23675000000" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-5 bg-slate-900/50 border border-slate-800 rounded-3xl active:scale-[0.98] transition-all group"
            >
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-white text-sm">WhatsApp</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Réponse en moins de 2h</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-700 group-hover:text-white" />
            </a>

            <a 
              href="mailto:support@ndara-afrique.com" 
              className="flex items-center gap-4 p-5 bg-slate-900/50 border border-slate-800 rounded-3xl active:scale-[0.98] transition-all group"
            >
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Mail className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-white text-sm">Email Support</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Pour les dossiers complexes</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-700 group-hover:text-white" />
            </a>
        </section>

        {/* --- MES TICKETS --- */}
        <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Mes demandes</h2>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 text-[#CC7722] font-black uppercase text-[10px] tracking-widest">
                            <Plus className="h-3 w-3 mr-1" /> Nouveau
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 p-0 overflow-hidden sm:max-w-md">
                        <DialogHeader className="p-6 pb-0">
                            <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">Ouvrir un ticket</DialogTitle>
                        </DialogHeader>
                        <div className="p-6">
                            <NewTicketForm onSuccess={() => setIsFormOpen(false)} />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    <Skeleton className="h-24 w-full rounded-3xl bg-slate-900" />
                    <Skeleton className="h-24 w-full rounded-3xl bg-slate-900" />
                </div>
            ) : tickets && tickets.length > 0 ? (
                <div className="grid gap-3">
                    {tickets.map(ticket => (
                        <TicketItem key={ticket.id} ticket={ticket} />
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center bg-slate-900/20 rounded-[2rem] border-2 border-dashed border-slate-800/50">
                    <Ticket className="h-10 w-10 mx-auto text-slate-800 mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Aucun ticket actif</p>
                </div>
            )}
        </section>

        {/* --- STATUT SERVICES --- */}
        <section className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6 flex items-center gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <div>
                <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Système Opérationnel</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Tous les services Ndara Afrique fonctionnent normalement.</p>
            </div>
        </section>

      </div>

      {/* --- FAB CRÉATION TICKET --- */}
      <Button 
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-[#CC7722] hover:bg-[#CC7722]/90 shadow-2xl shadow-[#CC7722]/40 z-50 transition-transform active:scale-90 md:hidden"
      >
        <Plus className="h-6 w-6 text-white" />
        <span className="sr-only">Nouveau ticket</span>
      </Button>

    </div>
  );
}

function TicketItem({ ticket }: { ticket: SupportTicket }) {
    const updatedAt = (ticket.updatedAt as any)?.toDate?.() || new Date();
    const isOpen = ticket.status === 'ouvert';

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-3 active:scale-[0.98] transition-all">
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-slate-800 text-slate-400 border-none text-[8px] font-black uppercase py-0 px-1.5">
                            {ticket.category}
                        </Badge>
                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">
                            Ref: {ticket.id.substring(0, 8).toUpperCase()}
                        </span>
                    </div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">{ticket.subject}</h3>
                </div>
                {isOpen ? (
                    <div className="flex items-center gap-1.5 text-amber-500">
                        <Clock className="h-3 w-3" />
                        <span className="text-[9px] font-black uppercase">En cours</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-emerald-500">
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="text-[9px] font-black uppercase">Résolu</span>
                    </div>
                )}
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                <p className="text-[10px] text-slate-500 font-medium italic truncate max-w-[180px]">
                    "{ticket.lastMessage}"
                </p>
                <span className="text-[8px] font-black text-slate-600 uppercase">
                    {format(updatedAt, 'dd/MM/yy', { locale: fr })}
                </span>
            </div>
        </div>
    );
}
