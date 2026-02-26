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
}

/**
 * @fileOverview Modal permettant à l'étudiant de poser une question au formateur.
 * Enregistre la question dans Firestore et notifie l'instructeur.
 */
export function AskQuestionModal({ isOpen, onOpenChange, courseId, courseTitle, instructorId }: AskQuestionModalProps) {
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
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'questions'), {
        courseId,
        courseTitle,
        instructorId,
        studentId: currentUser.uid,
        studentName: currentUser.fullName,
        studentAvatarUrl: currentUser.profilePictureURL || '',
        questionText: values.questionText,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Notifier l'instructeur
      await sendUserNotification(instructorId, {
        text: `Nouvelle question de ${currentUser.fullName} sur le cours "${courseTitle}".`,
        link: `/instructor/questions-reponses`,
        type: 'info'
      });

      toast({ title: "Question envoyée !", description: "Le formateur vous répondra prochainement." });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible d'envoyer votre question." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Poser une question
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Votre formateur vous répondra directement dans votre espace "Mes Questions".
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="questionText"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea 
                      placeholder="Décrivez votre question ou le point qui vous bloque..." 
                      rows={5}
                      className="bg-slate-800 border-slate-700 text-white resize-none p-4 rounded-xl focus-visible:ring-primary/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest shadow-xl">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Envoyer ma question
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}