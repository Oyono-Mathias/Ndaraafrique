
'use client';

import { useState, useMemo, useTransition } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import { reorderLectures } from '@/actions/lectureActions';
import type { Section, Lecture } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GripVertical, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { LectureItem } from './LectureItem';
import { SectionForm } from './forms/SectionForm';
import { LectureFormModal } from './forms/LectureForm';
import { deleteSection } from '@/actions/sectionActions';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';


export function SectionItem({ courseId, section, dragHandleProps }: { courseId: string; section: Section; dragHandleProps: any }) {
  const db = getFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isLectureModalOpen, setIsLectureModalOpen] = useState(false);

  const lecturesQuery = useMemo(
    () => query(collection(db, 'courses', courseId, 'sections', section.id, 'lectures'), orderBy('order', 'asc')),
    [db, courseId, section.id]
  );
  const { data: lectures, isLoading: lecturesLoading } = useCollection<Lecture>(lecturesQuery);

  const onDragEnd = (result: any) => {
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

  return (
    <>
      <LectureFormModal
        isOpen={isLectureModalOpen}
        onOpenChange={setIsLectureModalOpen}
        courseId={courseId}
        sectionId={section.id}
      />
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
          {lecturesLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <Droppable droppableId={section.id} type="LECTURE">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-slate-800 rounded-md' : ''}`}
                >
                    {lectures?.map((lecture, index) => (
                         <Draggable key={lecture.id} draggableId={lecture.id} index={index}>
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                >
                                    <LectureItem courseId={courseId} sectionId={section.id} lecture={lecture} />
                                </div>
                            )}
                        </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}

          <Button variant="outline" className="w-full" onClick={() => setIsLectureModalOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Ajouter une leçon
          </Button>
           <div className="flex gap-2 pt-2 border-t border-dashed border-slate-700">
                <Button variant="secondary" className="flex-1 opacity-50 cursor-not-allowed">Ajouter un Quiz</Button>
                <Button variant="secondary" className="flex-1 opacity-50 cursor-not-allowed">Ajouter un Devoir</Button>
            </div>
        </CardContent>
      </Card>
    </>
  );
}

