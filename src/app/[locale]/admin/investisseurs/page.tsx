'use client';

/**
 * @fileOverview Gestionnaire des prospects investisseurs (Leads).
 * Permet à l'admin de suivre et répondre aux demandes de dossier.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Handshake, Mail, MessageSquare, CheckCircle2, MoreVertical, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { updateInvestorLeadStatus } from '@/actions/investorActions';
import { useToast } from '@/hooks/use-toast';
// @ts-ignore
import type { InvestorLead } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminInvestorsPage() {
    const db = getFirestore();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const leadsQuery = useMemo(() => query(collection(db, 'investor_leads'), orderBy('createdAt', 'desc')), [db]);
    const { data: leads, isLoading } = useCollection<InvestorLead>(leadsQuery);

    const handleStatusUpdate = async (leadId: string, status: string) => {
        setIsUpdating(leadId);
        const result = await updateInvestorLeadStatus(leadId, status);
        if (result.success) {
            toast({ title: "Statut mis à jour" });
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsUpdating(null);
    };

    const getStatusVariant = (status: string) => {
        switch(status) {
            case 'new': return 'destructive';
            case 'contacted': return 'warning';
            case 'interested': return 'success';
            default: return 'secondary';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header>
                <div className="flex items-center gap-2 text-primary mb-1">
                    <Handshake className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Relations Partenaires</span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Opportunités d'Investissement</h1>
                <p className="text-slate-400 text-sm font-medium mt-1">Gérez les demandes de dossier investisseur et les leads stratégiques.</p>
            </header>

            <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-800 bg-slate-800/30">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Partenaire</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Email / Organisation</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Statut</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i} className="border-slate-800"><TableCell colSpan={5}><Skeleton className="h-12 w-full bg-slate-800/50 rounded-xl"/></TableCell></TableRow>
                            ))
                        ) : leads && leads.length > 0 ? (
                            leads.map(lead => (
                                <TableRow key={lead.id} className="group border-slate-800 hover:bg-slate-800/20">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-white">{lead.fullName}</span>
                                            {lead.message && (
                                                <span className="text-[10px] text-slate-500 line-clamp-1 italic max-w-xs">"{lead.message}"</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-300">{lead.email}</span>
                                            <span className="text-[9px] font-black uppercase text-primary tracking-widest">{lead.organization || 'Individuel'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(lead.status)} className="font-black text-[9px] uppercase border-none px-2 py-0">
                                            {lead.status === 'new' ? 'Nouveau' : lead.status === 'contacted' ? 'Contacté' : 'Intéressé'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-[10px] font-black text-slate-500 uppercase">
                                        {(lead.createdAt as any)?.toDate ? format((lead.createdAt as any).toDate(), "d MMM yyyy", { locale: fr }) : '...'}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-800" disabled={isUpdating === lead.id}>
                                                    {isUpdating === lead.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreVertical className="h-4 w-4" />}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-300">
                                                <DropdownMenuItem onClick={() => window.open(`mailto:${lead.email}`)} className="gap-2">
                                                    <Mail className="h-4 w-4 text-blue-400" />
                                                    <span>Répondre par Email</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusUpdate(lead.id, 'contacted')} className="gap-2">
                                                    <MessageSquare className="h-4 w-4 text-amber-400" />
                                                    <span>Marquer : Contacté</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusUpdate(lead.id, 'interested')} className="gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                                    <span>Marquer : Intéressé</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={5} className="h-64 text-center opacity-20"><Handshake className="h-16 w-16 mx-auto mb-4" /><p className="font-black uppercase text-xs">Aucune demande partenaire</p></TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
