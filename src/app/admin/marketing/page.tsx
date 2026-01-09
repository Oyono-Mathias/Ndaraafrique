
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generatePromoCode, type GeneratePromoCodeInput } from '@/ai/flows/generate-promo-code-flow';

const promoCodeSchema = z.object({
  prompt: z.string().min(10, 'Veuillez décrire le code promo que vous souhaitez générer.'),
});

type PromoCodeFormValues = z.infer<typeof promoCodeSchema>;

export default function MarketingAIPage() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResponse, setGeneratedResponse] = useState('');

  const form = useForm<PromoCodeFormValues>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: {
      prompt: '',
    },
  });

  const onSubmit = async (data: PromoCodeFormValues) => {
    setIsGenerating(true);
    setGeneratedResponse('');
    try {
      const result = await generatePromoCode({ prompt: data.prompt });
      setGeneratedResponse(result.response);
      toast({
        title: 'Opération terminée !',
        description: result.response,
      });
    } catch (error) {
      console.error('Error generating promo code:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de génération',
        description: "Une erreur est survenue lors de la communication avec l'IA.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Marketing par IA</h1>
        <p className="text-slate-400">Utilisez Mathias pour vous assister dans vos tâches marketing.</p>
      </header>

      <Card className="bg-[#1e293b] border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Générateur de Codes Promo</CardTitle>
          <CardDescription className="text-slate-400">
            Décrivez le code promo que vous voulez. Par exemple: "Crée un code pour la fête des pères offrant 20% de réduction" ou "Génère un code de bienvenue pour les nouveaux utilisateurs de 15%".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Votre demande</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Votre demande à Mathias..."
                        {...field}
                        rows={3}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Générer le code promo
              </Button>
            </form>
          </Form>
        </CardContent>
         {generatedResponse && (
            <CardFooter>
                <div className="mt-4 w-full rounded-md bg-slate-800 p-4 text-sm text-slate-300">
                    <p className="font-semibold text-white mb-2">Réponse de Mathias :</p>
                    <p>{generatedResponse}</p>
                </div>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
