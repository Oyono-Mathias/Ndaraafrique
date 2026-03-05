'use client';

import { useState, useTransition } from 'react';
import type { Lecture } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Video, MessageSquareText, Pencil, Trash2, Youtube, Clock } from 'lucide-react';
import { deleteLecture } from '@/actions/lectureActions';
import { useToast } from '@/hooks/use-toast';
import { LectureFormModal } from './forms/LectureForm';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';

const typeConfig = {
  video: { icon: Video, label: 'Vidéo Premium' },
  youtube: { icon: Youtube, label: 'Vidéo YouTube' },
  text: { icon: MessageSquareText, label: 'Texte' },
  pdf: { icon: FileText, label: 'PDF' },
};

export function LectureItem({ courseId, sectionId, lecture }: { courseId: string; sectionId: string; lecture: Lecture }) {
  const Icon = typeConfig[lecture.type as keyof typeof typeConfig]?.icon || Video;
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
        const result = await deleteLecture({ courseId, sectionId, lectureId: lecture.id });
        if(result.success) toast({ title: 'Leçon supprimée' });
        else toast({ variant: 'destructive', title: 'Erreur', description: result.error as string });
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
      <div className="flex items-center p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-primary/30 transition-all group">
        <div className="p-2 bg-slate-800 rounded-lg mr-3 group-hover:bg-primary/10 transition-colors">
            <Icon className="h-4 w-4 text-slate-400 group-hover:text-primary" />
        </div>
        
        <div className="flex-1 min-w-0 mr-3">
            <p className="font-bold text-sm text-slate-200 truncate">{lecture.title}</p>
            <div className="flex items-center gap-3 mt-0.5">
                {lecture.duration ? (
                    <span className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                        <Clock className="h-3 w-3" />
                        {lecture.duration} min
                    </span>
                ) : null}
                {lecture.isFreePreview && <Badge className="h-4 px-1.5 text-[8px] bg-emerald-500/10 text-emerald-500 border-none uppercase font-black">Aperçu</Badge>}
            </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-800" onClick={() => setIsEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500/50 hover:text-red-500 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-slate-800 rounded-[2rem]">
                  <AlertDialogHeader>
                      <AlertDialogTitle className="text-white font-black uppercase tracking-tight">Supprimer la leçon ?</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">Cette action est irréversible et supprimera également le fichier vidéo de Bunny Stream.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-800 border-none rounded-xl font-bold uppercase text-[10px]">Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase text-[10px]">Supprimer</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
}
