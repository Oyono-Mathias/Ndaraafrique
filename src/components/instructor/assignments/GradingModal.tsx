
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
import { Bot, Loader2, BookOpen } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { PdfViewerClient } from '@/components/ui/PdfViewerClient';
import { useToast } from '@/hooks/use-toast';
import { gradeSubmissionAction } from '@/actions/assignmentActions';
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
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader className="p-6 border-b dark:border-slate-800">
          <DialogTitle className="text-xl text-white">Correction du devoir</DialogTitle>
          <DialogDescription>{submission.assignmentTitle}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto">
          <div className="h-full flex flex-col">
            <h3 className="font-semibold mb-2 text-white">Travail de l'étudiant</h3>
            <div className="flex-1 border rounded-lg bg-slate-900/50 dark:border-slate-700 overflow-hidden">
              {isPdf && submission.submissionUrl ? (
                <PdfViewerClient fileUrl={submission.submissionUrl} />
              ) : submission.submissionUrl ? (
                <div className="p-4 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                  <p>Ce document n'est pas un PDF et ne peut être affiché directement.</p>
                  <Button variant="link" asChild><a href={submission.submissionUrl} target="_blank" rel="noopener noreferrer">Télécharger / Ouvrir le fichier</a></Button>
                </div>
              ) : (
                 <div className="p-4 text-muted-foreground h-full">{submission.submissionContent}</div>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Avatar><AvatarImage src={submission.studentAvatarUrl} /><AvatarFallback>{submission.studentName.charAt(0)}</AvatarFallback></Avatar>
              <div>
                <p className="font-semibold text-white">{submission.studentName}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-2"><BookOpen className="h-3 w-3"/>{submission.courseTitle}</p>
              </div>
            </div>
            
            <Separator className="dark:bg-slate-700"/>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
                <FormField control={form.control} name="grade" render={({ field }) => (
                  <FormItem><FormLabel>Note / 20</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="feedback" render={({ field }) => (
                  <FormItem><FormLabel>Commentaire</FormLabel><FormControl><Textarea rows={6} {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <Card className="dark:bg-slate-800/50 dark:border-slate-700 opacity-60">
                    <CardHeader className="p-4"><CardTitle className="flex items-center gap-2 text-primary text-base"><Bot/>Assistant IA Mathias</CardTitle></CardHeader>
                    <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                       <p>L'aide à la correction et la suggestion de notes seront bientôt disponibles ici.</p>
                    </CardContent>
                </Card>
                 <DialogFooter className="pt-4">
                    <DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Enregistrer la note
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
