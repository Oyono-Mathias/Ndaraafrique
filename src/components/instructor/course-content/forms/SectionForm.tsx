'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateSectionTitle } from '@/actions/sectionActions';
import type { Section } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(3, "Le titre doit faire au moins 3 caractères."),
});

export function SectionForm({ courseId, section, onDone }: { courseId: string; section: Section; onDone: () => void }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: section.title },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        const result = await updateSectionTitle({ courseId, sectionId: section.id, title: values.title });
        if (result && result.success) {
          toast({ title: 'Titre de la section mis à jour.' });
          onDone();
        } else {
          const errorMsg = typeof result?.error === 'string' 
            ? result.error 
            : "Une erreur est survenue lors de la sauvegarde.";
          
          toast({ 
            variant: 'destructive', 
            title: 'Erreur', 
            description: errorMsg 
          });
        }
      } catch (e: any) {
        toast({ 
          variant: 'destructive', 
          title: 'Erreur système', 
          description: "Le serveur est indisponible. Vérifiez votre connexion." 
        });
      }
    });
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2 w-full">
      <Input {...form.register('title')} className="h-8 text-base" />
      <Button type="submit" size="icon" className="h-8 w-8" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
    </form>
  );
}