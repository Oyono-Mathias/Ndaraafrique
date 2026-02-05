
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, Loader2, BookOpen, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { PdfViewerClient } from '@/components/ui/PdfViewerClient';
import { useToast } from '@/hooks/use-toast';
import { gradeSubmissionAction } from '@/actions/assignmentActions';
import { gradeAssignment } from '@/ai/flows/grade-assignment-flow';
import type { AssignmentSubmission } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const gradingSchema = z.object({
  grade: z.coerce.number().min(0, "La note ne peut être négative.").max(20, "La note ne peut excéder 20."),
  feedback: z.string().min(10, "Le commentaire doit faire au moins 10 caractères."),
});

interface GradingModalProps {
  submission: AssignmentSubmission | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GradingModal({ submission, isOpen, onOpenChange }: GradingModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const form = useForm<z.infer<typeof gradingSchema>>({
    resolver: zodResolver(gradingSchema),
  });
  
  useEffect(() => {
    if (submission) {
      form.reset({
        grade: submission.grade,
        feedback: submission.feedback || '',
      });
    }
  }, [submission, form]);


  if (!submission) return null;

  const handleAiCorrection = async () => {
    setIsAiLoading(true);
    try {
        const studentWork = submission.submissionContent || "Fichier joint : " + submission.submissionUrl;
        const result = await gradeAssignment({
            correctionGuide: "Vérifier la rigueur et la clarté du raisonnement.",
            studentWork
        });
        
        form.setValue('grade', parseInt(result.note.split('/')[0]));
        form.setValue('feedback', `${result.points_forts}\n\nAméliorations : ${result.points_amelioration}\n\n${result.commentaire_fr}\n\n${result.commentaire_sg}`);
        toast({ title: "Mathias a analysé le devoir !", description: "Note et feedback suggérés." });
    } catch (error) {
        toast({ variant: 'destructive', title: "Erreur IA", description: "Impossible d'analyser le travail." });
    } finally {
        setIsAiLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof gradingSchema>) => {
    setIsSubmitting(true);
    const result = await gradeSubmissionAction({
      submissionId: submission.id,
      grade: values.grade,
      feedback: values.feedback,
      studentId: submission.studentId,
      courseName: submission.courseTitle,
    });
    
    if (result.success) {
      toast({ title: "Note enregistrée !", description: "L'étudiant sera notifié." });
      onOpenChange(false);
    } else {
      toast({ variant: 'destructive', title: 'Erreur', description: result.error });
    }
    setIsSubmitting(false);
  };

  const isPdf = submission.submissionUrl?.toLowerCase().endsWith('.pdf');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader className="p-6 border-b dark:border-slate-800">
          <DialogTitle className="text-xl text-white">Correction du devoir</DialogTitle>
          <DialogDescription>{submission.assignmentTitle}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto">
          <div className="h-full flex flex-col">
            <h3 className="font-semibold mb-2 text-white">Travail de l'étudiant</h3>
            <div className="flex-1 border rounded-xl bg-slate-950/50 border-slate-800 overflow-hidden relative">
              {isPdf && submission.submissionUrl ? (
                <PdfViewerClient fileUrl={submission.submissionUrl} />
              ) : submission.submissionUrl ? (
                <div className="p-4 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                  <p className="mb-4">Document externe</p>
                  <Button variant="secondary" size="sm" asChild>
                      <a href={submission.submissionUrl} target="_blank" rel="noopener noreferrer">Ouvrir le fichier</a>
                  </Button>
                </div>
              ) : (
                 <div className="p-6 text-slate-300 h-full whitespace-pre-wrap font-mono text-sm">{submission.submissionContent}</div>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Avatar><AvatarImage src={submission.studentAvatarUrl} /><AvatarFallback>{submission.studentName.charAt(0)}</AvatarFallback></Avatar>
              <div>
                <p className="font-bold text-white leading-none">{submission.studentName}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <BookOpen className="h-3 w-3 text-primary"/>
                    {submission.courseTitle}
                </p>
              </div>
            </div>
            
            <Separator className="dark:bg-slate-800"/>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
                <div className="flex items-center gap-4 justify-between">
                    <FormField control={form.control} name="grade" render={({ field }) => (
                    <FormItem className="w-32">
                        <FormLabel>Note / 20</FormLabel>
                        <FormControl><Input type="number" {...field} className="h-12 text-lg font-bold text-primary" /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}/>
                    <Button 
                        type="button" 
                        onClick={handleAiCorrection} 
                        disabled={isAiLoading}
                        className="bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 h-12 px-6"
                    >
                        {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Bot className="h-5 w-5 mr-2" />}
                        Analyse Mathias IA
                    </Button>
                </div>

                <FormField control={form.control} name="feedback" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback pédagogique</FormLabel>
                    <FormControl><Textarea rows={10} {...field} className="bg-slate-950/50 border-slate-800 resize-none" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                 <DialogFooter className="pt-4 border-t border-slate-800">
                    <DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting || isAiLoading} className="h-12 px-8 shadow-xl shadow-primary/20">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>} 
                        Publier la note
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
