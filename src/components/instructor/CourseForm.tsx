'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { ArrowLeft, Bot, Image as ImageIcon, Loader2, Sparkles, LayoutGrid, CheckCircle2, Frown, Globe, UploadCloud, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Course, CourseTemplate } from '@/lib/types';

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
    "Marketing Digital",
    "Soft Skills"
];

export function CourseForm({ mode, initialData, onSubmit }: CourseFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const db = getFirestore();
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [imageSource, setImageSource] = useState<'upload' | 'template'>('template');
  const { user, currentUser } = useRole();

  // 🛡️ SÉCURITÉ CEO : Vérifier si l'instructeur est sanctionné pour rachat frauduleux
  const isSanctioned = currentUser?.buyoutSanctions?.isSanctioned === true;

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

  if (isSanctioned) {
      return (
          <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-700">
              <Card className="bg-red-500/10 border-red-500/20 rounded-[2rem] p-12 text-center space-y-6">
                  <div className="p-4 bg-red-500/20 rounded-full inline-block">
                      <ShieldAlert className="h-16 w-16 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Compte Restreint</h2>
                  <p className="text-slate-400 leading-relaxed">
                      Votre droit de publication a été révoqué pour violation des règles de cession de droits intellectuels. <br/>
                      <b>Raison :</b> {currentUser?.buyoutSanctions?.reason || 'Non spécifiée'}
                  </p>
                  <Button asChild variant="outline" className="mt-8 border-slate-800 bg-slate-900 rounded-xl">
                      <Link href="/instructor/dashboard">Retour au tableau de bord</Link>
                  </Button>
              </Card>
          </div>
      );
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', user.uid);
        formData.append('folder', 'course_covers');

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        form.setValue('imageUrl', data.url);
        setImagePreview(data.url);
        toast({ title: "Image transmise !", description: "Elle est maintenant hébergée sur votre infrastructure CDN." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Erreur de téléversement", description: error.message });
    } finally {
        setIsUploading(false);
    }
  };

  const handleSelectTemplate = (url: string) => {
      form.setValue('imageUrl', url);
      setImagePreview(url);
      toast({ title: "Modèle appliqué" });
  };

  const handleMathiasHelp = async () => {
    const title = form.getValues('title');
    if (!title || title.length < 5) {
        toast({ variant: 'destructive', title: "Titre trop court", description: "Donnez un titre plus précis pour que Mathias puisse vous aider." });
        return;
    }

    setIsAiLoading(true);
    try {
        const result = await assistCourseCreation({ courseTitle: title });
        form.setValue('description', result.description);
        if (courseCategories.includes(result.category)) {
            form.setValue('category', result.category);
        }
        toast({ title: "Mathias a rédigé votre contenu !", description: "Vérifiez et ajustez si besoin." });
    } catch (error) {
        toast({ variant: 'destructive', title: "Erreur IA", description: "L'assistant n'a pas pu générer le contenu." });
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
                <header className="flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
                    <Button variant="outline" size="icon" asChild className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
                        <Link href="/instructor/courses"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Nouvelle Formation</h1>
                        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Identité du savoir</p>
                    </div>
                </header>
            )}
            
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] overflow-hidden">
                <CardHeader className="border-b dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <CardTitle className="text-xl font-bold uppercase tracking-tight">Contenu Pédagogique</CardTitle>
                            <CardDescription>Décrivez votre expertise aux futurs Ndara.</CardDescription>
                        </div>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={handleMathiasHelp} 
                            disabled={isAiLoading}
                            className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 rounded-xl h-10 px-4 font-bold"
                        >
                            {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Bot className="h-4 w-4 mr-2" />}
                            Aide de Mathias
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 p-8">
                    <FormField control={form.control} name="title" render={({ field }) => ( 
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Titre de la formation</FormLabel>
                            <FormControl><Input placeholder="Ex: Devenir Expert en Finance Digitale" {...field} className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-bold" /></FormControl>
                            <FormMessage />
                        </FormItem> 
                    )}/>
                    <FormField control={form.control} name="description" render={({ field }) => ( 
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Résumé & Objectifs</FormLabel>
                            <FormControl><Textarea placeholder="Décrivez ce que vos étudiants vont accomplir..." {...field} rows={8} className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl resize-none p-4 leading-relaxed" /></FormControl>
                            <FormMessage />
                        </FormItem> 
                    )}/>
                </CardContent>
            </Card>
            
             <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-6 border-b dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Tarification (XOF)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <FormField control={form.control} name="price" render={({ field }) => ( 
                            <FormItem>
                                <FormControl><Input type="number" {...field} className="h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-black text-2xl" /></FormControl>
                                <FormDescription className="text-[10px] italic">Laissez à 0 pour un cours gratuit.</FormDescription>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-6 border-b dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Domaine</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <FormField control={form.control} name="category" render={({ field }) => ( 
                            <FormItem>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-bold">
                                            <SelectValue placeholder="Choisir une catégorie" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        {courseCategories.map(cat => <SelectItem key={cat} value={cat} className="font-bold py-3">{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                    </CardContent>
                </Card>
            </div>
            
             <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] overflow-hidden">
                <CardHeader className="p-8 border-b dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30">
                    <CardTitle className="text-xl font-bold uppercase tracking-tight">Visuel de Couverture</CardTitle>
                    <CardDescription>Importez une image percutante ou utilisez nos modèles.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                   <div className="w-full aspect-video rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950 shadow-inner group">
                        {imagePreview ? (
                            <Image src={imagePreview} alt="Aperçu" fill className="object-cover animate-in fade-in duration-700" />
                        ) : (
                             <div className="text-center text-slate-400 space-y-2">
                                <ImageIcon className="mx-auto h-16 w-16 opacity-10" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Aucun visuel défini</p>
                             </div>
                        )}
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-8 z-20">
                                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                                <p className="text-white font-black text-xs uppercase tracking-widest animate-pulse">Téléversement...</p>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                             <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white font-black uppercase text-[10px]">Modifier le visuel</div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl w-fit border border-slate-200 dark:border-slate-800">
                        <Button type="button" variant={imageSource === 'template' ? 'default' : 'ghost'} onClick={() => setImageSource('template')} size="sm" className="rounded-xl font-black text-[9px] uppercase tracking-widest h-10 px-4">Modèles Ndara</Button>
                        <Button type="button" variant={imageSource === 'upload' ? 'default' : 'ghost'} onClick={() => setImageSource('upload')} size="sm" className="rounded-xl font-black text-[9px] uppercase tracking-widest h-10 px-4">Téléverser mon fichier</Button>
                    </div>

                    {imageSource === 'template' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                            {templatesLoading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-video rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
                                </div>
                            ) : templates && templates.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {templates.map((img) => (
                                        <button
                                            key={img.id}
                                            type="button"
                                            onClick={() => handleSelectTemplate(img.imageUrl)}
                                            className={cn(
                                                "relative aspect-video rounded-2xl overflow-hidden border-2 transition-all group active:scale-95",
                                                form.watch('imageUrl') === img.imageUrl ? "border-primary ring-4 ring-primary/10 shadow-2xl" : "border-transparent opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            <Image src={img.imageUrl} alt={img.description} fill className="object-cover" />
                                            {form.watch('imageUrl') === img.imageUrl && (
                                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                    <CheckCircle2 className="h-8 w-8 text-white shadow-lg" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-950/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                    <Frown className="h-10 w-10 mx-auto text-slate-300 mb-2 opacity-20" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aucun modèle prêt.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {imageSource === 'upload' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                            <label className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors">
                                <UploadCloud className="h-10 w-10 text-primary mb-2" />
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Choisir un fichier JPG/PNG</span>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading}/>
                            </label>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row justify-end gap-4 sticky bottom-6 z-20 pt-4 border-t border-white/5 bg-slate-950/80 backdrop-blur-xl p-4 -m-4 rounded-t-3xl">
                <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending} className="h-14 px-8 rounded-2xl font-bold text-slate-500 uppercase text-[10px] tracking-widest">Annuler</Button>
                <Button type="submit" disabled={isPending || isUploading} className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30 transition-all active:scale-[0.98]">
                    {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                    {mode === 'create' ? "Initialiser la formation" : "Sauvegarder les changements"}
                </Button>
            </div>
        </form>
    </Form>
  );
}
