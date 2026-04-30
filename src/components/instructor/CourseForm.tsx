'use client';

import { useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { assistCourseCreation } from '@/ai/flows/assist-course-creation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Bot, 
    Loader2, 
    Sparkles, 
    CheckCircle2, 
    Coins, 
    LayoutGrid, 
    ImageIcon, 
    Info,
    Wallet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Course } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

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
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { currentUser } = useRole();

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
    if (!currentUser) return;

    const title = form.getValues('title');
    if (!title || title.length < 5) {
        toast({ variant: 'destructive', title: "Titre trop court", description: "Indiquez un titre précis pour aider Mathias." });
        return;
    }

    setIsAiLoading(true);
    try {
        const result = await assistCourseCreation({ 
            courseTitle: title,
            userId: currentUser.uid 
        });
        form.setValue('description', result.description, { shouldValidate: true });
        if (courseCategories.includes(result.category)) {
            form.setValue('category', result.category, { shouldValidate: true });
        }
        toast({ title: "Contenu généré !", description: "1 crédit Mathias IA utilisé avec succès." });
    } catch (error: any) {
        if (error.message?.includes('AI_PREMIUM_REQUIRED')) {
            toast({ variant: 'destructive', title: "Premium Requis", description: "Vous n'avez plus de crédits Mathias IA. Passez au mode Premium." });
        } else {
            toast({ variant: 'destructive', title: "Erreur IA", description: "Une erreur est survenue lors de la génération." });
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
        <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-8 max-w-4xl mx-auto p-4 pb-32">
            
            {/* 🤖 MATHIAS STATUS BAR */}
            <div className="flex justify-between items-center bg-slate-900 border border-white/5 p-4 rounded-2xl shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Bot className="text-primary h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Status Copilote</p>
                        <span className="text-xs font-bold text-white uppercase">Mathias IA Assistant</span>
                    </div>
                </div>
                <Badge className={cn(
                    "font-black text-[10px] px-3 py-1",
                    currentUser?.aiCredits === 0 ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                )}>
                    {currentUser?.aiCredits || 0} CRÉDITS DISPONIBLES
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- COLONNE PRINCIPALE (CONTENU) --- */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="bg-slate-900 border-white/5 shadow-2xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                    <CardTitle className="text-xl font-black text-white uppercase tracking-tight">Cœur du Savoir</CardTitle>
                                    <CardDescription className="text-slate-500 font-medium italic">Définissez l'âme de votre formation.</CardDescription>
                                </div>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleMathiasHelp} 
                                    disabled={isAiLoading}
                                    className="bg-primary/5 border-primary/20 text-primary hover:bg-primary hover:text-slate-950 rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest transition-all"
                                >
                                    {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Sparkles className="h-4 w-4 mr-2" />}
                                    Mathias Assistant
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 p-8">
                            <FormField control={form.control} name="title" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Titre de l'enseignement</FormLabel>
                                    <FormControl><Input placeholder="Ex: Maîtriser la Fintech Africaine" {...field} className="h-14 bg-slate-950 border-slate-800 rounded-xl text-white font-bold text-lg focus-visible:ring-primary/20" /></FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                            <FormField control={form.control} name="description" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Résumé & Objectifs Pédagogiques</FormLabel>
                                    <FormControl><Textarea placeholder="Que vont apprendre vos futurs Ndara ?" {...field} rows={10} className="bg-slate-950 border-slate-800 rounded-xl resize-none p-5 leading-relaxed text-white italic font-serif" /></FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        </CardContent>
                    </Card>
                </div>

                {/* --- COLONNE LATÉRALE (PARAMÈTRES) --- */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* SECTION PRIX */}
                    <Card className="bg-slate-900 border-white/5 shadow-xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="p-6 border-b border-white/5 bg-emerald-500/5">
                            <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-2 tracking-[0.2em]">
                                <Wallet size={16} /> Valeur Marchande
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <FormField control={form.control} name="price" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase text-slate-500">Prix de vente (XOF)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 rounded-xl text-2xl font-black text-white px-6" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 font-black text-xs">FCFA</span>
                                        </div>
                                    </FormControl>
                                    <FormDescription className="text-[10px] italic">Indiquez 0 pour offrir ce cours gratuitement.</FormDescription>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        </CardContent>
                    </Card>

                    {/* SECTION CATÉGORIE */}
                    <Card className="bg-slate-900 border-white/5 shadow-xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="p-6 border-b border-white/5 bg-blue-500/5">
                            <CardTitle className="text-xs font-black uppercase text-blue-400 flex items-center gap-2 tracking-[0.2em]">
                                <LayoutGrid size={16} /> Classification
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <FormField control={form.control} name="category" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase text-slate-500">Domaine d'expertise</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white font-bold">
                                                <SelectValue placeholder="Choisir une catégorie" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            {courseCategories.map(cat => <SelectItem key={cat} value={cat} className="font-bold py-3 uppercase text-[10px] tracking-widest">{cat}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        </CardContent>
                    </Card>

                    {/* SECTION IMAGE */}
                    <Card className="bg-slate-900 border-white/5 shadow-xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="p-6 border-b border-white/5 bg-amber-500/5">
                            <CardTitle className="text-xs font-black uppercase text-amber-500 flex items-center gap-2 tracking-[0.2em]">
                                <ImageIcon size={16} /> Couverture
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <FormField control={form.control} name="imageUrl" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase text-slate-500">URL de l'image illustrative</FormLabel>
                                    <FormControl><Input placeholder="https://..." {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl text-xs font-mono" /></FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                            {form.watch('imageUrl') && (
                                <div className="aspect-video relative rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                                    <Image src={form.watch('imageUrl')} alt="Preview" fill className="object-cover" />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* --- ACTION FOOTER --- */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-40 md:left-72">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div className="hidden sm:flex items-center gap-3 text-slate-500">
                        <Info size={20} />
                        <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                            Le cours restera en <span className="text-white">Brouillon</span> jusqu'à ce que <br/>vous le soumettiez à Mathias.
                        </p>
                    </div>
                    <Button 
                        type="submit" 
                        disabled={isPending} 
                        className="flex-1 sm:flex-none h-16 px-12 rounded-[2rem] bg-primary hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-95"
                    >
                        {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                        {mode === 'create' ? "Initialiser la formation" : "Sauvegarder les détails"}
                    </Button>
                </div>
            </div>
        </form>
    </Form>
  );
}
