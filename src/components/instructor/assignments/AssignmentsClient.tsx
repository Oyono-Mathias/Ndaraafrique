'use client';

/**
 * @fileOverview Gestionnaire de corrections Android-First.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ClipboardCheck, Loader2, Clock, History, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GradingModal } from './GradingModal';
import type { AssignmentSubmission, Course } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AssignmentsClient() {
  const db = getFirestore();
  const { currentUser } = useRole();
  const [statusFilter, setStatusFilter] = useState<'submitted' | 'graded'>('submitted');
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Récupérer toutes les soumissions (Tri en mémoire pour stabilité)
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

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      <GradingModal submission={selectedSubmission} isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
      
      <header className="flex flex-col gap-6">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
            <button 
                onClick={() => setStatusFilter('submitted')}
                className={cn(
                    "flex-shrink-0 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                    statusFilter === 'submitted' ? "bg-primary text-slate-950 shadow-lg" : "bg-slate-900 border border-white/5 text-slate-500"
                )}
            >
                À Corriger ({rawSubmissions?.filter(s => s.status === 'submitted').length || 0})
            </button>
            <button 
                onClick={() => setStatusFilter('graded')}
                className={cn(
                    "flex-shrink-0 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                    statusFilter === 'graded' ? "bg-primary text-slate-950 shadow-lg" : "bg-slate-900 border border-white/5 text-slate-500"
                )}
            >
                Historique Noté
            </button>
        </div>
      </header>

      <main className="space-y-4">
        {isLoading ? (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[2rem] bg-slate-900" />)}
            </div>
        ) : filteredSubmissions.length > 0 ? (
            <div className="grid gap-4">
                {filteredSubmissions.map(sub => (
                    <div key={sub.id} className="bg-slate-900 border border-white/5 rounded-[2rem] p-4 flex items-center gap-4 shadow-xl active:scale-[0.98] transition-all group">
                        <Avatar className="h-14 w-14 border-2 border-white/10 shadow-lg">
                            <AvatarImage src={sub.studentAvatarUrl} />
                            <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                                {sub.studentName?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-black text-white text-[15px] truncate uppercase tracking-tight">{sub.studentName}</h3>
                                {statusFilter === 'submitted' && (
                                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                )}
                            </div>
                            <p className="text-slate-400 text-xs font-medium truncate italic leading-relaxed">"{sub.assignmentTitle}"</p>
                            <div className="flex items-center gap-2 mt-2">
                                <History size={10} className="text-slate-600" />
                                <span className="text-[9px] font-black text-slate-600 uppercase">
                                    Remis {(sub.submittedAt as any)?.toDate ? formatDistanceToNow((sub.submittedAt as any).toDate(), { locale: fr, addSuffix: true }) : 'récemment'}
                                </span>
                            </div>
                        </div>

                        <Button 
                            onClick={() => handleGradeClick(sub)}
                            className="h-12 px-6 rounded-2xl bg-primary text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-90 transition-transform"
                        >
                            {statusFilter === 'graded' ? 'Réviser' : 'Noter'}
                        </Button>
                    </div>
                ))}
            </div>
        ) : (
            <div className="py-24 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-20">
                <ClipboardCheck className="h-16 w-16 mx-auto mb-4 text-slate-700" />
                <p className="font-black uppercase tracking-widest text-xs">Tout est à jour !</p>
            </div>
        )}
      </main>
    </div>
  );
}
