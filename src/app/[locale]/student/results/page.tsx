
'use client';

/**
 * @fileOverview Page récapitulative des résultats de quiz pour l'étudiant.
 * Affiche l'historique des scores et propose l'aide de MATHIAS.
 */

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, getFirestore, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, MessageSquare, Clock, ArrowRight, Frown, BookOpen, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function StudentResultsPage() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();

  // 1. Récupération des soumissions de quiz
  const resultsQuery = useMemo(() => 
    currentUser?.uid 
      ? query(
          collection(db, 'quiz_submissions'), 
          where('studentId', '==', currentUser.uid),
          orderBy('submittedAt', 'desc')
        )
      : null,
    [db, currentUser]
  );

  const { data: results, isLoading: resultsLoading } = useCollection<any>(resultsQuery);

  const isLoading = isUserLoading || resultsLoading;

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
      <header className="px-4 pt-8 space-y-4">
        <div className="flex items-center gap-2 text-primary">
            <Trophy className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mes Performances</span>
        </div>
        <h1 className="text-3xl font-black text-white leading-tight">Mes <br/><span className="text-primary">Résultats</span></h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">Suivez votre progression et votre maîtrise des sujets.</p>
      </header>

      <div className="px-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-3xl bg-slate-900" />
            ))}
          </div>
        ) : results && results.length > 0 ? (
          <div className="grid gap-4">
            {results.map((result) => (
              <ResultItem key={result.id} result={result} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800/50">
            <div className="p-6 bg-slate-800/50 rounded-full mb-6">
              <Sparkles className="h-16 w-16 text-slate-700" />
            </div>
            <h3 className="text-xl font-black text-white leading-tight">Aucun quiz <br/>encore passé.</h3>
            <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-[220px] mx-auto font-medium">
              Terminez vos chapitres et validez vos acquis pour voir vos scores s'afficher ici.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultItem({ result }: { result: any }) {
  const date = (result.submittedAt as any)?.toDate?.() || new Date();
  const isSuccess = result.score >= 70;

  return (
    <Card className="bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl active:scale-[0.98] transition-all">
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 text-[9px] font-black text-primary uppercase tracking-widest mb-1">
              <BookOpen className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{result.courseTitle}</span>
            </div>
            <h3 className="text-sm font-bold text-white leading-snug">{result.quizTitle}</h3>
          </div>
          <div className="text-right">
            <p className={cn(
                "text-2xl font-black leading-none",
                isSuccess ? "text-green-400" : "text-amber-400"
            )}>
                {result.score}%
            </p>
            <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest mt-1">
                {isSuccess ? "Validé" : "À revoir"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase">
            <Clock className="h-3 w-3" />
            {format(date, 'dd MMM yyyy', { locale: fr })}
          </div>
          
          {!isSuccess ? (
            <Button variant="ghost" size="sm" asChild className="h-8 text-amber-500 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl font-black uppercase text-[9px] tracking-widest px-3">
              <Link href={`/student/tutor?query=${encodeURIComponent(`Bonjour Mathias, j'ai eu ${result.score}% au quiz "${result.quizTitle}". Peux-tu m'expliquer mes erreurs ?`)}`}>
                Aide Mathias <MessageSquare className="ml-1.5 h-3 w-3" />
              </Link>
            </Button>
          ) : (
            <Badge className="bg-green-500/10 text-green-500 border-none font-black text-[8px] uppercase px-3 py-1">
                Excellent
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
