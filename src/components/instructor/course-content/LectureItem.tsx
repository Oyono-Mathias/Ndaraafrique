
'use client';

import { useState, useTransition } from 'react';
import type { Lecture } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Video, MessageSquareText, Pencil, Trash2 } from 'lucide-react';
import { deleteLecture } from '@/actions/lectureActions';
import { useToast } from '@/hooks/use-toast';
import { LectureFormModal } from './forms/LectureForm';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';


const typeConfig = {
  video: { icon: Video, label: 'Vidéo' },
  text: { icon: MessageSquareText, label: 'Texte' },
  pdf: { icon: FileText, label: 'PDF' },
};

export function LectureItem({ courseId, sectionId, lecture }: { courseId: string; sectionId: string; lecture: Lecture }) {
  const Icon = typeConfig[lecture.type].icon;
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
        const result = await deleteLecture({ courseId, sectionId, lectureId: lecture.id });
        if(result.success) toast({ title: 'Leçon supprimée' });
        else toast({ variant: 'destructive', title: 'Erreur', description: result.error });
    });
  }

  return (
    <>
      <LectureFormModal
        isOpen={isEditing}
        onOpenChange={setIsEditing}
        courseId={courseId}
        sectionId={sectionId}
        lecture={lecture}
      />
      <div className="flex items-center p-2 rounded-md bg-slate-900 border border-slate-700/50">
        <Icon className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0" />
        <span className="flex-1 font-medium text-sm text-slate-200 truncate">{lecture.title}</span>
        {lecture.isFreePreview && <Badge variant="secondary" className="mr-3">Aperçu gratuit</Badge>}
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}><Pencil className="h-4 w-4" /></Button>
          <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Supprimer la leçon ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
}