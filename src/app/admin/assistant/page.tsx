
'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2, Sparkles, Speaker, CheckCircle } from 'lucide-react';
import { adminAssistant, type AdminAssistantOutput } from '@/ai/flows/generate-promo-code-flow';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import { updateGlobalSettings } from '@/actions/settingsActions';
import { useRole } from '@/context/RoleContext';
import { Skeleton } from '@/components/ui/skeleton';

const assistantFormSchema = z.object({
  prompt: z.string().min(10, { message: 'Veuillez entrer une instruction d\'au moins 10 caractères.' }),
});

type AssistantFormValues = z.infer<typeof assistantFormSchema>;


export default function AdminAssistantPage() {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<AdminAssistantOutput | null>(null);
  const { toast } = useToast();
  const db = getFirestore();
  const { currentUser } = useRole();

  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings, isLoading: settingsLoading } = useDoc(settingsRef);

  const form = useForm<AssistantFormValues>({
    resolver: zodResolver(assistantFormSchema),
  });

  const onSubmit: SubmitHandler<AssistantFormValues> = async (data) => {
    if (!currentUser) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Vous devez être connecté.' });
        return;
    }
    setIsAiLoading(true);
    setAiResponse(null);
    try {
        const result = await adminAssistant({ prompt: data.prompt, adminId: currentUser.uid });
        setAiResponse(result);
        toast({ title: "L'assistant a répondu !", description: "La réponse de Mathias est prête." });
    } catch (error) {
        console.error("AI flow error:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'L\'assistant IA n\'a pas pu traiter la demande.' });
    } finally {
        setIsAiLoading(false);
    }
  };
  
  const handleSetAnnouncement = async (announcement: string) => {
    if (!currentUser) return;
    setIsAiLoading(true);
    const result = await updateGlobalSettings({
      settings: { platform: { announcementMessage: announcement } },
      adminId: currentUser.uid,
    });
    if (result.success) {
      toast({ title: 'Annonce mise à jour !', description: 'La nouvelle annonce est maintenant active sur le site.' });
      setAiResponse(null);
    } else {
      toast({ variant: 'destructive', title: 'Erreur', description: result.error });
    }
    setIsAiLoading(false);
  };

  return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold dark:text-white">Assistant IA</h1>
          <p className="text-muted-foreground dark:text-slate-400">Utilisez Mathias pour vous aider dans vos tâches quotidiennes : création de contenu, gestion d'utilisateurs, et plus encore.</p>
        </header>

        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="dark:text-white flex items-center gap-2"><Sparkles className="text-amber-400 h-5 w-5"/> Assistant de gestion</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Ex: "Crée un code de 20% pour Pâques", "Offre le cours de React à etudiant@test.com", "Rédige une annonce pour un nouveau cours d'IA".
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-2">
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder="Votre instruction pour Mathias..."
                          className="h-12 text-base md:text-sm dark:bg-slate-700 dark:border-slate-600"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isAiLoading} className="w-full sm:w-auto h-12 text-base md:h-auto md:text-sm">
                  {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Envoyer
                </Button>
              </form>
            </Form>

            {isAiLoading && !aiResponse && (
              <div className="mt-6 p-4 rounded-lg bg-muted dark:bg-slate-700/50 flex items-center gap-3 animate-pulse">
                  <Speaker className="h-5 w-5 text-muted-foreground"/>
                  <p className="text-sm text-muted-foreground">L'IA est en train d'écrire...</p>
              </div>
            )}
            {aiResponse && (
              <div className="mt-6 p-4 rounded-lg bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 space-y-4">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{aiResponse.response}</p>
                  {aiResponse.response.includes('Sango:') && (
                     <div className="flex justify-end">
                        <Button onClick={() => handleSetAnnouncement(aiResponse.response)} disabled={isAiLoading} size="sm">
                            {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Définir comme annonce
                        </Button>
                    </div>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
