'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { reorderLectures } from '@/actions/lectureActions';
import type { Section, Lecture, Quiz, Assignment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    GripVertical, 
    Plus, 
    Pencil, 
    Trash2, 
    FolderOpen, 
    Folder, 
    ChevronDown, 
    PlayCircle, 
    HelpCircle, 
    ClipboardList,
    PlusCircle
} from 'lucide-react';
import { LectureItem } from './LectureItem';
import { SectionForm } from './forms/SectionForm';
import { LectureFormModal } from './forms/LectureForm';
import { QuizFormModal } from './forms/QuizFormModal';
import { AssignmentFormModal } from './forms/AssignmentFormModal';
import { deleteSection } from '@/actions/sectionActions';
import { 
    AlertDialog, 
    AlertDialogTrigger, 
    AlertDialogContent, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogAction, 
    AlertDialogCancel 
} from '@/components/ui/alert-dialog';
import { QuizItem } from './QuizItem';
import { AssignmentItem } from './AssignmentItem';
import { cn } from '@/lib/utils';

export function SectionItem({ courseId, section, index, dragHandleProps }: { courseId: string; section: Section; index: number; dragHandleProps: any }) {
  const db = getFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  
  const [isLectureModalOpen, setIsLectureModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const lecturesQuery = useMemo(() => query(collection(db, 'courses', courseId, 'sections', section.id, 'lectures'), orderBy('order', 'asc')), [db, courseId, section.id]);
  const { data: lectures, isLoading: lecturesLoading } = useCollection<Lecture>(lecturesQuery);

  const quizzesQuery = useMemo(() => query(collection(db, 'courses', courseId, 'sections', section.id, 'quizzes')), [db, courseId, section.id]);
  const { data: quizzes, isLoading: quizzesLoading } = useCollection<Quiz>(quizzesQuery);

  const assignmentsQuery = useMemo(() => query(collection(db, 'courses', courseId, 'sections', section.id, 'assignments')), [db, courseId, section.id]);
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
  };

  const isLoading = lecturesLoading || quizzesLoading || assignmentsLoading;
  const totalContent = (lectures?.length || 0) + (quizzes?.length || 0) + (assignments?.length || 0);

  return (
    <div className="mb-4">
      <LectureFormModal isOpen={isLectureModalOpen} onOpenChange={setIsLectureModalOpen} courseId={courseId} sectionId={section.id} />
      <QuizFormModal isOpen={isQuizModalOpen} onOpenChange={setIsQuizModalOpen} courseId={courseId} sectionId={section.id} />
      <AssignmentFormModal isOpen={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen} courseId={courseId} sectionId={section.id} />

      {/* --- SECTION HEADER --- */}
      <div 
        className={cn(
            "bg-ndara-surface rounded-4xl p-4 border border-white/5 flex items-center justify-between mb-2 transition-all active:scale-[0.98] cursor-pointer shadow-xl",
            isOpen ? "border-primary/20 ring-1 ring-primary/10" : ""
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
            <div {...dragHandleProps} className="p-2 -ml-2 text-slate-600 hover:text-primary transition-colors">
                <GripVertical size={18} />
            </div>
            <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shadow-lg",
                isOpen ? "bg-primary/20 text-primary" : "bg-slate-800 text-slate-500"
            )}>
                {isOpen ? <FolderOpen size={20} /> : <Folder size={20} />}
            </div>
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <div onClick={e => e.stopPropagation()}>
                        <SectionForm courseId={courseId} section={section} onDone={() => setIsEditing(false)} />
                    </div>
                ) : (
                    <>
                        <h3 className="font-black text-white text-sm uppercase tracking-tight leading-tight line-clamp-1">
                            {String(index + 1).padStart(2, '0')}. {section.title}
                        </h3>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                            {totalContent} Élément{totalContent > 1 ? 's' : ''} • Pédagogie
                        </p>
                    </>
                )}
            </div>
        </div>
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-white" onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}>
                <Pencil size={14} />
            </Button>
            <ChevronDown className={cn("h-5 w-5 text-slate-600 transition-transform duration-300", isOpen && "rotate-180")} />
        </div>
      </div>

      {/* --- SECTION CONTENT (COLLAPSIBLE) --- */}
      <div className={cn(
          "overflow-hidden transition-all duration-500 ease-in-out pl-4 ml-7 border-l-2 border-primary/20",
          isOpen ? "max-h-[2000px] opacity-100 py-2" : "max-h-0 opacity-0"
      )}>
        <div className="space-y-2 pr-2">
            {isLoading ? (
                <Skeleton className="h-12 w-full rounded-2xl bg-slate-900" />
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId={section.id} type="LECTURE">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                {lectures?.map((lecture, lIdx) => (
                                    <Draggable key={lecture.id} draggableId={lecture.id} index={lIdx}>
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

            {/* --- ADD CONTENT BUTTONS --- */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5">
                <QuickAddBtn icon={PlayCircle} color="text-blue-400 bg-blue-500/10" onClick={() => setIsLectureModalOpen(true)} label="Leçon" />
                <QuickAddBtn icon={HelpCircle} color="text-purple-400 bg-purple-500/10" onClick={() => setIsQuizModalOpen(true)} label="Quiz" />
                <QuickAddBtn icon={ClipboardList} color="text-orange-400 bg-orange-500/10" onClick={() => setIsAssignmentModalOpen(true)} label="Devoir" />
            </div>

            <div className="flex justify-end pt-4">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 text-red-500/50 hover:text-red-500 font-black uppercase text-[9px] tracking-widest gap-1">
                            <Trash2 size={12} /> Supprimer le module
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-900 border-slate-800 rounded-[2rem]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-white font-black uppercase tracking-tight">Supprimer ?</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400 italic">"Mo ye ti lungula section so ?"<br/>Tout le contenu associé (vidéos, quiz) sera délié.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-800 border-none rounded-xl font-bold uppercase text-[10px]">Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase text-[10px]">Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
      </div>
    </div>
  );
}

function QuickAddBtn({ icon: Icon, color, onClick, label }: any) {
    return (
        <button 
            onClick={onClick}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-ndara-surface border border-white/5 active:scale-95 transition-all group"
        >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner", color)}>
                <Icon size={18} />
            </div>
            <span className="text-[8px] font-black text-white uppercase tracking-widest">{label}</span>
        </button>
    );
}
