
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { sendUserNotification } from '@/actions/notificationActions';

const questionSchema = z.object({
  questionText: z.string().min(10, "Votre question doit faire au moins 10 caractères."),
});

interface AskQuestionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  lessonId?: string;
  lessonTitle?: string;
}

/**
 * @fileOverview Modal permettant à l'étudiant de poser une question au formateur.
 * Résilient : Enregistre la question même si la notification échoue.
 */
export function AskQuestionModal({ 
    isOpen, 
    onOpenChange, 
    courseId, 
    courseTitle, 
    instructorId,
    lessonId,
    lessonTitle
}: AskQuestionModalProps) {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const db = getFirestore();

  const form = useForm<z.infer<typeof questionSchema>>({
    resolver: zodResolver(questionSchema),
    defaultValues: { questionText: '' },
  });

  const onSubmit = async (values: z.infer<typeof questionSchema>) => {
    if (!currentUser) return;
    
    // Sécurité : Vérifier si l'instructorId est présent
    if (!instructorId || instructorId === 'none' || instructorId === '') {
        toast({ 
            variant: 'destructive', 
            title: "Action impossible", 
            description: "Ce cours n'a pas de formateur assigné pour répondre à vos questions." 
        });
        return;
    }

    setIsSubmitting(true);

    try {
      const isLessonQuestion = !!lessonId;
      const collectionName = isLessonQuestion ? 'lesson_questions' : 'questions';

      // 1. Enregistrement de la question
      const payload: any = {
        courseId,
        instructorId,
        studentId: currentUser.uid,
        studentName: currentUser.fullName,
        studentAvatarUrl: currentUser.profilePictureURL || '',
        questionText: values.questionText,
        createdAt: serverTimestamp(),
      };

      if (isLessonQuestion) {
          payload.lessonId = lessonId;
          payload.lessonTitle = lessonTitle || '';
          payload.replies = [];
      } else {
          payload.courseTitle = courseTitle;
          payload.status = 'pending';
      }

      await addDoc(collection(db, collectionName), payload);

      // 2. Notification de l'instructeur
      try {
          await sendUserNotification(instructorId, {
            text: isLessonQuestion 
                ? `Nouvelle question dans la leçon "${lessonTitle}" par ${currentUser.fullName}.`
                : `Nouvelle question de ${currentUser.fullName} sur le cours "${courseTitle}".`,
            link: isLessonQuestion ? `/instructor/questions-reponses` : `/instructor/questions-reponses`, // Could be improved with direct links
            type: 'info'
          });
      } catch (notifyError) {
          console.warn("Question enregistrée mais échec de la notification formateur:", notifyError);
      }

      toast({ title: "Question envoyée !", description: "Le formateur vous répondra prochainement." });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error("AskQuestion Error:", error);
      toast({ 
        variant: 'destructive', 
        title: "Erreur d'envoi", 
        description: "Une erreur technique empêche l'envoi. Vérifiez votre connexion." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 rounded-[2rem] overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-white flex items-center gap-2 uppercase tracking-tight font-black">
            <MessageSquare className="h-5 w-5 text-primary" />
            {lessonId ? "Question sur la leçon" : "Poser une question"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs font-medium">
            {lessonId ? `Sujet : ${lessonTitle}` : "Votre formateur vous répondra directement dans votre espace."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-6">
            <FormField
              control={form.control}
              name="questionText"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea 
                      placeholder="Décrivez votre question ou le point qui vous bloque..." 
                      rows={5}
                      className="bg-slate-850 border-slate-700 text-white resize-none p-4 rounded-2xl focus-visible:ring-primary/30 text-sm leading-relaxed"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                Envoyer ma question
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
