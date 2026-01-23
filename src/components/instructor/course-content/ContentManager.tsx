
'use client';

import { useState, useMemo, useTransition } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import { createSection, reorderSections } from '@/actions/sectionActions';
import type { Section, Lecture } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Loader2, GripVertical, FolderOpen } from 'lucide-react';
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
            // The UI will update automatically thanks to the real-time listener
        });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-6">
            <Droppable droppableId="sections" type="SECTION">
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {sectionsLoading ? (
                            <Skeleton className="h-40 w-full" />
                        ) : sections && sections.length > 0 ? (
                            sections.map((section, index) => (
                                <Draggable key={section.id} draggableId={section.id} index={index}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                        >
                                            <SectionItem 
                                                courseId={courseId} 
                                                section={section} 
                                                dragHandleProps={provided.dragHandleProps} 
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl">
                                <FolderOpen className="mx-auto h-12 w-12 text-slate-400" />
                                <h3 className="mt-2 text-sm font-semibold text-slate-200">Le cours est vide</h3>
                                <p className="mt-1 text-sm text-slate-500">Commencez par ajouter votre première section.</p>
                            </div>
                        )}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

             <div className="flex items-center gap-2">
                <Input
                    placeholder="Titre de la nouvelle section"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    disabled={isPending}
                />
                <Button onClick={handleCreateSection} disabled={isPending || !newSectionTitle.trim()}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ajouter une section
                </Button>
            </div>
        </div>
    </DragDropContext>
  );
}
