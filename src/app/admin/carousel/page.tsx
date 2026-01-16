'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, collection, query, orderBy, writeBatch, doc } from 'firebase/firestore';
import { useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, GalleryHorizontal, GripVertical } from 'lucide-react';
import Image from 'next/image';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface CarouselSlide {
  id: string;
  imageUrl: string;
  link?: string;
  order: number;
}

const slideSchema = z.object({
    id: z.string().optional(),
    imageUrl: z.string().url("Veuillez entrer une URL d'image valide."),
    link: z.string().url("URL de lien invalide.").optional().or(z.literal('')),
});

const formSchema = z.object({
  slides: z.array(slideSchema),
});

type FormValues = z.infer<typeof formSchema>;


export default function AdminCarouselPage() {
  const { toast } = useToast();
  const db = getFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [initialSlides, setInitialSlides] = useState<CarouselSlide[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const slidesQuery = useMemoFirebase(() => query(collection(db, 'carousel_slides'), orderBy('order', 'asc')), [db]);
  const { data: slidesData, isLoading } = useCollection<CarouselSlide>(slidesQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { slides: [] },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'slides',
  });

  useEffect(() => {
    if (slidesData) {
      setInitialSlides(slidesData);
      form.reset({ slides: slidesData });
    }
  }, [slidesData, form]);

  const onSubmit = useCallback(async (data: FormValues) => {
    setIsSaving(true);
    const batch = writeBatch(db);

    try {
      // First, handle deletions by comparing initial data with form data
      const formSlideIds = new Set(data.slides.map(s => s.id).filter(Boolean));
      initialSlides?.forEach(initialSlide => {
        if (!formSlideIds.has(initialSlide.id)) {
          batch.delete(doc(db, 'carousel_slides', initialSlide.id));
        }
      });
      
      // Then, handle updates and additions
      data.slides.forEach((slide, index) => {
        const slideRef = slide.id 
          ? doc(db, 'carousel_slides', slide.id)
          : doc(collection(db, 'carousel_slides'));
        
        batch.set(slideRef, {
            imageUrl: slide.imageUrl,
            link: slide.link || '',
            order: index, // Re-assign order based on array index
        }, { merge: true });
      });

      await batch.commit();
      toast({ title: "Carrousel sauvegardé !", description: "Les modifications ont été enregistrées." });
    } catch (error) {
      console.error("Error saving carousel slides:", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de sauvegarder les diapositives." });
    } finally {
      setIsSaving(false);
    }
  }, [db, initialSlides, toast]);

  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }
    move(result.source.index, result.destination.index);
    // Trigger save after a drag-and-drop reorder
    setTimeout(() => form.handleSubmit(onSubmit)(), 0);
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
              <DragDropContext onDragEnd={onDragEnd}>
                {isClient ? (
                  <Droppable droppableId="slides">
                    {(provided: any) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {fields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id!} index={index}>
                            {(provided: any) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                <Card className="p-4 flex flex-col md:flex-row gap-4 items-start dark:bg-slate-900/50 dark:border-slate-700">
                                  <GripVertical className="h-5 w-5 text-slate-400 mt-9 md:mt-1 cursor-grab shrink-0"/>
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
                                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="shrink-0 text-destructive">
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
                ) : null}
              </DragDropContext>

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