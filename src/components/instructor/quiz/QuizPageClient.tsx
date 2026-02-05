
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, collectionGroup, getDocs } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Plus, FileQuestion, Search } from 'lucide-react';
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

  // 1. Récupération des cours pour le formulaire
  const coursesQuery = useMemo(
    () => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: courses } = useCollection<Course>(coursesQuery);

  // 2. Récupération de tous les quiz de l'instructeur via collectionGroup
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-6">
      <QuizFormModal 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        quiz={editingQuiz} 
        courses={courses || []} 
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Chercher un quiz..." 
            className="pl-10 h-12 bg-slate-900 border-slate-800 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto h-12 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5" /> Nouveau Quiz
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl bg-slate-900" />)}
        </div>
      ) : filteredQuizzes.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map(quiz => (
            <QuizCard key={quiz.id} quiz={quiz} onEdit={() => handleEdit(quiz)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-800">
          <FileQuestion className="h-12 w-12 mb-4 text-slate-700" />
          <h3 className="text-lg font-bold text-white uppercase">Aucun quiz trouvé</h3>
          <p className="text-slate-500 text-sm mt-1">Créez votre première évaluation pour vos cours.</p>
        </div>
      )}
    </div>
  );
}
