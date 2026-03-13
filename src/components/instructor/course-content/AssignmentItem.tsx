'use client';

import { useState } from 'react';
import type { Assignment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ClipboardList, Pencil, Trash2, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteAssignment } from '@/actions/assignmentActions';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { AssignmentFormModal } from './forms/AssignmentFormModal';

export function AssignmentItem({ courseId, sectionId, assignment }: { courseId: string; sectionId: string; assignment: Assignment }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = async () => {
    const result = await deleteAssignment({ courseId, sectionId, assignmentId: assignment.id });
    if(result.success) toast({ title: 'Devoir supprimé' });
    else toast({ variant: 'destructive', title: 'Erreur', description: result.error });
  };

  return (
    <>
      <AssignmentFormModal
        isOpen={isEditing}
        onOpenChange={setIsEditing}
        courseId={courseId}
        sectionId={sectionId}
        assignment={assignment}
      />
      <div className="group bg-ndara-bg rounded-3xl p-3 border border-white/5 flex items-center gap-3 active:scale-[0.98] transition-all shadow-lg hover:border-primary/20">
        <div className="text-slate-700"><GripVertical size={16} /></div>
        
        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0 shadow-inner">
            <ClipboardList size={18} />
        </div>
        
        <div className="flex-1 min-w-0">
            <p className="font-black text-white text-[13px] truncate uppercase tracking-tight">{assignment.title}</p>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">Devoir à rendre</p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/5 text-slate-500" onClick={() => setIsEditing(true)}>
            <Pencil size={14} />
          </Button>
          <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-red-500/50 hover:text-red-500">
                    <Trash2 size={14} />
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-slate-800 rounded-[2rem]">
                  <AlertDialogHeader><AlertDialogTitle className="text-white font-black uppercase tracking-tight">Supprimer le devoir ?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel className="bg-slate-800 border-none rounded-xl font-bold uppercase text-[10px]">Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase text-[10px]">Supprimer</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
}
