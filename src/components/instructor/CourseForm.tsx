
'use client';

import { useState, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useRouter } from 'next-intl/navigation';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useRole } from '@/context/RoleContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Bot, Image as ImageIcon, Loader2, Package, Sparkles } from 'lucide-react';
import type { Course } from '@/lib/types';
import Image from 'next/image';

const CourseFormSchema = z.object({
  title: z.string().min(5, { message: "Le titre doit faire au moins 5 caractères." }),
  description: z.string().min(20, { message: "La description doit faire au moins 20 caractères." }),
  price: z.coerce.number().min(0, { message: "Le prix ne peut être négatif." }),
  category: z.string().min(3, { message: "La catégorie est requise." }),
  thumbnailUrl: z.string().url({ message: "URL de l'image invalide." }).optional(),
});

type CourseFormValues = z.infer<typeof CourseFormSchema>;

interface CourseFormProps {
  mode: 'create' | 'edit';
  initialData?: Course | null;
  onSubmit: (data: CourseFormValues) => Promise<void>;
}

const courseCategories = [
    "Développement Web", "Développement Mobile", "Data Science & IA", "Marketing Digital", "Design (UI/UX)", "Entrepreneuriat", "Bureautique", "Autre"
];

export function CourseForm({ mode, initialData, onSubmit }: CourseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(initialData?.thumbnailUrl || null);
  const { user } = useRole();

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(CourseFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      category: initialData?.category || '',
      thumbnailUrl: initialData?.thumbnailUrl || undefined,
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const storage = getStorage();
    const storageRef = ref(storage, `course_thumbnails/${user.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        setUploadProgress(null);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          form.setValue('thumbnailUrl', downloadURL);
          setThumbnailPreview(downloadURL);
          setUploadProgress(null);
        });
      }
    );
  };

  const processSubmit = (data: CourseFormValues) => {
    startTransition(() => {
      onSubmit(data);
    });
  };
  
  const title = mode === 'create' ? 'Créer un nouveau cours' : 'Modifier le cours';

  return (
    <div className="pb-24">
        <header className="flex items-center gap-4 mb-8">
            <Button variant="outline" size="icon" asChild>
                <Link href="/instructor/courses"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
        </header>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-8 max-w-4xl mx-auto">
                <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                    <CardHeader><CardTitle>Informations générales</CardTitle><CardDescription>Les détails essentiels qui décrivent votre cours.</CardDescription></CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Titre du cours</FormLabel><FormControl><Input placeholder="Ex: Introduction à React.js pour les débutants" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Décrivez ce que les étudiants apprendront, les prérequis, etc." {...field} rows={6} /></FormControl><FormMessage /></FormItem> )}/>
                    </CardContent>
                </Card>
                
                 <div className="grid md:grid-cols-2 gap-8">
                    <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                        <CardHeader><CardTitle>Paramètres Financiers</CardTitle></CardHeader>
                        <CardContent>
                            <FormField control={form.control} name="price" render={({ field }) => ( <FormItem><FormLabel>Prix du cours</FormLabel><div className="relative"><FormControl><Input type="number" placeholder="10000" {...field} className="pl-10" /></FormControl><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">XOF</span></div><FormDescription>Mettre 0 pour un cours gratuit.</FormDescription><FormMessage /></FormItem> )}/>
                        </CardContent>
                    </Card>
                    <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                        <CardHeader><CardTitle>Catégorisation</CardTitle></CardHeader>
                        <CardContent>
                            <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><FormLabel>Catégorie</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez une catégorie" /></SelectTrigger></FormControl><SelectContent>{courseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        </CardContent>
                    </Card>
                </div>
                
                 <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                    <CardHeader><CardTitle>Image de couverture</CardTitle><CardDescription>Cette image sera utilisée dans le catalogue de cours.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                       <FormField control={form.control} name="thumbnailUrl" render={({ field }) => (
                           <FormItem>
                                <FormControl>
                                    <div className="w-full aspect-video rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center relative overflow-hidden bg-slate-800">
                                        {thumbnailPreview ? (
                                            <Image src={thumbnailPreview} alt="Aperçu du cours" fill className="object-cover"/>
                                        ) : (
                                             <div className="text-center text-slate-500">
                                                <ImageIcon className="mx-auto h-12 w-12" />
                                                <p className="mt-2 text-sm">Téléversez une image</p>
                                             </div>
                                        )}
                                    </div>
                                </FormControl>
                                <Input type="file" accept="image/*" onChange={handleImageUpload} className="dark:file:text-primary file:cursor-pointer" disabled={uploadProgress !== null}/>
                                {uploadProgress !== null && <Progress value={uploadProgress} className="h-2"/>}
                                <FormMessage />
                           </FormItem>
                       )}/>
                    </CardContent>
                </Card>

                 <Card className="dark:bg-slate-800/50 dark:border-slate-700/80 opacity-60">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Package/>Organisation du cours</CardTitle></CardHeader>
                    <CardContent className="text-center text-muted-foreground">
                        <p>La gestion des sections et des leçons sera disponible ici après la création du cours.</p>
                    </CardContent>
                </Card>
                
                 <Card className="dark:bg-slate-800/50 dark:border-slate-700/80 opacity-60">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-primary"><Bot/>Assistant IA Mathias</CardTitle></CardHeader>
                    <CardContent className="text-center text-muted-foreground">
                       <p>L'assistant IA vous aidera bientôt à rédiger vos contenus et à générer des quiz.</p>
                    </CardContent>
                </Card>

                <footer className="fixed bottom-0 left-0 md:left-auto right-0 p-4 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700 z-10">
                    <div className="max-w-4xl mx-auto flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === 'create' ? "Créer et continuer" : "Enregistrer les modifications"}
                        </Button>
                    </div>
                </footer>
            </form>
        </Form>
    </div>
  );
}
