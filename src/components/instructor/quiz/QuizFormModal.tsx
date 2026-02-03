
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/RoleContext';
import { getFirestore, doc, collection, writeBatch, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import type { Quiz, Course, Question } from '@/lib/types';

const quizSchema = z.object({
  title: z.string().min(3, "Le titre est trop court."),
  courseId: z.string().min(1, "Veuillez sélectionner un cours."),
  questions: z.array(z.object({
    text: z.string().min(1, "L'énoncé est requis."),
    options: z.array(z.string().min(1, "L'option ne peut être vide.")).length(4, "Il faut exactement 4 options."),
    correctOptionIndex: z.coerce.number().min(0).max(3),
  })).min(1, "Ajoutez au moins une question."),
});

type QuizFormValues = z.infer<typeof quizSchema>;

interface QuizFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz | null;
  courses: Course[];
}

export function QuizFormModal({ isOpen, onOpenChange, quiz, courses }: QuizFormModalProps) {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();
  const [isPending, startTransition] = useTransition();

  const form = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: '',
      courseId: '',
      questions: [{ text: '', options: ['', '', '', ''], correctOptionIndex: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions"
  });

  useEffect(() => {
    if (quiz && isOpen) {
      const fetchQuestions = async () => {
        const qSnap = await getDocs(query(collection(db, `courses/${quiz.courseId}/sections/${quiz.sectionId}/quizzes/${quiz.id}/questions`), orderBy('order')));
        const fetchedQuestions = qSnap.docs.map(d => {
          const data = d.data();
          return {
            text: data.text,
            options: data.options.map((o: any) => o.text),
            correctOptionIndex: data.options.findIndex((o: any) => o.isCorrect)
          };
        });
        
        form.reset({
          title: quiz.title,
          courseId: quiz.courseId,
          questions: fetchedQuestions.length > 0 ? fetchedQuestions : [{ text: '', options: ['', '', '', ''], correctOptionIndex: 0 }]
        });
      };
      fetchQuestions();
    } else if (isOpen) {
      form.reset({
        title: '',
        courseId: '',
        questions: [{ text: '', options: ['', '', '', ''], correctOptionIndex: 0 }]
      });
    }
  }, [quiz, isOpen, form, db]);

  const onSubmit = async (values: QuizFormValues) => {
    if (!currentUser) return;
    
    startTransition(async () => {
      try {
        const batch = writeBatch(db);
        
        // Pour simplifier et garantir la performance demandée, on lie le quiz à la première section du cours
        // Dans une version plus avancée, on pourrait laisser choisir la section
        const sectionsSnap = await getDocs(collection(db, `courses/${values.courseId}/sections`));
        if (sectionsSnap.empty) {
          throw new Error("Le cours sélectionné n'a pas encore de sections. Créez une section d'abord.");
        }
        const sectionId = sectionsSnap.docs[0].id;

        let quizRef;
        if (quiz) {
          quizRef = doc(db, `courses/${quiz.courseId}/sections/${quiz.sectionId}/quizzes`, quiz.id);
        } else {
          quizRef = doc(collection(db, `courses/${values.courseId}/sections/${sectionId}/quizzes`));
        }

        const quizData = {
          title: values.title,
          courseId: values.courseId,
          sectionId: sectionId,
          instructorId: currentUser.uid,
          questionsCount: values.questions.length,
          updatedAt: serverTimestamp(),
          ...(quiz ? {} : { createdAt: serverTimestamp() })
        };

        batch.set(quizRef, quizData, { merge: true });

        // Gérer les questions (on supprime les anciennes et on réécrit tout pour la simplicité du prototype)
        // Note: Dans une app réelle, on ferait un diff pour économiser les écritures Firestore
        const questionsCol = collection(quizRef, 'questions');
        const oldQuestions = await getDocs(questionsCol);
        oldQuestions.forEach(d => batch.delete(d.ref));

        values.questions.forEach((q, index) => {
          const qRef = doc(questionsCol);
          batch.set(qRef, {
            text: q.text,
            order: index,
            options: q.options.map((opt, i) => ({
              text: opt,
              isCorrect: i === q.correctOptionIndex
            })),
            createdAt: serverTimestamp()
          });
        });

        await batch.commit();
        toast({ title: quiz ? "Quiz mis à jour" : "Quiz créé avec succès" });
        onOpenChange(false);
      } catch (error: any) {
        toast({ variant: 'destructive', title: "Erreur", description: error.message });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 dark:bg-slate-900 overflow-hidden">
        <DialogHeader className="p-6 border-b dark:border-slate-800">
          <DialogTitle>{quiz ? "Modifier le Quiz" : "Créer un nouveau Quiz"}</DialogTitle>
          <DialogDescription>Définissez le titre, le cours et les questions de votre évaluation.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-8 pb-8">
                {/* --- INFOS DE BASE --- */}
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titre du Quiz</FormLabel>
                        <FormControl><Input placeholder="Ex: Quiz final Chapitre 1" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="courseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cours associé</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir un cours" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* --- QUESTIONS --- */}
                <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      Questions ({fields.length})
                    </h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => append({ text: '', options: ['', '', '', ''], correctOptionIndex: 0 })}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Ajouter une question
                    </Button>
                  </div>

                  {fields.map((field, qIndex) => (
                    <div key={field.id} className="p-6 border rounded-xl bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 relative animate-in fade-in-0 zoom-in-95">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 text-slate-400 hover:text-destructive"
                        onClick={() => remove(qIndex)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`questions.${qIndex}.text`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-primary font-bold">Question {qIndex + 1}</FormLabel>
                              <FormControl><Input placeholder="Quelle est la capitale du..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-3">
                          <Label className="text-xs uppercase tracking-widest text-slate-500">Options de réponse</Label>
                          <FormField
                            control={form.control}
                            name={`questions.${qIndex}.correctOptionIndex`}
                            render={({ field }) => (
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value.toString()}
                                value={field.value.toString()}
                                className="grid gap-3"
                              >
                                {[0, 1, 2, 3].map((oIndex) => (
                                  <div key={oIndex} className="flex items-center gap-3">
                                    <FormControl>
                                      <RadioGroupItem value={oIndex.toString()} />
                                    </FormControl>
                                    <FormField
                                      control={form.control}
                                      name={`questions.${qIndex}.options.${oIndex}`}
                                      render={({ field: optField }) => (
                                        <div className="flex-1">
                                          <Input 
                                            placeholder={`Option ${oIndex + 1}`} 
                                            {...optField} 
                                            className={cn(
                                              "h-9",
                                              field.value.toString() === oIndex.toString() && "border-primary bg-primary/5"
                                            )}
                                          />
                                        </div>
                                      )}
                                    />
                                  </div>
                                ))}
                              </RadioGroup>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={isPending} className="px-8">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {quiz ? "Enregistrer les modifications" : "Créer le Quiz"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
