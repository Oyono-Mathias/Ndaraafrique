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
import { cn } from '@/lib/utils';

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
        
        // Pour garantir le fonctionnement, on lie le quiz à la première section du cours
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
          id: quizRef.id,
          title: values.title,
          courseId: values.courseId,
          sectionId: sectionId,
          instructorId: currentUser.uid,
          questionsCount: values.questions.length,
          updatedAt: serverTimestamp(),
          ...(quiz ? {} : { createdAt: serverTimestamp() })
        };

        batch.set(quizRef, quizData, { merge: true });

        // Gérer les questions
        const questionsCol = collection(quizRef, 'questions');
        const oldQuestions = await getDocs(questionsCol);
        oldQuestions.forEach(d => batch.delete(d.ref));

        values.questions.forEach((q, index) => {
          const qRef = doc(questionsCol);
          batch.set(qRef, {
            id: qRef.id,
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
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 dark:bg-slate-900 overflow-hidden rounded-[2rem] border-slate-800">
        <DialogHeader className="p-8 border-b dark:border-white/5 bg-slate-900">
          <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Configuration du Quiz</DialogTitle>
          <DialogDescription className="text-slate-500">Créez une évaluation interactive pour vos élèves.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-8 bg-slate-950/50">
              <div className="space-y-8 pb-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Titre du Quiz</FormLabel>
                        <FormControl><Input placeholder="Ex: Évaluation Finale" {...field} className="h-12 bg-slate-900 border-slate-800 rounded-xl" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="courseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Cours associé</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 bg-slate-900 border-slate-800 rounded-xl">
                              <SelectValue placeholder="Choisir un cours" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">
                      Questions ({fields.length})
                    </h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => append({ text: '', options: ['', '', '', ''], correctOptionIndex: 0 })}
                      className="rounded-xl border-slate-800 bg-slate-900 hover:bg-slate-800 h-10 px-4"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Question
                    </Button>
                  </div>

                  {fields.map((field, qIndex) => (
                    <div key={field.id} className="p-6 border border-slate-800 rounded-3xl bg-slate-900 shadow-xl relative animate-in fade-in-0 zoom-in-95 duration-500">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 right-4 text-slate-600 hover:text-red-500 h-8 w-8 rounded-full"
                        onClick={() => remove(qIndex)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name={`questions.${qIndex}.text`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest mb-2 block">Énoncé {qIndex + 1}</FormLabel>
                              <FormControl><Input placeholder="Saisissez la question..." {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] ml-1">Options (Cochez la bonne réponse)</Label>
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
                                  <div key={oIndex} className="flex items-center gap-4 bg-slate-950/50 p-2 rounded-2xl border border-white/5">
                                    <FormControl>
                                      <RadioGroupItem value={oIndex.toString()} className="h-5 w-5 border-slate-700 data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                                    </FormControl>
                                    <FormField
                                      control={form.control}
                                      name={`questions.${qIndex}.options.${oIndex}`}
                                      render={({ field: optField }) => (
                                        <div className="flex-1">
                                          <Input 
                                            placeholder={`Réponse ${oIndex + 1}`} 
                                            {...optField} 
                                            className={cn(
                                              "h-10 bg-transparent border-none focus-visible:ring-0",
                                              field.value.toString() === oIndex.toString() && "text-primary font-bold"
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

            <DialogFooter className="p-8 border-t dark:border-white/5 bg-slate-900 safe-area-pb">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-14 px-8 font-bold text-slate-500">Annuler</Button>
              <Button type="submit" disabled={isPending} className="h-14 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-[0.98]">
                {isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                {quiz ? "Mettre à jour" : "Publier le Quiz"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
