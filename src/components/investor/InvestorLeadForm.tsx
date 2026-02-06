'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, CheckCircle2, FileText, Send } from 'lucide-react';
import { submitInvestorLead } from '@/actions/investorActions';
import { useToast } from '@/hooks/use-toast';

const leadSchema = z.object({
  fullName: z.string().min(2, "Nom complet requis."),
  email: z.string().email("Email invalide."),
  organization: z.string().optional(),
  message: z.string().optional(),
});

export function InvestorLeadForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof leadSchema>>({
    resolver: zodResolver(leadSchema),
    defaultValues: { fullName: '', email: '', organization: '', message: '' },
  });

  const onSubmit = async (values: z.infer<typeof leadSchema>) => {
    setIsLoading(true);
    const result = await submitInvestorLead(values);
    if (result.success) {
      setIsSubmitted(true);
      toast({ title: "Demande envoyée !", description: "Nous vous recontacterons sous 48h." });
    } else {
      toast({ variant: 'destructive', title: "Erreur", description: result.error });
    }
    setIsLoading(false);
  };

  if (isSubmitted) {
    return (
      <div className="text-center space-y-4 py-8 animate-in fade-in zoom-in duration-500">
        <div className="p-4 bg-emerald-500/10 rounded-full inline-block mx-auto">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Merci pour votre confiance</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          Votre demande a été bien enregistrée. Notre équipe relations investisseurs vous transmettra le Pitch Deck par email très prochainement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-primary/10 rounded-2xl inline-block">
        <FileText className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Demander le dossier</h3>
      <p className="text-slate-400 text-sm">Entrez vos coordonnées pour recevoir notre présentation investisseur (Pitch Deck 2024).</p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nom complet</FormLabel>
                <FormControl><Input placeholder="Prénom & Nom" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email professionnel</FormLabel>
                <FormControl><Input placeholder="email@organisation.com" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="organization"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Organisation (Optionnel)</FormLabel>
                <FormControl><Input placeholder="Entreprise / Fonds" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 mt-4 transition-all active:scale-[0.98]"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Recevoir le Pitch Deck <Send className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>
      </Form>
    </div>
  );
}
