'use client';

import { useState } from 'react';
import type { Quiz } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, HelpCircle, GripVertical } from 'lucide-react';
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
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={quiz.id} className="border-none bg-ndara-bg rounded-3xl border border-white/5 overflow-hidden shadow-lg group">
          <AccordionTrigger className="p-3 hover:no-underline active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-slate-700"><GripVertical size={16} /></div>
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0 shadow-inner">
                    <HelpCircle size={18} />
                </div>
                <div className="text-left min-w-0">
                    <p className="font-black text-white text-[13px] uppercase tracking-tight truncate">{quiz.title}</p>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">Quiz d'Évaluation</p>
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}><Pencil size={14} /></Button>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-red-500/50 hover:text-red-500" onClick={(e) => e.stopPropagation()}><Trash2 size={14} /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-900 border-slate-800 rounded-[2rem]">
                      <AlertDialogHeader><AlertDialogTitle className="text-white font-black uppercase tracking-tight">Supprimer le quiz ?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Toutes les questions seront perdues.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel className="bg-slate-800 border-none rounded-xl font-bold uppercase text-[10px]">Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase text-[10px]">Supprimer</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-black/20 border-t border-white/5">
            <QuizEditor courseId={courseId} sectionId={sectionId} quizId={quiz.id} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}
