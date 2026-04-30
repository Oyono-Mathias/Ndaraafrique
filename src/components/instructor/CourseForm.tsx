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
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Bot, Image as ImageIcon, Loader2, Sparkles, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Course, CourseTemplate } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

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
  const [imageSource, setImageSource] = useState<'upload' | 'template' | 'project'>('template');
  const { user, currentUser } = useRole();

  const isSanctioned = currentUser?.buyoutSanctions?.isSanctioned === true;

  const templatesQuery = useMemo(() => query(collection(db, 'course_templates'), orderBy('createdAt', 'desc')), [db]);
  const { data: customTemplates, isLoading: templatesLoading } = useCollection<CourseTemplate>(templatesQuery);

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

  const handleMathiasHelp = async () => {
    if (!currentUser?.hasAIAccess && currentUser?.aiCredits === 0) {
        toast({ 
            variant: 'destructive', 
            title: "Crédits épuisés", 
            description: "Passez à un abonnement Expert Premium pour continuer à utiliser Mathias IA." 
        });
        return;
    }

    const title = form.getValues('title');
    if (!title || title.length < 5) {
        toast({ variant: 'destructive', title: "Titre trop court", description: "Indiquez un titre précis." });
        return;
    }

    setIsAiLoading(true);
    try {
        const result = await assistCourseCreation({ courseTitle: title });
        form.setValue('description', result.description);
        if (courseCategories.includes(result.category)) {
            form.setValue('category', result.category);
        }
        toast({ title: "Contenu généré !" });
    } catch (error: any) {
        if (error.message?.includes('AI_PREMIUM_REQUIRED')) {
            toast({ variant: 'destructive', title: "Premium Requis", description: "Cette fonction est réservée aux Experts Premium." });
        } else {
            toast({ variant: 'destructive', title: "Erreur IA" });
        }
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
            {/* Affichage des crédits IA */}
            <div className="flex justify-between items-center bg-slate-900 border border-white/5 p-4 rounded-2xl mb-4">
                <div className="flex items-center gap-3">
                    <Bot className="text-primary" />
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Crédits Mathias IA</span>
                </div>
                <Badge className={cn(
                    "font-black text-[10px]",
                    currentUser?.aiCredits === 0 ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                )}>
                    {currentUser?.aiCredits} DISPONIBLES
                </Badge>
            </div>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] overflow-hidden">
                <CardHeader className="border-b dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <CardTitle className="text-xl font-bold uppercase tracking-tight">Contenu Pédagogique</CardTitle>
                            <CardDescription>L'IA Mathias peut vous aider à structurer votre savoir.</CardDescription>
                        </div>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={handleMathiasHelp} 
                            disabled={isAiLoading}
                            className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 rounded-xl h-10 px-4 font-bold"
                        >
                            {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Sparkles className="h-4 w-4 mr-2" />}
                            Mathias Assistant
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
                            <FormControl><Textarea placeholder="Décrivez votre formation..." {...field} rows={8} className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl resize-none p-4 leading-relaxed" /></FormControl>
                            <FormMessage />
                        </FormItem> 
                    )}/>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="submit" disabled={isPending} className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl">
                    {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    Enregistrer le brouillon
                </Button>
            </div>
        </form>
    </Form>
  );
}
