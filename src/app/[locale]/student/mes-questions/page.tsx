'use client';

/**
 * @fileOverview Historique des questions posées par l'étudiant.
 * Affiche les échanges avec les instructeurs par cours.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MessageCircle, Clock, CheckCircle2, BookOpen, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import type { CourseQuestion } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function MesQuestionsPage() {
  const { currentUser } = useRole();
  const db = getFirestore();
  const [questions, setQuestions] = useState<CourseQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoading(true);
    const q = query(
      collection(db, 'questions'),
      where('studentId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as CourseQuestion)));
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching questions:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, db]);

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
      <header className="px-4 pt-8">
        <div className="flex items-center gap-2 text-primary mb-2">
            <MessageCircle className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Interactions</span>
        </div>
        <h1 className="text-3xl font-black text-white leading-tight">Mes <br/><span className="text-primary">Questions</span></h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">Suivez les réponses de vos tuteurs et formateurs.</p>
      </header>

      <div className="px-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton className="h-32 w-full rounded-3xl bg-slate-900" />)}
          </div>
        ) : questions.length > 0 ? (
          <div className="grid gap-4">
            {questions.map((q) => (
              <QuestionItem key={q.id} question={q} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center opacity-30">
            <MessageCircle className="h-16 w-16 mb-4 text-slate-600" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-500">Aucune question posée</p>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionItem({ question }: { question: CourseQuestion }) {
  const date = (question.createdAt as any)?.toDate?.() || new Date();
  const isAnswered = question.status === 'answered';

  return (
    <Card className="bg-slate-900/50 border-slate-800 overflow-hidden shadow-xl transition-all active:scale-[0.98]">
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
              <BookOpen className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{question.courseTitle}</span>
            </div>
            <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug italic">
              "{question.questionText}"
            </h3>
          </div>
          <Badge className={cn(
            "border-none text-[8px] font-black uppercase px-2 shrink-0",
            isAnswered ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"
          )}>
            {isAnswered ? "Répondu" : "En attente"}
          </Badge>
        </div>

        {isAnswered && (
          <div className="p-4 bg-primary/5 border-l-2 border-primary rounded-r-xl">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Réponse du formateur</p>
            <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
              {question.answerText}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-600 font-black uppercase">
            <Clock className="h-3 w-3" />
            {format(date, 'dd MMM yyyy', { locale: fr })}
          </div>
          <Button variant="ghost" size="sm" asChild className="h-7 text-primary font-black uppercase text-[9px] tracking-widest p-0">
            <Link href={`/student/courses/${question.courseId}`}>
              Voir le cours <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
