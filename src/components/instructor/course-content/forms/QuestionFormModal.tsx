
'use client';

import { useEffect, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { createQuestion, updateQuestion } from '@/actions/questionActions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  text: z.string().min(3, "Le texte de la question est requis."),
  options: z.array(z.object({ text: z.string().min(1, "Le texte de l'option ne peut être vide."), isCorrect: z.boolean() }))
    .min(2, "Au moins deux options sont requises.")
    .refine(options => options.some(opt => opt.isCorrect), {
      message: "Au moins une option doit être marquée comme correcte.",
    }),
});

interface QuestionFormModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    courseId: string;
    sectionId: string;
    quizId: string;
    question?: Question | null;
}

export function QuestionFormModal({ isOpen, onOpenChange, courseId, sectionId, quizId, question }: QuestionFormModalProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "options"
    });

    useEffect(() => {
        if (question) {
            form.reset({
                text: question.text,
                options: question.options,
            });
        } else {
            form.reset({ text: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] });
        }
    }, [question, form, isOpen]);
    
    const handleCorrectOptionChange = (selectedIndex: string) => {
        const index = parseInt(selectedIndex, 10);
        fields.forEach((field, i) => {
            form.setValue(`options.${i}.isCorrect`, i === index);
        });
    };

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            const result = question
                ? await updateQuestion({ courseId, sectionId, quizId, questionId: question.id, formData: values })
                : await createQuestion({ courseId, sectionId, quizId, formData: values });
            
            if(result.success){
                toast({ title: question ? 'Question modifiée' : 'Question créée' });
                onOpenChange(false);
            } else {
                toast({ variant: 'destructive', title: 'Erreur', description: JSON.stringify(result.error) });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader><DialogTitle>{question ? "Modifier" : "Ajouter"} une question</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="text" render={({ field }) => ( <FormItem><FormLabel>Texte de la question</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <div className="space-y-3">
                            <Label>Options de réponse</Label>
                             <RadioGroup onValueChange={handleCorrectOptionChange} defaultValue={fields.findIndex(f => f.isCorrect).toString()}>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-2">
                                        <FormControl>
                                            <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                                        </FormControl>
                                        <FormField
                                            control={form.control}
                                            name={`options.${index}.text`}
                                            render={({ field }) => ( <FormItem className="flex-1"><FormControl><Input {...field} /></FormControl></FormItem> )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))}
                             </RadioGroup>
                             <FormMessage>{form.formState.errors.options?.root?.message}</FormMessage>
                             <Button type="button" variant="outline" size="sm" onClick={() => append({ text: '', isCorrect: false })}>
                                <PlusCircle className="h-4 w-4 mr-2"/> Ajouter une option
                            </Button>
                        </div>
                        <DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Enregistrer</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
