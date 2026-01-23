
'use client';

import { useState } from 'react';
import type { Assignment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Pencil, Trash2 } from 'lucide-react';
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
      <div className="flex items-center p-2 rounded-md bg-slate-900 border border-slate-700/50">
        <ClipboardCheck className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0" />
        <span className="flex-1 font-medium text-sm text-slate-200 truncate">{assignment.title}</span>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}><Pencil className="h-4 w-4" /></Button>
          <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Supprimer le devoir ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
}
