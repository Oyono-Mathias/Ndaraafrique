'use client';

/**
 * @fileOverview Gestionnaire d'Inscriptions & Révocations.
 * ✅ SOUVERAINETÉ : Enrollment = Source de Vérité.
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { manageAccessRevocationAction } from '@/actions/adminActions';
import type { NdaraUser, Enrollment } from '@/lib/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, XCircle, HandCoins, AlertCircle, Clock, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
    AlertDialog, 
    AlertDialogTrigger, 
    AlertDialogContent, 
    AlertDialogHeader, 
    AlertDialogFooter, 
    AlertDialogTitle, 
    AlertDialogDescription, 
    AlertDialogAction, 
    AlertDialogCancel 
} from '@/components/ui/alert-dialog';

export function AccessManagerModal({ isOpen, onOpenChange, user }: { isOpen: boolean; onOpenChange: (o: boolean) => void; user: NdaraUser; }) {
    const db = getFirestore();
    const { currentUser: admin } = useRole();
    const { toast } = useToast();
    
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionPending, setIsActionPending] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !user.uid) return;
        setIsLoading(true);
        const q = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
        
        const unsub = onSnapshot(q, (snap) => {
            setEnrollments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment)));
            setIsLoading(false);
        });
        return () => unsub();
    }, [isOpen, user.uid, db]);

    const handleRevoke = async (enroll: Enrollment, reason: 'refund' | 'abuse' | 'admin_error', refund: boolean) => {
        if (!admin) return;
        setIsActionPending(enroll.id);

        try {
            const result = await manageAccessRevocationAction({
                adminId: admin.uid,
                targetUserId: user.uid,
                courseId: enroll.courseId,
                reason,
                refund
            });

            if (result.success) {
                toast({ title: "Droits révoqués", description: refund ? "Remboursement traité sur le wallet." : "Accès coupé." });
            } else {
                toast({ variant: 'destructive', title: "Erreur", description: result.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erreur technique" });
        } finally {
            setIsActionPending(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl bg-slate-900 border-slate-800 p-0 overflow-hidden rounded-[2.5rem]">
                <DialogHeader className="p-8 pb-4 bg-slate-800/30 border-b border-white/5">
                    <DialogTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-primary" /> Droits & Formations
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Gérez les inscriptions de <b>{user.fullName}</b>.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8">
                    <ScrollArea className="h-[400px] pr-4">
                        {isLoading ? (
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => <div key={i} className="h-20 w-full bg-slate-800/50 rounded-2xl animate-pulse" />)}
                            </div>
                        ) : enrollments.length > 0 ? (
                            <div className="space-y-4">
                                {enrollments.map(enroll => {
                                    const isRevoked = enroll.accessStatus === 'revoked';
                                    return (
                                        <div key={enroll.id} className={cn(
                                            "p-4 rounded-3xl border transition-all flex flex-col gap-4",
                                            isRevoked ? "bg-slate-950 border-red-900/30 opacity-60" : "bg-slate-800/30 border-white/5"
                                        )}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                        <BookOpen size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white uppercase leading-tight line-clamp-1">{enroll.courseTitle || 'Formation'}</p>
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Acquis le {new Date((enroll.enrollmentDate as any)?.seconds * 1000).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <Badge className={cn(
                                                    "text-[8px] font-black uppercase border-none px-2",
                                                    isRevoked ? "bg-red-500/20 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                                                )}>
                                                    {isRevoked ? "RÉVOQUÉ" : "ACTIF"}
                                                </Badge>
                                            </div>

                                            {!isRevoked && (
                                                <div className="flex gap-2">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="sm" variant="destructive" className="flex-1 rounded-xl h-10 font-black uppercase text-[9px] tracking-widest gap-2">
                                                                <HandCoins size={14} /> Rembourser & Révoquer
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-slate-950 border-red-900/50 rounded-[2rem]">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="text-red-500 font-black uppercase">Action Irréversible</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-slate-400">
                                                                    L'étudiant sera crédité de <b>{enroll.priceAtEnrollment?.toLocaleString()} XOF</b> sur son wallet et son accès au cours sera coupé instantanément.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="p-6 pt-0">
                                                                <AlertDialogCancel className="bg-slate-900 border-none rounded-xl text-xs uppercase font-bold">Annuler</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleRevoke(enroll, 'refund', true)} className="bg-red-600 text-white rounded-xl text-xs uppercase font-bold">Confirmer</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="sm" variant="outline" className="flex-1 rounded-xl h-10 font-black uppercase text-[9px] tracking-widest border-slate-700 bg-slate-900 text-slate-400 gap-2">
                                                                <XCircle size={14} /> Couper simple
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-slate-950 border-slate-800 rounded-[2rem]">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="text-white font-black uppercase">Révocation pour Abus</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-slate-400 italic">
                                                                    Ceci retire l'accès sans remboursement. À utiliser pour les sanctions uniquement.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="p-6 pt-0">
                                                                <AlertDialogCancel className="bg-slate-900 border-none rounded-xl text-xs uppercase font-bold">Annuler</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleRevoke(enroll, 'abuse', false)} className="bg-orange-600 text-white rounded-xl text-xs uppercase font-bold">Sanctionner</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            )}

                                            {isRevoked && (
                                                <div className="flex items-center gap-2 p-2 bg-red-500/5 rounded-xl border border-red-500/10">
                                                    <AlertCircle size={12} className="text-red-400" />
                                                    <p className="text-[9px] font-bold text-red-300 uppercase tracking-tighter">
                                                        Motif: {enroll.revocationReason || 'non spécifié'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="py-20 text-center opacity-20">
                                <BookOpen className="h-12 w-12 mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">Aucune inscription</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <footer className="p-8 bg-slate-950/50 border-t border-white/5 flex items-center justify-center gap-2">
                    <ShieldCheck size={14} className="text-primary" />
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Audit Trail v5.0 Enabled</p>
                </footer>
            </DialogContent>
        </Dialog>
    );
}
