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
import { Loader2, Send, Megaphone } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Course } from '@/lib/types';

const formSchema = z.object({
  courseId: z.string().min(1, "Veuillez sélectionner un cours."),
  title: z.string().min(5, "Le titre doit faire au moins 5 caractères."),
  message: z.string().min(20, "Le message doit faire au moins 20 caractères."),
});

export function AnnouncementForm({ courses }: { courses: Course[] }) {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { courseId: '', title: '', message: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    
    const selectedCourse = courses.find(c => c.id === values.courseId);
    
    const result = await sendCourseAnnouncement({
      courseId: values.courseId,
      courseTitle: selectedCourse?.title || 'Formation',
      instructorId: currentUser.uid,
      title: values.title,
      message: values.message,
    });

    if (result.success) {
      toast({ title: 'Annonce publiée !', description: 'Vos étudiants ont été notifiés.' });
      form.reset({ courseId: values.courseId, title: '', message: '' });
    } else {
      toast({ variant: 'destructive', title: 'Erreur', description: result.error });
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="bg-slate-900 border-slate-800 shadow-2xl rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5">
        <CardTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Megaphone className="text-primary h-6 w-6" />
            Diffuser une annonce
        </CardTitle>
        <CardDescription className="text-slate-400">Ce message sera envoyé à toute la promotion.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="p-8 space-y-6">
            <FormField control={form.control} name="courseId" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Sélectionner la promotion</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white">
                                <SelectValue placeholder="Choisir un cours..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            {courses.map(c => <SelectItem key={c.id} value={c.id} className="py-3 font-bold">{c.title}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}/>

            <FormField control={form.control} name="title" render={({ field }) => ( 
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Objet du message</FormLabel>
                    <FormControl><Input placeholder="Ex: Rappel : Session Live demain à 18h" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white font-bold" /></FormControl>
                    <FormMessage />
                </FormItem> 
            )}/>

            <FormField control={form.control} name="message" render={({ field }) => ( 
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Contenu de l'annonce</FormLabel>
                    <FormControl><Textarea placeholder="Bonjour à tous, je souhaite vous informer que..." {...field} rows={6} className="bg-slate-950 border-slate-800 rounded-xl text-white resize-none leading-relaxed" /></FormControl>
                    <FormMessage />
                </FormItem> 
            )}/>
          </CardContent>
          <CardFooter className="p-8 pt-0">
            <Button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Publier l'annonce maintenant
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
