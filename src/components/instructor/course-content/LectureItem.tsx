'use client';

import { useState, useTransition } from 'react';
import type { Lecture } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Video, MessageSquareText, Pencil, Trash2, Youtube, Clock, GripVertical } from 'lucide-react';
import { deleteLecture } from '@/actions/lectureActions';
import { useToast } from '@/hooks/use-toast';
import { LectureFormModal } from './forms/LectureForm';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const typeConfig = {
  video: { icon: Video, color: 'text-blue-400 bg-blue-500/10', label: 'Vidéo' },
  youtube: { icon: Youtube, color: 'text-red-400 bg-red-500/10', label: 'YouTube' },
  text: { icon: MessageSquareText, color: 'text-emerald-400 bg-emerald-500/10', label: 'Texte' },
  pdf: { icon: FileText, color: 'text-amber-400 bg-amber-500/10', label: 'PDF' },
};

export function LectureItem({ courseId, sectionId, lecture }: { courseId: string; sectionId: string; lecture: Lecture }) {
  const config = typeConfig[lecture.type as keyof typeof typeConfig] || typeConfig.video;
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
      <div className="group bg-ndara-bg rounded-3xl p-3 border border-white/5 flex items-center gap-3 active:scale-[0.98] transition-all shadow-lg hover:border-primary/20">
        <div className="text-slate-700 cursor-grab active:cursor-grabbing hover:text-primary transition-colors">
            <GripVertical size={16} />
        </div>
        
        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", config.color)}>
            <config.icon size={18} />
        </div>
        
        <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-[13px] truncate uppercase tracking-tight">{lecture.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter flex items-center gap-1">
                    {lecture.duration || 0}:00 MIN • {config.label}
                </span>
                {lecture.isFreePreview && (
                    <Badge className="bg-primary/10 text-primary border-none text-[7px] font-black uppercase px-1.5 h-3.5">Gratuit</Badge>
                )}
            </div>
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
                  <AlertDialogHeader>
                      <AlertDialogTitle className="text-white font-black uppercase tracking-tight">Supprimer ?</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">Cette action supprimera également le fichier vidéo de Bunny Stream.</AlertDialogDescription>
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
