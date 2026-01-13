
'use client';

import { useState, useEffect } from 'react';
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
    order: z.coerce.number().min(0, "L'ordre doit être un nombre positif."),
});

const formSchema = z.object({
  slides: z.array(slideSchema),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminCarouselPage() {
  const { toast } = useToast();
  const db = getFirestore();
  const [isSaving, setIsSaving] = useState(false);
  
  const slidesQuery = useMemoFirebase(() => query(collection(db, 'carousel_slides'), orderBy('order', 'asc')), [db]);
  const { data: slidesData, isLoading } = useCollection<CarouselSlide>(slidesQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { slides: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'slides',
  });

  useEffect(() => {
    if (slidesData) {
      form.reset({ slides: slidesData });
    }
  }, [slidesData, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    const batch = writeBatch(db);

    try {
      // First, handle deletions by comparing initial data with form data
      const formSlideIds = new Set(data.slides.map(s => s.id).filter(Boolean));
      slidesData?.forEach(initialSlide => {
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4 flex flex-col md:flex-row gap-4 items-start dark:bg-slate-900/50 dark:border-slate-700">
                  <GripVertical className="h-5 w-5 text-slate-400 mt-1 cursor-grab shrink-0"/>
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
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs dark:text-slate-300">URL de l'image</FormLabel>
                          <FormControl><Input {...field} placeholder="https://..." className="dark:bg-slate-800 dark:border-slate-600" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`slides.${index}.link`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs dark:text-slate-300">Lien (optionnel)</FormLabel>
                          <FormControl><Input {...field} placeholder="/course/..." className="dark:bg-slate-800 dark:border-slate-600" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="shrink-0 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={() => append({ imageUrl: '', link: '', order: fields.length })}
              >
                <Plus className="mr-2 h-4 w-4" /> Ajouter une diapositive
              </Button>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSaving}>
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
