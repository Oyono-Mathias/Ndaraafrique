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
import { Reply, Frown, Clock, MessageSquare, BookOpen } from 'lucide-react';
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

  // 1. Récupérer les cours
  const coursesQuery = useMemo(
    () => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  // 2. Récupérer les questions (collection 'questions')
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

  const isLoading = coursesLoading || questionsLoading;

  return (
    <>
      <ReplyModal question={selectedQuestion} isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
      
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-6">
          
          {/* --- FILTRES --- */}
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-1.5 w-full sm:w-[250px]">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Par Formation</label>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl">
                    <SelectValue placeholder="Filtrer par cours..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Toutes mes formations</SelectItem>
                    {courses?.map(course => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
                </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-1.5 w-full sm:w-[180px]">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Statut</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl">
                    <SelectValue placeholder="Statut..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tous les messages</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="answered">Répondus</SelectItem>
                </SelectContent>
                </Select>
            </div>
          </div>
          
          {/* --- LISTE DES QUESTIONS --- */}
          {isLoading ? (
            <div className="space-y-4 pt-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
            </div>
          ) : filteredQuestions.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4 pt-4">
                {filteredQuestions.map(q => {
                    const questionDate = (q.createdAt as any)?.toDate?.();
                    const isAnswered = q.status === 'answered';
                    
                    return (
                     <AccordionItem key={q.id} value={q.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm group">
                        <AccordionTrigger className="p-5 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                            <div className="flex-1 text-left space-y-3">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-700">
                                        <AvatarImage src={q.studentAvatarUrl} />
                                        <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">{q.studentName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">{q.studentName}</span>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                                            <BookOpen className="h-2.5 w-2.5" />
                                            {q.courseTitle}
                                        </span>
                                    </div>
                                </div>
                                <p className="font-medium text-slate-700 dark:text-slate-200 leading-relaxed pr-4">"{q.questionText}"</p>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {questionDate ? formatDistanceToNow(questionDate, { locale: fr, addSuffix: true }) : 'Récemment'}
                                    </div>
                                </div>
                            </div>
                            <Badge className={cn(
                                "ml-4 font-black text-[9px] uppercase border-none px-3",
                                !isAnswered ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'
                            )}>
                                {!isAnswered ? 'À répondre' : 'Répondu'}
                            </Badge>
                        </AccordionTrigger>
                        <AccordionContent className="p-5 pt-0 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800">
                            <div className="mt-5 space-y-4">
                                {isAnswered && q.answerText && (
                                    <div className="p-4 bg-primary/5 border-l-4 border-primary rounded-r-xl">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Votre réponse professionnelle :</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{q.answerText}</p>
                                    </div>
                                )}
                                <div className="flex justify-end pt-2">
                                    <Button 
                                        size="sm" 
                                        onClick={(e) => { e.stopPropagation(); handleReplyClick(q); }}
                                        className="h-10 px-6 rounded-xl font-bold gap-2"
                                    >
                                        <Reply className="h-4 w-4"/>
                                        {isAnswered ? 'Modifier la réponse' : 'Envoyer ma réponse'}
                                    </Button>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )})}
            </Accordion>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center opacity-30">
                <MessageSquare className="h-16 w-16 text-slate-400 mb-4" />
                <p className="font-black uppercase text-xs tracking-widest">Aucune question à afficher</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
