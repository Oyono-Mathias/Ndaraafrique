'use client';

/**
 * @fileOverview Gestionnaire de Quiz pour les formateurs (Android-First).
 * Liste et création simplifiée avec interface premium.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, collectionGroup, getDocs } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Plus, FileQuestion, Search, Sparkles, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { QuizCard } from './QuizCard';
import { QuizFormModal } from './QuizFormModal';
import type { Quiz, Course } from '@/lib/types';

export function QuizPageClient() {
  const db = getFirestore();
  const { currentUser } = useRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Récupération des cours pour le formulaire
  const coursesQuery = useMemo(
    () => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: courses } = useCollection<Course>(coursesQuery);

  // 2. Récupération de tous les quiz de l'instructeur
  useEffect(() => {
    if (!currentUser) return;

    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        const q = query(collectionGroup(db, 'quizzes'), where('instructorId', '==', currentUser.uid));
        const snap = await getDocs(q);
        setQuizzes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quiz)));
      } catch (e) {
        console.error("Error fetching quizzes:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [currentUser, db]);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q => q.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [quizzes, searchTerm]);

  const handleEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingQuiz(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <QuizFormModal 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        quiz={editingQuiz} 
        courses={courses || []} 
      />

      <header className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Chercher un quiz..." 
            className="pl-12 h-14 bg-slate-900 border-slate-800 rounded-2xl text-white shadow-xl focus-visible:ring-primary/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
            onClick={handleCreate} 
            className="w-full sm:w-auto h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/20 gap-3"
        >
          <Plus className="h-5 w-5" /> Nouveau Quiz
        </Button>
      </header>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-[2.5rem] bg-slate-900 border border-slate-800" />
          ))}
        </div>
      ) : filteredQuizzes.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map(quiz => (
            <QuizCard key={quiz.id} quiz={quiz} onEdit={() => handleEdit(quiz)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800">
          <div className="p-6 bg-slate-800/50 rounded-full mb-6">
            <FileQuestion className="h-16 w-16 text-slate-700" />
          </div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tight">Aucun quiz créé</h3>
          <p className="text-slate-500 mt-2 max-w-xs mx-auto font-medium leading-relaxed">
            Boostez l'engagement de vos élèves en ajoutant des évaluations interactives.
          </p>
          <Button onClick={handleCreate} className="mt-8 rounded-xl h-12 px-8 bg-slate-800 hover:bg-slate-700 text-white font-bold gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Créer mon premier quiz
          </Button>
        </div>
      )}
    </div>
  );
}
