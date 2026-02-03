'use client';

/**
 * @fileOverview Liste des quiz créés par l'instructeur.
 * Permet de visualiser le nombre de questions et de rediriger vers l'édition.
 */

export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { PlusCircle, MoreVertical, Edit, BarChart2, Frown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';
import type { Course, Quiz } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface QuizWithCourse extends Quiz {
  courseTitle: string;
}

const QuizCard = ({ quiz }: { quiz: QuizWithCourse }) => {
  const router = useRouter();
  const dateObj = (quiz.createdAt as any)?.toDate?.() || new Date();

  return (
    <Card className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 flex flex-col">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-800 dark:text-white line-clamp-2">{quiz.title}</CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">{quiz.courseTitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>ID: {quiz.id.substring(0, 8)}</span>
          <span>{format(dateObj, "d MMM yyyy", { locale: fr })}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end p-2 border-t border-slate-100 dark:border-slate-700/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/instructor/courses/edit/${quiz.courseId}?tab=content`)}>
              <Edit className="mr-2 h-4 w-4" />
              Éditer dans le cours
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <BarChart2 className="mr-2 h-4 w-4" />
              Résultats (Bientôt)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
};

export default function QuizPage() {
  const db = getFirestore();
  const { currentUser, isUserLoading } = useRole();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const fetchQuizzes = async () => {
      setIsLoading(true);
      try {
        const coursesQuery = query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid));
        const coursesSnapshot = await getDocs(coursesQuery);
        const instructorCourses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const courseMap = new Map(instructorCourses.map(c => [c.id, c.title]));

        if (instructorCourses.length === 0) {
          setQuizzes([]);
          setIsLoading(false);
          return;
        }
        
        const allQuizzes: QuizWithCourse[] = [];
        // Utilisation de queryCollectionGroup ou itération sur les cours
        for (const course of instructorCourses) {
            const quizQuery = query(collection(db, `courses/${course.id}/quizzes`));
            const quizSnap = await getDocs(quizQuery);
            quizSnap.forEach(d => {
                allQuizzes.push({
                    ...(d.data() as Quiz),
                    id: d.id,
                    courseTitle: courseMap.get(course.id) || 'Inconnu',
                    courseId: course.id
                });
            });
        }

        setQuizzes(allQuizzes.sort((a, b) => {
          const dateB = (b.createdAt as any)?.toDate?.()?.getTime() || 0;
          const dateA = (a.createdAt as any)?.toDate?.()?.getTime() || 0;
          return dateB - dateA;
        }));
      } catch (error) {
        console.error("Error fetching quizzes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzes();
  }, [currentUser, db]);

  if (isUserLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;

  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Mes Quiz</h1>
            <p className="text-slate-500 dark:text-slate-400">Gérez les évaluations de vos cours.</p>
        </div>
         <Button onClick={() => router.push('/instructor/courses')} className="h-11">
            <PlusCircle className="mr-2 h-5 w-5" />
            Nouveau Quiz (via Éditeur de Cours)
         </Button>
      </header>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
        </div>
      ) : quizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {quizzes.map(quiz => <QuizCard key={quiz.id} quiz={quiz} />)}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl mt-10 flex flex-col items-center">
            <Frown className="mx-auto h-16 w-16 text-slate-400" />
            <h3 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-300">Aucun quiz trouvé</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">Ajoutez des quiz à vos cours via l'éditeur de contenu pour évaluer vos étudiants.</p>
            <Button variant="outline" onClick={() => router.push('/instructor/courses')} className="mt-6">
                Aller à mes cours
            </Button>
        </div>
      )}
    </div>
  );
}
