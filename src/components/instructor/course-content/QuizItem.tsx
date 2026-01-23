
'use client';

import { useState } from 'react';
import type { Quiz } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteQuiz } from '@/actions/quizActions';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { QuizFormModal } from './forms/QuizFormModal';
import { QuizEditor } from './QuizEditor';

export function QuizItem({ courseId, sectionId, quiz }: { courseId: string; sectionId: string; quiz: Quiz }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = async () => {
    const result = await deleteQuiz({ courseId, sectionId, quizId: quiz.id });
    if(result.success) toast({ title: 'Quiz supprimé' });
    else toast({ variant: 'destructive', title: 'Erreur', description: result.error });
  };

  return (
    <>
      <QuizFormModal
        isOpen={isEditing}
        onOpenChange={setIsEditing}
        courseId={courseId}
        sectionId={sectionId}
        quiz={quiz}
      />
      <Accordion type="single" collapsible className="w-full bg-slate-900 border border-slate-700/50 rounded-md">
        <AccordionItem value={quiz.id} className="border-b-0">
          <AccordionTrigger className="p-2 hover:no-underline rounded-t-md">
            <div className="flex-1 text-left font-medium text-sm text-slate-200 truncate">{quiz.title}</div>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}><Pencil className="h-4 w-4" /></Button>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Supprimer le quiz ?</AlertDialogTitle><AlertDialogDescription>Toutes les questions de ce quiz seront supprimées. Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-3 border-t border-slate-700/50">
            <QuizEditor courseId={courseId} sectionId={sectionId} quizId={quiz.id} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}
