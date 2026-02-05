'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { createSupportTicket } from '@/actions/supportActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Send } from 'lucide-react';

const ticketSchema = z.object({
  subject: z.string().min(5, "Le sujet est trop court (min 5 caract.)."),
  category: z.enum(['Paiement', 'Technique', 'Pédagogique']),
  message: z.string().min(20, "Détaillez davantage votre demande (min 20 caract.)."),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export function NewTicketForm({ onSuccess }: { onSuccess: () => void }) {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: '',
      category: 'Technique',
      message: '',
    },
  });

  const onSubmit = async (values: TicketFormValues) => {
    if (!currentUser) return;
    setIsSubmitting(true);

    try {
      const result = await createSupportTicket({
        userId: currentUser.uid,
        ...values,
      });

      if (result.success) {
        toast({ title: "Ticket envoyé !", description: "Notre équipe vous répondra très prochainement." });
        onSuccess();
      } else {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur technique" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-black uppercase text-slate-500 tracking-widest">Catégorie</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-slate-800 border-slate-700 h-12 rounded-xl text-white">
                    <SelectValue placeholder="Type de demande" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="Paiement">Problème de Paiement</SelectItem>
                  <SelectItem value="Technique">Problème Technique</SelectItem>
                  <SelectItem value="Pédagogique">Question Pédagogique</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-black uppercase text-slate-500 tracking-widest">Sujet</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: Mon accès vidéo est bloqué" 
                  {...field} 
                  className="bg-slate-800 border-slate-700 h-12 rounded-xl text-white"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-black uppercase text-slate-500 tracking-widest">Votre message</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Décrivez précisément votre problème..." 
                  {...field} 
                  rows={5}
                  className="bg-slate-800 border-slate-700 rounded-xl text-white resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-xl active:scale-[0.97] transition-all mt-4"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Envoyer ma demande
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
