
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next-intl/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  getFirestore,
  doc,
  collection,
  query,
  orderBy,
  writeBatch,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import type { Quiz, Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, PlusCircle, Trash2, HelpCircle, CheckCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


const optionSchema = z.object({
  value: z.string().min(1, "L'option ne peut pas être vide."),
});

const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(5, 'La question doit contenir au moins 5 caractères.'),
  options: z.array(optionSchema).min(2, 'Il faut au moins deux options.'),
  correctOptionIndex: z.string().refine(val => val !== undefined, { message: "Veuillez sélectionner la bonne réponse." }),
});

const quizFormSchema = z.object({
  title: z.string().min(3, "Le titre est requis."),
  description: z.string().optional(),
  questions: z.array(questionSchema),
});

type QuizFormValues = z.infer<typeof quizFormSchema>;

const QuestionCard = ({ qIndex, form, onRemove }: { qIndex: number, form: any, onRemove: (index: number) => void }) => {
  const { fields: optionFields, append, remove } = useFieldArray({
    control: form.control,
    name: `questions.${qIndex}.options`,
  });

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  return (
    <>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
            <CardHeader className="flex flex-row items-center justify-between p-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-slate-200">
                    <HelpCircle className="h-5 w-5 text-primary"/>
                    Question {qIndex + 1}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsDeleteAlertOpen(true)}>
                <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
                <FormField
                control={form.control}
                name={`questions.${qIndex}.text`}
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="dark:text-slate-300">Énoncé de la question</FormLabel>
                    <FormControl><Textarea {...field} placeholder="Quelle est la capitale du Cameroun ?" className="dark:bg-slate-700 dark:border-slate-600" /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name={`questions.${qIndex}.correctOptionIndex`}
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="dark:text-slate-300">Options de réponse (cochez la bonne)</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                        {optionFields.map((option, oIndex) => (
                            <div key={option.id} className="flex items-center gap-2">
                                <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
                                <FormField
                                    control={form.control}
                                    name={`questions.${qIndex}.options.${oIndex}.value`}
                                    render={({ field }) => (
                                        <Input {...field} placeholder={`Option ${oIndex + 1}`} className="dark:bg-slate-700 dark:border-slate-600"/>
                                    )}
                                />
                                {optionFields.length > 2 && <Button type="button" size="icon" variant="ghost" onClick={() => remove(oIndex)}><Trash2 className="h-4 w-4"/></Button>}
                            </div>
                        ))}
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })} disabled={optionFields.length >= 5}>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une option
                </Button>
            </CardContent>
        </Card>
        
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la suppression ?</AlertDialogTitle>
                    <AlertDialogDescription>Cette question sera définitivement supprimée de votre quiz.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onRemove(qIndex)} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}


export default function EditQuizPage() {
  const { quizId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const db = getFirestore();

  const [isSaving, setIsSaving] = useState(false);
  const [removedQuestions, setRemovedQuestions] = useState<string[]>([]);
  
  const quizRef = useMemoFirebase(() => doc(db, 'quizzes', quizId as string), [db, quizId]);
  const { data: quiz, isLoading: isQuizLoading } = useDoc<Quiz>(quizRef);
  
  const questionsQuery = useMemoFirebase(() => query(collection(db, `quizzes/${quizId}/questions`)), [db, quizId]);
  const { data: questions, isLoading: areQuestionsLoading } = useCollection<Question>(questionsQuery);
  
  const form = useForm<QuizFormValues>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: { title: '', description: '', questions: [] },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'questions',
  });

  useEffect(() => {
    if (quiz && questions) {
      form.reset({
        title: quiz.title,
        description: quiz.description || '',
        questions: questions.map(q => ({
            ...q,
            correctOptionIndex: q.correctOptionIndex?.toString(),
            options: q.options?.map(opt => ({ value: opt })) || []
        })),
      });
    }
  }, [quiz, questions, form]);

  const handleRemoveQuestion = (index: number) => {
    const questionId = form.getValues(`questions.${index}.id`);
    if (questionId) {
      setRemovedQuestions(prev => [...prev, questionId]);
    }
    remove(index);
  };
  
  const onSubmit = async (data: QuizFormValues) => {
    if (!quiz) return;
    setIsSaving(true);
    const batch = writeBatch(db);

    try {
      batch.update(quizRef, { title: data.title, description: data.description });

      removedQuestions.forEach(qId => {
        batch.delete(doc(db, `quizzes/${quizId}/questions`, qId));
      });

      data.questions.forEach(question => {
        const questionRef = question.id
          ? doc(db, `quizzes/${quizId}/questions`, question.id)
          : doc(collection(db, `quizzes/${quizId}/questions`));
        
        batch.set(questionRef, {
          text: question.text,
          options: question.options.map(opt => opt.value),
          correctOptionIndex: parseInt(question.correctOptionIndex, 10),
        });
      });
      
      await batch.commit();
      toast({ title: 'Quiz enregistré avec succès !', icon: <CheckCircle className="h-5 w-5 text-green-500" /> });
      setRemovedQuestions([]);
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder le quiz.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isQuizLoading || areQuestionsLoading) {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      <Button variant="ghost" onClick={() => router.push(`/instructor/quiz/${quiz?.courseId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour à la liste des quiz
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} className="text-2xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto bg-transparent dark:text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea {...field} placeholder="Description du quiz (facultatif)" className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 bg-transparent text-muted-foreground" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardHeader>
            </Card>
          
          <div className="space-y-4">
             {fields.map((question, qIndex) => (
                <QuestionCard key={question.id} qIndex={qIndex} form={form} onRemove={handleRemoveQuestion} />
             ))}
          </div>

          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => append({ text: '', options: [{ value: '' }, { value: '' }], correctOptionIndex: '0' })}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter une question
          </Button>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t dark:border-slate-700 md:relative md:p-0 md:bg-transparent md:border-none md:flex md:justify-end">
            <Button type="submit" disabled={isSaving} className="w-full md:w-auto h-12 md:h-auto text-base md:text-sm">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
