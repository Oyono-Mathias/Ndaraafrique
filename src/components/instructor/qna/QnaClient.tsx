
'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Reply, Frown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ReplyModal } from './ReplyModal';
import type { CourseQuestion, Course } from '@/lib/types';
import { cn } from '@/lib/utils';

export function QnaClient() {
  const db = getFirestore();
  const { currentUser } = useRole();
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedQuestion, setSelectedQuestion] = useState<CourseQuestion | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const coursesQuery = useMemo(
    () => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const questionsQuery = useMemo(
    () => currentUser ? query(collection(db, 'questions'), where('instructorId', '==', currentUser.uid), orderBy('createdAt', 'desc')) : null,
    [db, currentUser]
  );
  const { data: allQuestions, isLoading: questionsLoading } = useCollection<CourseQuestion>(questionsQuery);

  const filteredQuestions = useMemo(() => {
    if (!allQuestions) return [];
    return allQuestions.filter(q => {
      const courseMatch = courseFilter === 'all' || q.courseId === courseFilter;
      const statusMatch = statusFilter === 'all' || q.status === statusFilter;
      return courseMatch && statusMatch;
    });
  }, [allQuestions, courseFilter, statusFilter]);

  const handleReplyClick = (question: CourseQuestion) => {
    setSelectedQuestion(question);
    setIsModalOpen(true);
  };

  const getStatusVariant = (status: CourseQuestion['status']) => {
    return status === 'pending' ? 'warning' : 'success';
  };

  const isLoading = coursesLoading || questionsLoading;

  return (
    <>
      <ReplyModal question={selectedQuestion} isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
      
      <Card className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-[250px] h-11 text-base bg-white dark:bg-slate-800"><SelectValue placeholder="Filtrer par cours..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les cours</SelectItem>
                {courses?.map(course => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-11 text-base bg-white dark:bg-slate-800"><SelectValue placeholder="Filtrer par statut..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="answered">Répondu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {isLoading ? (
            <div className="space-y-3 pt-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />)}
            </div>
          ) : filteredQuestions.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-3 pt-4">
                {filteredQuestions.map(q => (
                     <AccordionItem key={q.id} value={q.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800/50 shadow-sm">
                        <AccordionTrigger className="p-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/50 [&[data-state=open]>svg.chevron]:text-primary">
                            <div className="flex-1 text-left space-y-1">
                                <p className="font-semibold text-slate-800 dark:text-white">{q.questionText}</p>
                                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-muted-foreground">
                                    <span>{q.courseTitle}</span>
                                    <span>•</span>
                                    <span>{q.studentName}</span>
                                </div>
                            </div>
                            <Badge variant={getStatusVariant(q.status)} className={cn("ml-4 capitalize", q.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300')}>{q.status === 'pending' ? 'En attente' : 'Répondu'}</Badge>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0 bg-slate-50/50 dark:bg-slate-800/30">
                            {q.status === 'answered' && q.answerText && (
                                <div className="mb-4 p-3 border-l-4 border-green-500 bg-green-100/50 dark:bg-green-500/10 rounded-r-lg">
                                    <p className="font-semibold text-sm text-green-700 dark:text-green-300">Votre réponse :</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{q.answerText}</p>
                                </div>
                            )}
                             <Button size="sm" onClick={() => handleReplyClick(q)}>
                                <Reply className="mr-2 h-4 w-4"/>
                                {q.status === 'answered' ? 'Modifier la réponse' : 'Répondre'}
                            </Button>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl mt-4">
                <Frown className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Aucune question trouvée</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Les questions de vos étudiants apparaîtront ici.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
