'use client';

/**
 * @fileOverview Table de gestion des demandes de rachat pour les admins.
 * Permet d'approuver ou rejeter le transfert de propriété.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, getDocs, doc } from 'firebase/firestore';
import type { Course, NdaraUser } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, CheckCircle2, XCircle, Loader2, Info, Ban } from 'lucide-react';
import { approveCourseBuyoutAction, sanctionInstructorForBuyoutViolation } from '@/actions/courseActions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog";

export function BuyoutRequestsTable() {
    const db = getFirestore();
    const { currentUser: adminUser } = useRole();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [instructorsMap, setInstructorsMap] = useState<Map<string, NdaraUser>>(new Map());

    const requestsQuery = useMemo(() => query(collection(db, 'courses'), where('buyoutStatus', '==', 'requested')), [db]);
    const { data: requests, isLoading } = useCollection<Course>(requestsQuery);

    useEffect(() => {
        if (!requests || requests.length === 0) return;
        
        const fetchInstructors = async () => {
            const ids = [...new Set(requests.map(r => r.instructorId))];
            const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', ids)));
            const newMap = new Map();
            usersSnap.forEach(d => newMap.set(d.id, d.data()));
            setInstructorsMap(newMap);
        };
        fetchInstructors();
    }, [requests, db]);

    const handleApprove = async (courseId: string) => {
        if (!adminUser) return;
        setIsProcessing(courseId);
        const result = await approveCourseBuyoutAction({ courseId, adminId: adminUser.uid });
        if (result.success) {
            toast({ title: "Rachat validé !", description: "Le cours appartient désormais à Ndara Afrique." });
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsProcessing(null);
    };

    const handleSanction = async (userId: string, reason: string) => {
        if (!adminUser) return;
        const result = await sanctionInstructorForBuyoutViolation({ userId, adminId: adminUser.uid, reason });
        if (result.success) {
            toast({ title: "Instructeur banni", description: "Sanction appliquée pour violation de contrat." });
        }
    };

    return (
        <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
            <Table>
                <TableHeader>
                    <TableRow className="border-slate-800 bg-slate-800/30">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Formation</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Vendeur (Formateur)</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Prix Demandé</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Action Stratégique</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        [...Array(3)].map((_, i) => (
                            <TableRow key={i} className="border-slate-800"><TableCell colSpan={4}><Skeleton className="h-12 w-full bg-slate-800/50 rounded-xl"/></TableCell></TableRow>
                        ))
                    ) : requests && requests.length > 0 ? (
                        requests.map(course => {
                            const instructor = instructorsMap.get(course.instructorId);
                            return (
                                <TableRow key={course.id} className="group border-slate-800 hover:bg-slate-800/20">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-white">{course.title}</span>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{course.category}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 border border-slate-700">
                                                <AvatarImage src={instructor?.profilePictureURL} />
                                                <AvatarFallback className="bg-slate-800 text-[10px] font-black">{instructor?.fullName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs font-bold text-slate-300">{instructor?.fullName || 'Chargement...'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-black text-primary">{(course.buyoutPrice || 0).toLocaleString('fr-FR')} XOF</span>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest bg-emerald-500/10 text-emerald-500 border-none hover:bg-emerald-500 hover:text-white" disabled={isProcessing === course.id}>
                                                        {isProcessing === course.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <CheckCircle2 className="h-3.5 w-3.5 mr-2" />}
                                                        Accepter & Payer
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-slate-900 border-slate-800 rounded-[2rem]">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-xl font-black text-white uppercase tracking-tight">Confirmer l'acquisition</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-slate-400">
                                                            Ndara Afrique va décaisser <b>{course.buyoutPrice?.toLocaleString('fr-FR')} XOF</b>. 
                                                            Le formateur perdra tous ses droits et le cours deviendra une propriété exclusive de la plateforme.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="p-6 pt-0">
                                                        <AlertDialogCancel className="bg-slate-800 border-none rounded-xl font-bold uppercase text-[10px]">Annuler</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleApprove(course.id)} className="bg-primary text-white font-bold uppercase text-[10px] rounded-xl">Confirmer l'Achat</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>

                                            <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest text-slate-500 hover:text-red-500">
                                                <XCircle className="h-3.5 w-3.5 mr-2" />
                                                Refuser
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow><TableCell colSpan={4} className="h-64 text-center opacity-20"><ShoppingCart className="h-16 w-16 mx-auto mb-4" /><p className="font-black uppercase text-xs">Aucune demande de rachat en attente</p></TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
