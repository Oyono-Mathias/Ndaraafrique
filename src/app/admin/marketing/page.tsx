'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Sparkles, Tag, Speaker, AlertCircle, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generatePromoCode, type GeneratePromoCodeOutput } from '@/ai/flows/generate-promo-code-flow';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getFirestore, doc, updateDoc } from 'firebase/firestore';

interface PromoCode {
    id: string;
    code: string;
    discountPercentage: number;
    isActive: boolean;
    expiresAt?: any; // Firestore Timestamp
    createdAt: any; // Firestore Timestamp
}

const marketingFormSchema = z.object({
  prompt: z.string().min(10, { message: 'Veuillez entrer une instruction d\'au moins 10 caractères.' }),
});

type MarketingFormValues = z.infer<typeof marketingFormSchema>;


export default function AdminMarketingPage() {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<GeneratePromoCodeOutput | null>(null);
  const { toast } = useToast();
  const db = getFirestore();

  const promoCodesQuery = useMemoFirebase(() => query(collection(db, 'promoCodes'), orderBy('createdAt', 'desc')), [db]);
  const { data: promoCodes, isLoading: codesLoading } = useCollection<PromoCode>(promoCodesQuery);

  const form = useForm<MarketingFormValues>({
    resolver: zodResolver(marketingFormSchema),
  });

  const onSubmit: SubmitHandler<MarketingFormValues> = async (data) => {
    setIsAiLoading(true);
    setAiResponse(null);
    try {
        const result = await generatePromoCode({ prompt: data.prompt });
        setAiResponse(result);
        toast({ title: "IA a terminé !", description: "La réponse de l'assistant est prête." });
    } catch (error) {
        console.error("AI flow error:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'L\'assistant IA n\'a pas pu traiter la demande.' });
    } finally {
        setIsAiLoading(false);
    }
  };
  
  const handleToggleActive = async (code: PromoCode, isActive: boolean) => {
    try {
        const codeRef = doc(db, 'promoCodes', code.id);
        await updateDoc(codeRef, { isActive });
        toast({
            title: `Code ${isActive ? 'activé' : 'désactivé'}`,
            description: `Le code promo ${code.code} est maintenant ${isActive ? 'actif' : 'inactif'}.`
        });
    } catch (error) {
        console.error("Error updating promo code status:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le statut du code.' });
    }
  }


  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Outils Marketing</h1>
        <p className="text-muted-foreground dark:text-slate-400">Boostez votre visibilité et gérez vos campagnes.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white flex items-center gap-2"><Sparkles className="text-amber-400 h-5 w-5"/> Assistant Marketing (Mathias)</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Utilisez des instructions simples pour générer des promotions ou des messages. Ex: "Créer un code de 20% pour Pâques" ou "Rédiger une annonce pour un nouveau cours d'IA".
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
                Générer
              </Button>
            </form>
          </Form>

          {isAiLoading && (
             <div className="mt-6 p-4 rounded-lg bg-muted dark:bg-slate-700/50 flex items-center gap-3 animate-pulse">
                <Speaker className="h-5 w-5 text-muted-foreground"/>
                <p className="text-sm text-muted-foreground">L'IA est en train d'écrire...</p>
            </div>
          )}
          {aiResponse && (
            <div className="mt-6 p-4 rounded-lg bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 space-y-4">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{aiResponse.response}</p>
                 <div className="flex justify-end">
                    <Button disabled size="sm">
                        <Bell className="mr-2 h-4 w-4"/>
                        Envoyer comme notification
                    </Button>
                </div>
            </div>
          )}
        </CardContent>
      </Card>
      
       <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white flex items-center gap-2"><Tag className="h-5 w-5"/> Codes Promo Existants</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="dark:border-slate-700">
                            <TableHead className="dark:text-slate-400">Code</TableHead>
                            <TableHead className="dark:text-slate-400">Réduction</TableHead>
                            <TableHead className="dark:text-slate-400">Expiration</TableHead>
                            <TableHead className="text-right dark:text-slate-400">Actif</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {codesLoading ? (
                            [...Array(3)].map((_, i) => (
                               <TableRow key={i} className="dark:border-slate-700">
                                    <TableCell><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16 dark:bg-slate-700" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32 dark:bg-slate-700" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-6 w-11 ml-auto dark:bg-slate-700" /></TableCell>
                               </TableRow>
                            ))
                        ) : promoCodes && promoCodes.length > 0 ? (
                            promoCodes.map((code) => (
                                <TableRow key={code.id} className="dark:border-slate-700 dark:hover:bg-slate-700/50">
                                    <TableCell className="font-mono font-semibold dark:text-slate-100">{code.code}</TableCell>
                                    <TableCell className="font-medium dark:text-slate-300">{code.discountPercentage}%</TableCell>
                                    <TableCell className="text-muted-foreground dark:text-slate-400">
                                        {code.expiresAt ? format(code.expiresAt.toDate(), 'dd MMM yyyy', { locale: fr }) : "N'expire jamais"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Switch
                                            checked={code.isActive}
                                            onCheckedChange={(checked) => handleToggleActive(code, checked)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow className="dark:border-slate-700">
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground dark:text-slate-500">
                                    Aucun code promo créé. Utilisez l'assistant IA pour en générer un.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
