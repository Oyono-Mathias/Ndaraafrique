'use client';

/**
 * @fileOverview Centre de Correction Ndara Afrique - Design Elite Android.
 * ✅ DESIGN : Cartes immersives avec pulsation rouge pour les urgences.
 * ✅ FONCTIONNEL : Filtrage par statut (À corriger vs Historique).
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ClipboardCheck, Loader2, Clock, History, ChevronRight, PenTool } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GradingModal } from './GradingModal';
import type { AssignmentSubmission } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AssignmentsClient() {
  const db = getFirestore();
  const { currentUser } = useRole();
  const [statusFilter, setStatusFilter] = useState<'submitted' | 'graded'>('submitted');
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Récupérer toutes les soumissions
  const submissionsQuery = useMemo(
    () => currentUser ? query(collection(db, 'devoirs'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: rawSubmissions, isLoading } = useCollection<AssignmentSubmission>(submissionsQuery);

  const filteredSubmissions = useMemo(() => {
    if (!rawSubmissions) return [];
    return [...rawSubmissions]
      .filter(sub => sub.status === statusFilter)
      .sort((a, b) => {
        const dateA = (a.submittedAt as any)?.toDate?.() || new Date(0);
        const dateB = (b.submittedAt as any)?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [rawSubmissions, statusFilter]);

  const handleGradeClick = (submission: AssignmentSubmission) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  const pendingCount = useMemo(() => rawSubmissions?.filter(s => s.status === 'submitted').length || 0, [rawSubmissions]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-20">
      <GradingModal submission={selectedSubmission} isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
      
      <header className="flex flex-col gap-6">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
            <button 
                onClick={() => setStatusFilter('submitted')}
                className={cn(
                    "flex-shrink-0 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all relative active:scale-95",
                    statusFilter === 'submitted' ? "bg-primary text-slate-950 shadow-lg" : "bg-slate-900 border border-white/5 text-slate-500"
                )}
            >
                À Noter ({pendingCount})
                {pendingCount > 0 && statusFilter !== 'submitted' && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-slate-950" />
                )}
            </button>
            <button 
                onClick={() => setStatusFilter('graded')}
                className={cn(
                    "flex-shrink-0 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                    statusFilter === 'graded' ? "bg-primary text-slate-950 shadow-lg" : "bg-slate-900 border border-white/5 text-slate-500"
                )}
            >
                Historique Noté
            </button>
        </div>
      </header>

      <main className="space-y-4">
        <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="font-black text-white text-sm uppercase tracking-tight flex items-center gap-2">
                {statusFilter === 'submitted' ? (
                    <>
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        Travaux en attente
                    </>
                ) : (
                    <>
                        <ClipboardCheck className="h-4 w-4 text-slate-500" />
                        Dernières notes
                    </>
                )}
            </h2>
        </div>

        {isLoading ? (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-[2.5rem] bg-slate-900" />)}
            </div>
        ) : filteredSubmissions.length > 0 ? (
            <div className="grid gap-4">
                {filteredSubmissions.map(sub => (
                    <div key={sub.id} className="touch-btn bg-slate-900 border border-white/5 rounded-[2.5rem] p-5 flex flex-col gap-4 shadow-xl active:scale-[0.98] transition-all group relative overflow-hidden">
                        {statusFilter === 'submitted' && (
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-red-500/20 transition-all duration-700" />
                        )}
                        
                        <div className="flex items-start gap-4 relative z-10">
                            <Avatar className="h-14 w-14 border-2 border-white/10 shadow-xl flex-shrink-0">
                                <AvatarImage src={sub.studentAvatarUrl} className="object-cover" />
                                <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                                    {sub.studentName?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-white text-base truncate uppercase tracking-tight leading-tight mb-1">{sub.studentName}</h3>
                                <p className="text-slate-400 text-xs font-bold truncate tracking-tight">Formation: {sub.courseTitle}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Clock size={12} className={cn(statusFilter === 'submitted' ? "text-red-400" : "text-slate-600")} />
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest", statusFilter === 'submitted' ? "text-red-400" : "text-slate-600")}>
                                        Remis {(sub.submittedAt as any)?.toDate ? formatDistanceToNow((sub.submittedAt as any).toDate(), { locale: fr, addSuffix: true }) : 'récemment'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 relative z-10">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Libellé du devoir</p>
                            <p className="text-sm font-bold text-slate-300 truncate italic">"{sub.assignmentTitle}"</p>
                        </div>

                        <Button 
                            onClick={() => handleGradeClick(sub)}
                            className={cn(
                                "w-full h-14 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 relative z-10",
                                statusFilter === 'submitted' ? "bg-primary text-slate-950 hover:bg-primary/90" : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5"
                            )}
                        >
                            {statusFilter === 'submitted' ? (
                                <><PenTool size={16} className="mr-2" /> Noter le devoir</>
                            ) : (
                                "Réviser la note"
                            )}
                        </Button>
                    </div>
                ))}
            </div>
        ) : (
            <div className="py-24 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-20">
                <ClipboardCheck className="h-16 w-16 mx-auto mb-4 text-slate-700" />
                <p className="font-black uppercase tracking-widest text-xs">Aucun devoir à traiter</p>
            </div>
        )}
      </main>
    </div>
  );
}
