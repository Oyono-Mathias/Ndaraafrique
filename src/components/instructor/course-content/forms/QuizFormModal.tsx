
'use client';

import { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { createQuiz, updateQuiz } from '@/actions/quizActions';
import type { Quiz } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(3, "Le titre est requis."),
  description: z.string().optional(),
});

interface QuizFormModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    courseId: string;
    sectionId: string;
    quiz?: Quiz;
}

export function QuizFormModal({ isOpen, onOpenChange, courseId, sectionId, quiz }: QuizFormModalProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        if (quiz) {
            form.reset({
                title: quiz.title || '',
                description: quiz.description || '',
            });
        } else {
            form.reset({ title: '', description: '' });
        }
    }, [quiz, form, isOpen]);

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            const result = quiz
                ? await updateQuiz({ courseId, sectionId, quizId: quiz.id, formData: values })
                : await createQuiz({ courseId, sectionId, formData: values });
            
            if(result.success){
                toast({ title: quiz ? 'Quiz modifié' : 'Quiz créé' });
                onOpenChange(false);
            } else {
                toast({ variant: 'destructive', title: 'Erreur', description: JSON.stringify(result.error) });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader><DialogTitle>{quiz ? "Modifier" : "Ajouter"} un quiz</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Titre du quiz</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description (optionnel)</FormLabel><FormControl><Textarea {...field}/></FormControl><FormMessage /></FormItem> )}/>
                        <DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Enregistrer</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
