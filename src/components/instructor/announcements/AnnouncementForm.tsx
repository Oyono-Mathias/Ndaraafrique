
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { sendCourseAnnouncement } from '@/actions/announcementActions';
import { useRole } from '@/context/RoleContext';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';

const formSchema = z.object({
  title: z.string().min(5, "Le titre doit faire au moins 5 caractères."),
  message: z.string().min(20, "Le message doit faire au moins 20 caractères."),
});

interface AnnouncementFormProps {
  courseId: string;
}

export function AnnouncementForm({ courseId }: AnnouncementFormProps) {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', message: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    
    const result = await sendCourseAnnouncement({
      courseId,
      instructorId: currentUser.uid,
      title: values.title,
      message: values.message,
    });

    if (result.success) {
      toast({ title: 'Annonce envoyée !', description: 'Les étudiants seront notifiés.' });
      form.reset();
    } else {
      toast({ variant: 'destructive', title: 'Erreur', description: result.error });
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 shadow-sm">
      <CardHeader>
        <CardTitle>Nouvelle Annonce</CardTitle>
        <CardDescription>Ce message sera envoyé à tous les étudiants inscrits à ce cours.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Titre de l'annonce</FormLabel><FormControl><Input placeholder="Ex: Session de questions-réponses en direct" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="message" render={({ field }) => ( <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea placeholder="Bonjour à tous, je vous invite à une session..." {...field} rows={6} /></FormControl><FormMessage /></FormItem> )} />
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Envoyer l'annonce
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
