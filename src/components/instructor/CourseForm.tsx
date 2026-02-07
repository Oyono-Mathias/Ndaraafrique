'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useRole } from '@/context/RoleContext';
import { assistCourseCreation } from '@/ai/flows/assist-course-creation';
import { PlaceHolderImages } from '@/lib/placeholder-images';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Bot, Image as ImageIcon, Loader2, Sparkles, LayoutGrid, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import type { Course } from '@/lib/types';
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

// ✅ Nouvelles catégories stratégiques Ndara Afrique
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
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [imageSource, setImageSource] = useState<'upload' | 'template' | 'url'>('template');
  const { user } = useRole();

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
    // ✅ Utilisation du chemin dynamique avec UID
    const storageRef = ref(storage, `courses/${user.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        toast({ 
            variant: 'destructive', 
            title: "Échec du téléversement", 
            description: "Erreur lors de l'envoi vers Firebase Storage." 
        });
        setUploadProgress(null);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          form.setValue('imageUrl', downloadURL);
          setImagePreview(downloadURL);
          setUploadProgress(null);
          toast({ title: "Image de formation prête !" });
        });
      }
    );
  };

  const handleSelectTemplate = (url: string) => {
      form.setValue('imageUrl', url);
      setImagePreview(url);
      toast({ title: "Template sélectionné" });
  };

  const handleMathiasHelp = async () => {
    const title = form.getValues('title');
    if (!title || title.length < 5) {
        toast({ variant: 'destructive', title: "Titre trop court", description: "Donnez un titre plus explicite pour que Mathias puisse vous aider." });
        return;
    }

    setIsAiLoading(true);
    try {
        const result = await assistCourseCreation({ courseTitle: title });
        form.setValue('description', result.description);
        // On garde la catégorie si elle est déjà dans notre liste fermée
        if (courseCategories.includes(result.category)) {
            form.setValue('category', result.category);
        }
        toast({ title: "Mathias a rédigé votre contenu !", description: "Vérifiez et ajustez si besoin." });
    } catch (error) {
        toast({ variant: 'destructive', title: "Erreur IA", description: "Mathias n'a pas pu répondre. Réessayez." });
    } finally {
        setIsAiLoading(false);
    }
  };

  const processSubmit = (data: CourseFormValues) => {
    startTransition(async () => {
      await onSubmit(data);
    });
  };
  
  const titleText = mode === 'create' ? 'Créer un nouveau cours' : 'Modifier le cours';

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-8 max-w-4xl mx-auto p-4 pb-24">
            {mode === 'create' && (
                <header className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <Link href="/instructor/courses"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{titleText}</h1>
                </header>
            )}
            
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="border-b dark:border-white/5">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl font-bold uppercase tracking-tight">Informations générales</CardTitle>
                            <CardDescription>Les détails essentiels qui décrivent votre cours.</CardDescription>
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
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Description</FormLabel><FormControl><Textarea placeholder="Décrivez ce que les étudiants apprendront..." {...field} rows={6} className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl resize-none" /></FormControl><FormMessage /></FormItem> )}/>
                </CardContent>
            </Card>
            
             <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden">
                    <CardHeader className="border-b dark:border-white/5"><CardTitle className="text-sm font-bold uppercase tracking-tight">Prix</CardTitle></CardHeader>
                    <CardContent className="pt-6">
                        <FormField control={form.control} name="price" render={({ field }) => ( <FormItem><div className="relative"><FormControl><Input type="number" placeholder="10000" {...field} className="h-12 pl-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl font-bold" /></FormControl><span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">XOF</span></div><FormDescription className="text-[10px]">Mettre 0 pour gratuit.</FormDescription><FormMessage /></FormItem> )}/>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden">
                    <CardHeader className="border-b dark:border-white/5"><CardTitle className="text-sm font-bold uppercase tracking-tight">Catégorie</CardTitle></CardHeader>
                    <CardContent className="pt-6">
                        <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"><SelectValue placeholder="Sélectionnez" /></SelectTrigger></FormControl><SelectContent>{courseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                    </CardContent>
                </Card>
            </div>
            
             <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="border-b dark:border-white/5">
                    <CardTitle className="text-xl font-bold uppercase tracking-tight">Image de couverture</CardTitle>
                    <CardDescription>Indispensable pour attirer vos futurs étudiants.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                   <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950/50">
                        {imagePreview ? (
                            <Image src={imagePreview} alt="Aperçu du cours" fill className="object-cover animate-in fade-in duration-500" />
                        ) : (
                             <div className="text-center text-slate-400">
                                <ImageIcon className="mx-auto h-12 w-12 opacity-20" />
                                <p className="mt-2 text-xs font-bold uppercase tracking-widest">Aucune image</p>
                             </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant={imageSource === 'template' ? 'default' : 'outline'} onClick={() => setImageSource('template')} size="sm" className="rounded-xl h-10 px-4 font-bold text-[10px] uppercase tracking-widest"><LayoutGrid className="h-3.5 w-3.5 mr-2" /> Templates</Button>
                        <Button type="button" variant={imageSource === 'upload' ? 'default' : 'outline'} onClick={() => setImageSource('upload')} size="sm" className="rounded-xl h-10 px-4 font-bold text-[10px] uppercase tracking-widest"><ImageIcon className="h-3.5 w-3.5 mr-2" /> Téléverser</Button>
                        <Button type="button" variant={imageSource === 'url' ? 'default' : 'outline'} onClick={() => setImageSource('url')} size="sm" className="rounded-xl h-10 px-4 font-bold text-[10px] uppercase tracking-widest"><LinkIcon className="h-3.5 w-3.5 mr-2" /> URL Externe</Button>
                    </div>

                    {imageSource === 'template' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in slide-in-from-top-2 duration-300">
                            {PlaceHolderImages.slice(0, 8).map((img) => (
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
                                            <CheckCircle2 className="h-6 w-6 text-white drop-shadow-md" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {imageSource === 'upload' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <Input type="file" accept="image/*" onChange={handleImageUpload} className="file:cursor-pointer bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 h-12 rounded-xl pt-2.5" disabled={uploadProgress !== null}/>
                            {uploadProgress !== null && (
                                <div className="space-y-2">
                                    <Progress value={uploadProgress} className="h-1.5"/>
                                    <p className="text-[10px] text-center text-slate-500 uppercase font-black tracking-[0.2em]">Envoi : {Math.round(uploadProgress)}%</p>
                                </div>
                            )}
                        </div>
                    )}

                    {imageSource === 'url' && (
                        <FormField control={form.control} name="imageUrl" render={({ field }) => (
                            <FormItem className="animate-in slide-in-from-top-2 duration-300">
                                <FormControl>
                                    <Input 
                                        placeholder="Collez l'URL d'une image ici..." 
                                        {...field} 
                                        onChange={(e) => { field.onChange(e); setImagePreview(e.target.value); }}
                                        className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4 sticky bottom-6 z-20">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending} className="h-14 px-8 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold">
                    Annuler
                </Button>
                <Button type="submit" disabled={isPending || uploadProgress !== null} className="h-14 px-12 rounded-2xl bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all">
                    {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                    {mode === 'create' ? "Publier ma formation" : "Enregistrer"}
                </Button>
            </div>
        </form>
    </Form>
  );
}