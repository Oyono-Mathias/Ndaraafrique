
'use client';

import { useState, useMemo, useTransition } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import { reorderLectures } from '@/actions/lectureActions';
import type { Section, Lecture, Quiz, Assignment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GripVertical, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { LectureItem } from './LectureItem';
import { SectionForm } from './forms/SectionForm';
import { LectureFormModal } from './forms/LectureForm';
import { QuizFormModal } from './forms/QuizFormModal';
import { AssignmentFormModal } from './forms/AssignmentFormModal';
import { deleteSection } from '@/actions/sectionActions';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { QuizItem } from './QuizItem';
import { AssignmentItem } from './AssignmentItem';

export function SectionItem({ courseId, section, dragHandleProps }: { courseId: string; section: Section; dragHandleProps: any }) {
  const db = getFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isLectureModalOpen, setIsLectureModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const lecturesQuery = useMemo(() => query(collection(db, 'courses', courseId, 'sections', section.id, 'lectures'), orderBy('order', 'asc')), [db, courseId, section.id]);
  const { data: lectures, isLoading: lecturesLoading } = useCollection<Lecture>(lecturesQuery);

  const quizzesQuery = useMemo(() => query(collection(db, 'courses', courseId, 'sections', section.id, 'quizzes'), orderBy('createdAt', 'asc')), [db, courseId, section.id]);
  const { data: quizzes, isLoading: quizzesLoading } = useCollection<Quiz>(quizzesQuery);

  const assignmentsQuery = useMemo(() => query(collection(db, 'courses', courseId, 'sections', section.id, 'assignments'), orderBy('createdAt', 'asc')), [db, courseId, section.id]);
  const { data: assignments, isLoading: assignmentsLoading } = useCollection<Assignment>(assignmentsQuery);


  const onDragEnd: OnDragEndResponder = (result) => {
    const { destination, source, type } = result;
    if (!destination || !lectures || type !== 'LECTURE') return;

    if (source.droppableId === destination.droppableId && source.index !== destination.index) {
        const items = Array.from(lectures);
        const [reorderedItem] = items.splice(source.index, 1);
        items.splice(destination.index, 0, reorderedItem);

        const newOrder = items.map((item, index) => ({ id: item.id, order: index }));
        
        startTransition(async () => {
            await reorderLectures({ courseId, sectionId: section.id, orderedLectures: newOrder });
        });
    }
  };

  const handleDelete = () => {
    startTransition(async () => {
        const result = await deleteSection({ courseId, sectionId: section.id });
        if(result.success) toast({ title: 'Section supprimée' });
        else toast({ variant: 'destructive', title: 'Erreur', description: result.error });
    });
  }

  const isLoading = lecturesLoading || quizzesLoading || assignmentsLoading;

  return (
    <>
      <LectureFormModal isOpen={isLectureModalOpen} onOpenChange={setIsLectureModalOpen} courseId={courseId} sectionId={section.id} />
      <QuizFormModal isOpen={isQuizModalOpen} onOpenChange={setIsQuizModalOpen} courseId={courseId} sectionId={section.id} />
      <AssignmentFormModal isOpen={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen} courseId={courseId} sectionId={section.id} />

      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between p-3 border-b dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div {...dragHandleProps}>
              <GripVertical className="h-5 w-5 text-slate-400 cursor-grab" />
            </div>
            {isEditing ? (
                <SectionForm courseId={courseId} section={section} onDone={() => setIsEditing(false)} />
            ) : (
                <CardTitle className="text-base font-bold text-white">{section.title}</CardTitle>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}><Pencil className="h-4 w-4" /></Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Supprimer la section ?</AlertDialogTitle><AlertDialogDescription>Toutes les leçons de cette section seront supprimées. Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId={section.id} type="LECTURE">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-slate-800 rounded-md p-1' : ''}`}
                  >
                      {lectures?.map((lecture, index) => (
                           <Draggable key={lecture.id} draggableId={lecture.id} index={index}>
                              {(provided) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                      <LectureItem courseId={courseId} sectionId={section.id} lecture={lecture} />
                                  </div>
                              )}
                          </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}

           <div className="space-y-2">
            {quizzes?.map(quiz => <QuizItem key={quiz.id} courseId={courseId} sectionId={section.id} quiz={quiz} />)}
            {assignments?.map(assignment => <AssignmentItem key={assignment.id} courseId={courseId} sectionId={section.id} assignment={assignment} />)}
           </div>

           <div className="flex gap-2 pt-2 border-t border-dashed border-slate-700">
                <Button variant="outline" className="flex-1" onClick={() => setIsLectureModalOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Leçon
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsQuizModalOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Quiz
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsAssignmentModalOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Devoir
                </Button>
            </div>
        </CardContent>
      </Card>
    </>
  );
}
