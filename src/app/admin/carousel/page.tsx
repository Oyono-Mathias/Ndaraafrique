'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, GalleryHorizontal, GripVertical } from 'lucide-react';
import Image from 'next/image';
import { getFirestore, collection, query, orderBy, onSnapshot, writeBatch, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Skeleton } from '@/components/ui/skeleton';

interface CarouselSlide {
  id: string;
  imageUrl: string;
  link?: string;
  order: number;
}

const slideSchema = z.object({
    id: z.string().optional(),
    imageUrl: z.string().url("Veuillez entrer une URL d'image valide.").min(1, "L'URL de l'image est requise."),
    link: z.string().url("URL de lien invalide.").optional().or(z.literal('')),
});

const formSchema = z.object({
  slides: z.array(slideSchema),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminCarouselPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removedSlideIds, setRemovedSlideIds] = useState<string[]>([]);

  const db = getFirestore();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { slides: [] },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'slides',
  });

  useEffect(() => {
    const slidesQuery = query(collection(db, 'carousel_slides'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(slidesQuery, (snapshot) => {
        const fetchedSlides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CarouselSlide));
        setSlides(fetchedSlides);
        form.reset({ slides: fetchedSlides });
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching slides:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les diapositives.' });
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db, form, toast]);

  const handleRemove = (index: number) => {
    const slideId = fields[index].id;
    if (slideId) {
      setRemovedSlideIds(prev => [...prev, slideId]);
    }
    remove(index);
  };
  
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    move(result.source.index, result.destination.index);
  };

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    const batch = writeBatch(db);
    const slidesCollectionRef = collection(db, 'carousel_slides');

    // Handle deletions
    removedSlideIds.forEach(id => {
      batch.delete(doc(db, 'carousel_slides', id));
    });

    // Handle updates and additions
    data.slides.forEach((slideData, index) => {
      const docRef = slideData.id 
        ? doc(db, 'carousel_slides', slideData.id) 
        : doc(slidesCollectionRef);
      
      const payload = {
        imageUrl: slideData.imageUrl,
        link: slideData.link || '',
        order: index,
        ...(!slideData.id && { createdAt: serverTimestamp() })
      };
      
      batch.set(docRef, payload, { merge: true });
    });
    
    try {
      await batch.commit();
      toast({ title: 'Carrousel sauvegardé !' });
      setRemovedSlideIds([]);
    } catch (error) {
      console.error("Error saving carousel:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder le carrousel.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Gestion du Carrousel</h1>
        <p className="text-muted-foreground dark:text-slate-400">Gérez les diapositives affichées sur la page d'accueil.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white"><GalleryHorizontal className="h-5 w-5"/> Diapositives Actuelles</CardTitle>
          <CardDescription className="dark:text-slate-400">Glissez-déposez pour réorganiser. Ajoutez, modifiez ou supprimez les diapositives.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="pb-20 md:pb-0">
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-40 w-full dark:bg-slate-700" />
                        <Skeleton className="h-40 w-full dark:bg-slate-700" />
                    </div>
                ) : fields.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed rounded-lg dark:border-slate-700">
                        <GalleryHorizontal className="mx-auto h-12 w-12 text-slate-400"/>
                        <h3 className="mt-4 font-medium text-lg">Aucune diapositive</h3>
                        <p className="text-sm text-muted-foreground">Commencez par ajouter une nouvelle diapositive.</p>
                      </div>
                ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="slides">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                {fields.map((field, index) => (
                                    <Draggable key={field.id} draggableId={field.id} index={index}>
                                        {(provided) => (
                                            <div ref={provided.innerRef} {...provided.draggableProps}>
                                                <Card className="p-4 flex flex-col md:flex-row gap-4 items-start dark:bg-slate-900/50 dark:border-slate-700">
                                                    <div {...provided.dragHandleProps} className="pt-9 md:pt-1">
                                                        <GripVertical className="h-5 w-5 text-slate-400 cursor-grab shrink-0"/>
                                                    </div>
                                                    <div className="w-full md:w-48 shrink-0">
                                                        <FormField
                                                            control={form.control}
                                                            name={`slides.${index}.imageUrl`}
                                                            render={({ field: imageField }) => (
                                                                <Image
                                                                    src={imageField.value || '/placeholder.svg'}
                                                                    alt={`Aperçu ${index + 1}`}
                                                                    width={200}
                                                                    height={112}
                                                                    className="aspect-video object-cover rounded-md border dark:border-slate-600 bg-slate-100 dark:bg-slate-800"
                                                                />
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="flex-1 space-y-3">
                                                        <FormField
                                                            control={form.control}
                                                            name={`slides.${index}.imageUrl`}
                                                            render={({ field: inputField }) => (
                                                                <FormItem>
                                                                <FormLabel className="text-xs dark:text-slate-300">URL de l'image</FormLabel>
                                                                <FormControl><Input {...inputField} placeholder="https://..." className="dark:bg-slate-800 dark:border-slate-600" /></FormControl>
                                                                <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name={`slides.${index}.link`}
                                                            render={({ field: linkField }) => (
                                                                <FormItem>
                                                                <FormLabel className="text-xs dark:text-slate-300">Lien (optionnel)</FormLabel>
                                                                <FormControl><Input {...linkField} placeholder="/course/..." className="dark:bg-slate-800 dark:border-slate-600" /></FormControl>
                                                                <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(index)} className="shrink-0 text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </Card>
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

                <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed mt-4"
                    onClick={() => append({ imageUrl: '', link: '' })}
                >
                    <Plus className="mr-2 h-4 w-4" /> Ajouter une diapositive
                </Button>

                <div className="fixed bottom-0 left-0 right-0 md:relative bg-background/80 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none border-t md:border-none p-4 md:p-0 md:flex md:justify-end mt-4 z-50">
                    <Button type="submit" disabled={isSaving} className="w-full md:w-auto h-12 text-base md:h-auto md:text-sm">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer les modifications
                    </Button>
                </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
