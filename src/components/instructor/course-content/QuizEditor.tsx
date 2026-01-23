
'use client';

import { useState, useMemo, useTransition } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Trash2, GripVertical, FileQuestion } from 'lucide-react';
import { QuestionFormModal } from './forms/QuestionFormModal';
import { deleteQuestion, reorderQuestions } from '@/actions/questionActions';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';

const QuestionPill = ({ question, onEdit, onDelete }: { question: Question, onEdit: () => void, onDelete: () => void }) => {
    return (
        <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-md border border-slate-700">
            <GripVertical className="h-5 w-5 text-slate-500 cursor-grab flex-shrink-0" />
            <p className="flex-1 text-sm text-slate-300 truncate">{question.text}</p>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
             <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Supprimer cette question ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </div>
    )
}

export function QuizEditor({ courseId, sectionId, quizId }: { courseId: string; sectionId: string; quizId: string; }) {
    const db = getFirestore();
    const [isPending, startTransition] = useTransition();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    const questionsQuery = useMemo(() => query(collection(db, 'courses', courseId, 'sections', sectionId, 'quizzes', quizId, 'questions'), orderBy('order', 'asc')), [db, courseId, sectionId, quizId]);
    const { data: questions, isLoading } = useCollection<Question>(questionsQuery);
    
    const onDragEnd: OnDragEndResponder = (result) => {
        if (!result.destination || !questions) return;
        
        const items = Array.from(questions);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        const newOrder = items.map((item, index) => ({ id: item.id, order: index }));
        
        startTransition(async () => {
            await reorderQuestions({ courseId, sectionId, quizId, orderedQuestions: newOrder });
        });
    };

    const handleEdit = (question: Question) => {
        setEditingQuestion(question);
        setIsModalOpen(true);
    };
    
    const handleAdd = () => {
        setEditingQuestion(null);
        setIsModalOpen(true);
    }
    
    const handleDelete = async (questionId: string) => {
        await deleteQuestion({ courseId, sectionId, quizId, questionId });
    }

    return (
        <>
            <QuestionFormModal
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                courseId={courseId}
                sectionId={sectionId}
                quizId={quizId}
                question={editingQuestion}
            />
            <div className="space-y-3">
                {questions && questions.length > 0 ? (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="questions">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                    {questions.map((q, index) => (
                                        <Draggable key={q.id} draggableId={q.id} index={index}>
                                            {(provided) => (
                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                                    <QuestionPill question={q} onEdit={() => handleEdit(q)} onDelete={() => handleDelete(q.id)} />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                ) : !isLoading && (
                    <div className="text-center text-sm text-slate-500 py-4">
                        <FileQuestion className="mx-auto h-8 w-8 text-slate-600 mb-2"/>
                        Ce quiz est vide. Ajoutez votre première question !
                    </div>
                )}
                 <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Ajouter une question
                </Button>
            </div>
        </>
    );
}
