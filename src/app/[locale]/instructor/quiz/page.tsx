
'use client';

import { useState, useMemo, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { PlusCircle, MoreVertical, Edit, BarChart2, Frown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

import type { Course, Quiz } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QuizWithCourse extends Quiz {
  courseTitle: string;
}

const QuizCard = ({ quiz }: { quiz: QuizWithCourse }) => {
  const { toast } = useToast();

  const handleAction = () => {
    toast({
      title: "Fonctionnalité en cours de développement",
      description: "Cette action sera bientôt disponible.",
    })
  }

  return (
    <Card className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 flex flex-col">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-800 dark:text-white line-clamp-2">{quiz.title}</CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">{quiz.courseTitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>{quiz.questionsCount || 0} questions</span>
          <span>
  {quiz.createdAt && typeof (quiz.createdAt as any).toDate === 'function' 
    ? format((quiz.createdAt as any).toDate(), "d MMM yyyy", { locale: fr }) 
    : "Date inconnue"}
</span>
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
            <DropdownMenuItem onClick={handleAction}>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAction}>
              <BarChart2 className="mr-2 h-4 w-4" />
              Statistiques
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  )
}

const CreateQuizDialog = ({ isOpen, onOpenChange, courses }: { isOpen: boolean, onOpenChange: (open: boolean) => void, courses: Course[] }) => {
    const { toast } = useToast();
    const handleComingSoon = () => {
        toast({
            title: "Bientôt disponible",
            description: "La création de quiz est en cours de développement.",
        })
    }
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle>Créer un nouveau quiz</DialogTitle>
                    <DialogDescription>
                        Remplissez les détails ci-dessous. Vous pourrez ajouter les questions à l'étape suivante.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Titre du quiz</label>
                        <Input placeholder="Ex: Quiz final sur le HTML" />
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Cours associé</label>
                        <Select>
                          <SelectTrigger><SelectValue placeholder="Sélectionnez un cours"/></SelectTrigger>
                          <SelectContent>
                            {courses.map(course => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Annuler</Button></DialogClose>
                    <Button onClick={handleComingSoon}>Créer le quiz</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function QuizPage() {
  const db = getFirestore();
  const { currentUser } = useRole();
  const [quizzes, setQuizzes] = useState<QuizWithCourse[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);

    const fetchQuizzes = async () => {
      const coursesQuery = query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid));
      const coursesSnapshot = await getDocs(coursesQuery);
      const instructorCourses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(instructorCourses);
      const courseMap = new Map(instructorCourses.map(c => [c.id, c.title]));

      if (instructorCourses.length === 0) {
        setQuizzes([]);
        setIsLoading(false);
        return;
      }
      
      const allQuizzes: QuizWithCourse[] = [];
      const quizPromises = instructorCourses.map(course => {
        const quizQuery = query(collection(db, `courses/${course.id}/quizzes`));
        return getDocs(quizQuery);
      });
      
      const quizSnapshots = await Promise.all(quizPromises);

      quizSnapshots.forEach((quizSnapshot, index) => {
        const courseId = instructorCourses[index].id;
        quizSnapshot.forEach(doc => {
          allQuizzes.push({
            ...(doc.data() as Quiz),
            id: doc.id,
            courseTitle: courseMap.get(courseId) || 'Cours inconnu',
          });
        });
      });

      const augmentedQuizzes = allQuizzes.map(q => ({
          ...q,
          questionsCount: q.questionsCount || 0
      }));

      setQuizzes(augmentedQuizzes.sort((a,b) => (b.createdAt?.toDate()?.getTime() || 0) - (a.createdAt?.toDate()?.getTime() || 0)));
      setIsLoading(false);
    };

    fetchQuizzes();
  }, [currentUser, db]);

  return (
    <>
    <CreateQuizDialog isOpen={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} courses={courses} />
    <div className="space-y-8 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Quiz</h1>
            <p className="text-slate-500 dark:text-slate-400">Évaluez les connaissances de vos étudiants.</p>
        </div>
         <Button onClick={() => setIsCreateDialogOpen(true)} className="h-11 shadow-lg shadow-primary/20">
            <PlusCircle className="mr-2 h-5 w-5" />
            Créer un nouveau quiz
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
            <h3 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-300">Aucun quiz créé pour le moment</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">Commencez par créer votre premier quiz pour évaluer vos étudiants.</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-6">
                <PlusCircle className="mr-2 h-4 w-4" />
                Créer votre premier quiz
            </Button>
        </div>
      )}
    </div>
    </>
  );
}
