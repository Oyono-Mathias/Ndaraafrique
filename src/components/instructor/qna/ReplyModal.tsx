'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, Loader2, BookOpen, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { answerQuestionAction } from '@/actions/qnaActions';
import type { CourseQuestion } from '@/lib/types';
import { useRole } from '@/context/RoleContext';

const replySchema = z.object({
  answerText: z.string().min(10, "La réponse doit contenir au moins 10 caractères."),
});

interface ReplyModalProps {
  question: CourseQuestion | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReplyModal({ question, isOpen, onOpenChange }: ReplyModalProps) {
  const { toast } = useToast();
  const { currentUser } = useRole();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof replySchema>>({
    resolver: zodResolver(replySchema),
  });
  
  useEffect(() => {
    if (question) {
      form.reset({
        answerText: question.answerText || '',
      });
    }
  }, [question, form]);


  if (!question) return null;

  const onSubmit = async (values: z.infer<typeof replySchema>) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    const result = await answerQuestionAction({
      questionId: question.id,
      answerText: values.answerText,
      instructorId: currentUser.uid,
      studentId: question.studentId,
    });
    
    if (result.success) {
      toast({ title: "Réponse envoyée !", description: "L'étudiant sera notifié." });
      onOpenChange(false);
    } else {
      toast({ variant: 'destructive', title: 'Erreur', description: result.error });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Répondre à la question</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg space-y-3">
                 <div className="flex items-center gap-3">
                    <Avatar><AvatarImage src={question.studentAvatarUrl} /><AvatarFallback>{question.studentName.charAt(0)}</AvatarFallback></Avatar>
                    <div>
                        <p className="font-semibold text-white">{question.studentName}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2"><BookOpen className="h-3 w-3"/>{question.courseTitle}</p>
                    </div>
                </div>
                <p className="text-slate-300 italic">"{question.questionText}"</p>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="answerText" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Votre réponse</FormLabel>
                    <FormControl><Textarea rows={8} placeholder="Rédigez une réponse claire et constructive..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <DialogFooter className="pt-4">
                    <DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>} Envoyer
                    </Button>
                </DialogFooter>
              </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
