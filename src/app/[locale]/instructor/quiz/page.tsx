
'use client';

import { useState, useMemo, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot, orderBy, collectionGroup } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { PlusCircle, FileQuestion, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { QuizCard } from '@/components/instructor/quiz/QuizCard';
import { QuizFormModal } from '@/components/instructor/quiz/QuizFormModal';
import type { Quiz, Course } from '@/lib/types';

export default function InstructorQuizPage() {
  const db = getFirestore();
  const { currentUser, isUserLoading } = useRole();
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

  // 1. Récupérer les cours pour le formulaire de création
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
    });
    return () => unsub();
  }, [db, currentUser]);

  // 2. Récupérer tous les quiz via Collection Group (nécessite un index)
  // Fallback: Récupérer via les cours si l'index n'est pas prêt, mais ici on vise la performance
  useEffect(() => {
    if (!currentUser) return;
    
    // On utilise un champ instructorId sur le quiz pour filtrer facilement
    const q = query(collectionGroup(db, 'quizzes'), where('instructorId', '==', currentUser.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quizData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Quiz));
      
      // Tri manuel par date si l'index composite n'est pas encore créé
      setQuizzes(quizData.sort((a, b) => {
        const dateB = (b.createdAt as any)?.toDate?.()?.getTime() || 0;
        const dateA = (a.createdAt as any)?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      }));
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching quizzes:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, currentUser]);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q => q.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [quizzes, searchTerm]);

  const handleEdit = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedQuiz(null);
    setIsModalOpen(true);
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
      <QuizFormModal 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        quiz={selectedQuiz}
        courses={courses}
      />

      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gestion des Quiz</h1>
          <p className="text-slate-500 dark:text-slate-400">Créez et gérez les évaluations pour vos formations.</p>
        </div>
        <Button onClick={handleCreate} className="h-11 shadow-lg shadow-primary/20">
          <PlusCircle className="mr-2 h-5 w-5" />
          Nouveau Quiz
        </Button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          placeholder="Rechercher un quiz..."
          className="h-12 pl-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : filteredQuizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map(quiz => (
            <QuizCard key={quiz.id} quiz={quiz} onEdit={() => handleEdit(quiz)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl mt-10">
          <FileQuestion className="mx-auto h-16 w-16 text-slate-400" />
          <h3 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-300">Aucun quiz trouvé</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchTerm ? "Aucun résultat pour cette recherche." : "Commencez par créer votre première évaluation pour tester les connaissances de vos étudiants."}
          </p>
          {!searchTerm && (
            <Button onClick={handleCreate} variant="outline" className="mt-6">
              Créer mon premier quiz
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
