'use client';

import { useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase';
import { collection, query, orderBy, getFirestore } from 'firebase/firestore';
import { assistCourseCreation } from '@/ai/flows/assist-course-creation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Bot, Image as ImageIcon, Loader2, Sparkles, LayoutGrid, Link as LinkIcon, CheckCircle2, Frown } from 'lucide-react';
import type { Course, CourseTemplate } from '@/lib/types';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const CourseFormSchema = z.object({
  title: z.string().min(5, { message: "Le titre doit faire au moins 5 caractères." }),
  description: z.string().min(20, { message: "La description doit faire au moins 20 caractères." }),
  price: z.coerce.number().min(0, { message: "Le prix ne peut être négatif." }),
  category: z.string().min(3, { message: "La catégorie est requise." }),
  imageUrl: z.string().min(1, { message: "Une image de couverture est requise." }),
});

type CourseFormValues = z.infer<typeof CourseFormSchema>;

interface CourseFormProps {
  mode: 'create' | 'edit';
  initialData?: Course | null;
  onSubmit: (data: CourseFormValues) => Promise<void>;
}

const courseCategories = [
    "AgriTech", 
    "FinTech", 
    "Énergies Renouvelables", 
    "Développement Web", 
    "Entrepreneuriat", 
    "Soft Skills"
];

export function CourseForm({ mode, initialData, onSubmit }: CourseFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const db = getFirestore();
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [imageSource, setImageSource] = useState<'upload' | 'template' | 'url'>('template');
  const { user } = useRole();

  // ✅ Chargement dynamique des templates depuis Firestore
  const templatesQuery = useMemo(() => query(collection(db, 'course_templates'), orderBy('createdAt', 'desc')), [db]);
  const { data: templates, isLoading: templatesLoading } = useCollection<CourseTemplate>(templatesQuery);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(CourseFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      category: initialData?.category || '',
      imageUrl: initialData?.imageUrl || '',
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const storage = getStorage();
    const storageRef = ref(storage, `courses/${user.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        toast({ variant: 'destructive', title: "Échec du téléversement" });
        setUploadProgress(null);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          form.setValue('imageUrl', downloadURL);
          setImagePreview(downloadURL);
          setUploadProgress(null);
          toast({ title: "Image prête !" });
        });
      }
    );
  };

  const handleSelectTemplate = (url: string) => {
      form.setValue('imageUrl', url);
      setImagePreview(url);
      toast({ title: "Modèle sélectionné" });
  };

  const handleMathiasHelp = async () => {
    const title = form.getValues('title');
    if (!title || title.length < 5) {
        toast({ variant: 'destructive', title: "Titre trop court" });
        return;
    }

    setIsAiLoading(true);
    try {
        const result = await assistCourseCreation({ courseTitle: title });
        form.setValue('description', result.description);
        if (courseCategories.includes(result.category)) {
            form.setValue('category', result.category);
        }
        toast({ title: "Mathias a rédigé votre contenu !" });
    } catch (error) {
        toast({ variant: 'destructive', title: "Erreur IA" });
    } finally {
        setIsAiLoading(false);
    }
  };

  const processSubmit = (data: CourseFormValues) => {
    startTransition(async () => {
      await onSubmit(data);
    });
  };
  
  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-8 max-w-4xl mx-auto p-4 pb-24">
            {mode === 'create' && (
                <header className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <Link href="/instructor/courses"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Créer mon cours</h1>
                </header>
            )}
            
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="border-b dark:border-white/5">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl font-bold uppercase tracking-tight">Informations générales</CardTitle>
                            <CardDescription>Décrivez votre cours pour attirer des apprenants.</CardDescription>
                        </div>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={handleMathiasHelp} 
                            disabled={isAiLoading}
                            className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 rounded-xl"
                        >
                            {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Bot className="h-4 w-4 mr-2" />}
                            Aide de Mathias
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Titre du cours</FormLabel><FormControl><Input placeholder="Ex: Maîtriser l'AgriTech durable" {...field} className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Description</FormLabel><FormControl><Textarea placeholder="Contenu du cours..." {...field} rows={6} className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl resize-none" /></FormControl><FormMessage /></FormItem> )}/>
                </CardContent>
            </Card>
            
             <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden">
                    <CardHeader className="border-b dark:border-white/5"><CardTitle className="text-sm font-bold uppercase tracking-tight">Prix (XOF)</CardTitle></CardHeader>
                    <CardContent className="pt-6">
                        <FormField control={form.control} name="price" render={({ field }) => ( <FormItem><FormControl><Input type="number" {...field} className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl font-bold" /></FormControl><FormMessage /></FormItem> )}/>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden">
                    <CardHeader className="border-b dark:border-white/5"><CardTitle className="text-sm font-bold uppercase tracking-tight">Catégorie</CardTitle></CardHeader>
                    <CardContent className="pt-6">
                        <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"><SelectValue placeholder="Catégorie" /></SelectTrigger></FormControl><SelectContent>{courseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                    </CardContent>
                </Card>
            </div>
            
             <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="border-b dark:border-white/5">
                    <CardTitle className="text-xl font-bold uppercase tracking-tight">Image de couverture</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                   <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950/50">
                        {imagePreview ? (
                            <Image src={imagePreview} alt="Aperçu" fill className="object-cover animate-in fade-in duration-500" />
                        ) : (
                             <div className="text-center text-slate-400">
                                <ImageIcon className="mx-auto h-12 w-12 opacity-20" />
                                <p className="mt-2 text-xs font-bold uppercase tracking-widest">Aucune image</p>
                             </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant={imageSource === 'template' ? 'default' : 'outline'} onClick={() => setImageSource('template')} size="sm" className="rounded-xl font-bold text-[10px] uppercase tracking-widest">Bibliothèque</Button>
                        <Button type="button" variant={imageSource === 'upload' ? 'default' : 'outline'} onClick={() => setImageSource('upload')} size="sm" className="rounded-xl font-bold text-[10px] uppercase tracking-widest">Mon Fichier</Button>
                        <Button type="button" variant={imageSource === 'url' ? 'default' : 'outline'} onClick={() => setImageSource('url')} size="sm" className="rounded-xl font-bold text-[10px] uppercase tracking-widest">Lien Direct</Button>
                    </div>

                    {imageSource === 'template' && (
                        <div className="space-y-4">
                            {templatesLoading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl bg-slate-800" />)}
                                </div>
                            ) : templates && templates.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in slide-in-from-top-2 duration-300">
                                    {templates.map((img) => (
                                        <button
                                            key={img.id}
                                            type="button"
                                            onClick={() => handleSelectTemplate(img.imageUrl)}
                                            className={cn(
                                                "relative aspect-video rounded-xl overflow-hidden border-2 transition-all",
                                                form.watch('imageUrl') === img.imageUrl ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            <Image src={img.imageUrl} alt={img.description} fill className="object-cover" />
                                            {form.watch('imageUrl') === img.imageUrl && (
                                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                    <CheckCircle2 className="h-6 w-6 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-slate-100 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <Frown className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                                    <p className="text-xs text-slate-500">Aucun modèle disponible pour le moment.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {imageSource === 'upload' && (
                        <div className="space-y-4">
                            <Input type="file" accept="image/*" onChange={handleImageUpload} className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 h-12 rounded-xl pt-2.5" disabled={uploadProgress !== null}/>
                            {uploadProgress !== null && <Progress value={uploadProgress} className="h-1.5"/>}
                        </div>
                    )}

                    {imageSource === 'url' && (
                        <FormField control={form.control} name="imageUrl" render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="URL de l'image..." {...field} onChange={(e) => { field.onChange(e); setImagePreview(e.target.value); }} className="h-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4 sticky bottom-6 z-20">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending} className="h-14 px-8 rounded-2xl font-bold">Annuler</Button>
                <Button type="submit" disabled={isPending || uploadProgress !== null} className="h-14 px-12 rounded-2xl bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-2xl">
                    {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                    {mode === 'create' ? "Enregistrer ma formation" : "Sauvegarder"}
                </Button>
            </div>
        </form>
    </Form>
  );
}
