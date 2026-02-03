'use client';

/**
 * @fileOverview Page récapitulative des résultats de quiz pour l'étudiant.
 * Affiche l'historique des scores, permet de consulter les certificats
 * et propose l'aide de MATHIAS en cas de difficulté.
 */

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, getFirestore, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, MessageSquare, Award, Clock, ArrowRight, Frown, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function StudentResultsPage() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();

  // 1. Récupération des soumissions de quiz de l'étudiant
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
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <header>
        <h1 className="text-3xl font-bold text-white">Mes Résultats de Quiz</h1>
        <p className="text-slate-400 mt-1">Analysez vos performances et progressez vers l'excellence.</p>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full bg-slate-800/50 rounded-xl" />
          ))}
        </div>
      ) : results && results.length > 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-800 bg-slate-800/30">
                  <TableHead className="text-slate-400 font-bold uppercase tracking-wider py-4">Quiz / Formation</TableHead>
                  <TableHead className="text-slate-400 font-bold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-center">Score</TableHead>
                  <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => {
                  const scoreValue = result.score || 0;
                  const isSuccess = scoreValue >= 70;
                  // ✅ Sécurisation de la date Firestore pour le build Vercel
                  const submittedAt = (result.submittedAt as any)?.toDate?.() || new Date();
                  
                  return (
                    <TableRow key={result.id} className="border-slate-800 hover:bg-slate-800/40 transition-all duration-200">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-100 text-base">{result.quizTitle}</span>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                            <BookOpen className="h-3 w-3" />
                            <span>Cours associé: {result.courseTitle || 'Formation Ndara'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          {format(submittedAt, 'dd MMM yyyy', { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={cn(
                            "px-3 py-1 text-sm font-black border-none",
                            isSuccess 
                              ? "bg-green-500/20 text-green-400" 
                              : "bg-red-500/20 text-red-400"
                          )}
                        >
                          {scoreValue}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-3">
                          {!isSuccess ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              asChild 
                              className="h-9 border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                            >
                              <Link href={`/student/tutor?query=${encodeURIComponent(`Bonjour Mathias, j'ai obtenu ${scoreValue}% au quiz "${result.quizTitle}". Peux-tu m'expliquer mes erreurs et m'aider à progresser ?`)}`}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Discuter avec Mathias</span>
                                <span className="sm:hidden">Aide</span>
                              </Link>
                            </Button>
                          ) : (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              asChild 
                              className="h-9 bg-primary/20 text-primary hover:bg-primary/30 font-bold"
                            >
                              <Link href="/student/mes-certificats">
                                <Award className="h-4 w-4 mr-2" />
                                Certificat
                              </Link>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild className="h-9 text-slate-400 hover:text-white group">
                            <Link href={`/student/courses/${result.courseId}`}>
                              Voir cours
                              <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card className="bg-slate-900/40 border-slate-800 border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="p-4 bg-slate-800/50 rounded-full mb-6">
              <Frown className="h-16 w-16 text-slate-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-200">Aucun résultat disponible</h3>
            <p className="text-slate-500 mt-2 max-w-sm text-center">
              Vous n'avez pas encore complété d'évaluations. Vos scores et analyses apparaîtront ici après vos premiers quiz.
            </p>
            <Button asChild className="mt-8 px-8 py-6 text-lg font-bold shadow-lg shadow-primary/20">
              <Link href="/student/mes-formations">
                Commencer à apprendre
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}