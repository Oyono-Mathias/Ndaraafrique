'use client';

import { useState, useMemo, useTransition } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import { createSection, reorderSections } from '@/actions/sectionActions';
import type { Section } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Loader2, FolderPlus, Sparkles } from 'lucide-react';
import { SectionItem } from './SectionItem';

export function ContentManager({ courseId }: { courseId: string }) {
  const db = getFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [newSectionTitle, setNewSectionTitle] = useState('');

  const sectionsQuery = useMemo(
    () => query(collection(db, 'courses', courseId, 'sections'), orderBy('order', 'asc')),
    [db, courseId]
  );
  const { data: sections, isLoading: sectionsLoading } = useCollection<Section>(sectionsQuery);
  
  const handleCreateSection = () => {
    if (!newSectionTitle.trim()) return;
    startTransition(async () => {
        const result = await createSection({ courseId, title: newSectionTitle });
        if (result.success) {
            setNewSectionTitle('');
            toast({ title: 'Section créée !' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
    });
  };

  const onDragEnd: OnDragEndResponder = (result) => {
    const { destination, source, type } = result;
    if (!destination || !sections) return;

    if (type === 'SECTION' && source.index !== destination.index) {
        const items = Array.from(sections);
        const [reorderedItem] = items.splice(source.index, 1);
        items.splice(destination.index, 0, reorderedItem);

        const newOrder = items.map((item, index) => ({ id: item.id, order: index }));
        
        startTransition(async () => {
            await reorderSections({ courseId, orderedSections: newOrder });
        });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-6 pb-32">
            <Droppable droppableId="sections" type="SECTION">
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {sectionsLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-20 w-full rounded-3xl bg-slate-900" />
                                <Skeleton className="h-20 w-full rounded-3xl bg-slate-900" />
                            </div>
                        ) : sections && sections.length > 0 ? (
                            sections.map((section, index) => (
                                <Draggable key={section.id} draggableId={section.id} index={index}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className="animate-in fade-in slide-in-from-bottom-2"
                                            style={{ ...provided.draggableProps.style, animationDelay: `${index * 100}ms` }}
                                        >
                                            <SectionItem 
                                                courseId={courseId} 
                                                section={section} 
                                                index={index}
                                                dragHandleProps={provided.dragHandleProps} 
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 px-8 text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-white/5 opacity-30">
                                <div className="p-6 bg-slate-800/50 rounded-full mb-4">
                                    <FolderPlus className="h-12 w-12 text-slate-700" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Le cours est vide</h3>
                                <p className="text-slate-500 text-sm mt-2 max-w-[220px] mx-auto font-medium italic">
                                    Commencez par ajouter votre première section pour structurer votre savoir.
                                </p>
                            </div>
                        )}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

             <div className="flex flex-col gap-4 p-6 bg-slate-900/50 border border-white/5 rounded-[2.5rem] shadow-xl">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Nouveau Module</label>
                    <Input
                        placeholder="Ex: 01. Introduction aux fondamentaux"
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        disabled={isPending}
                        className="h-14 bg-slate-950 border-white/5 rounded-2xl text-white font-bold"
                    />
                </div>
                <Button 
                    onClick={handleCreateSection} 
                    disabled={isPending || !newSectionTitle.trim()}
                    className="h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
                >
                    {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                    Ajouter une section
                </Button>
            </div>
        </div>
    </DragDropContext>
  );
}
