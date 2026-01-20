'use client';

import { useState } from 'react';
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

const marketingFormSchema = z.object({
  prompt: z.string().min(10, { message: 'Veuillez entrer une instruction d\'au moins 10 caractères.' }),
});

type MarketingFormValues = z.infer<typeof marketingFormSchema>;

interface PromoCode {
    id: string;
    code: string;
    discountPercentage: number;
    isActive: boolean;
    expiresAt?: any;
    createdAt: any;
}

export default function AdminMarketingPage() {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [codesLoading, setCodesLoading] = useState(true);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);

  const form = useForm<MarketingFormValues>({
    resolver: zodResolver(marketingFormSchema),
  });

  const onSubmit: SubmitHandler<MarketingFormValues> = async (data) => {
    setIsAiLoading(true);
    // Simulate AI response
    setTimeout(() => {
        setAiResponse(`Annonce générée pour : "${data.prompt}"`);
        setIsAiLoading(false);
    }, 1500);
  };
  
  // Simulate data fetching
  useState(() => {
    setTimeout(() => {
        setPromoCodes([
             { id: '1', code: 'BIENVENUE20', discountPercentage: 20, isActive: true, createdAt: new Date(), expiresAt: null },
             { id: '2', code: 'NDARA10', discountPercentage: 10, isActive: true, createdAt: new Date(), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) },
             { id: '3', code: 'ETE2024', discountPercentage: 15, isActive: false, createdAt: new Date(), expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5) },
        ]);
        setCodesLoading(false);
    }, 1000);
  })


  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Outils Marketing</h1>
        <p className="text-muted-foreground dark:text-slate-400">Boostez votre visibilité et gérez vos campagnes.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white flex items-center gap-2"><Sparkles className="text-amber-400 h-5 w-5"/> Assistant Marketing</CardTitle>
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
                        placeholder="Votre instruction pour l'IA..."
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
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{aiResponse}</p>
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
                                        {code.expiresAt ? format(code.expiresAt, 'dd MMM yyyy', { locale: fr }) : "N'expire jamais"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Switch
                                            checked={code.isActive}
                                            onCheckedChange={() => {
                                                const newCodes = [...promoCodes];
                                                const codeToUpdate = newCodes.find(c => c.id === code.id);
                                                if (codeToUpdate) {
                                                    codeToUpdate.isActive = !codeToUpdate.isActive;
                                                    setPromoCodes(newCodes);
                                                }
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow className="dark:border-slate-700">
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground dark:text-slate-500">
                                    Aucun code promo créé.
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