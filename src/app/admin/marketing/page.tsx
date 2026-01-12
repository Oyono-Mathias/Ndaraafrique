
'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { generatePromoCode, GeneratePromoCodeInput } from '@/ai/flows/generate-promo-code-flow';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, orderBy, updateDoc, doc } from 'firebase/firestore';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Tag, Speaker, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const db = getFirestore();

  const form = useForm<MarketingFormValues>({
    resolver: zodResolver(marketingFormSchema),
  });
  
  const promoCodesQuery = useMemoFirebase(() => query(collection(db, 'promoCodes'), orderBy('createdAt', 'desc')), [db]);
  const { data: promoCodes, isLoading: codesLoading, error: codesError } = useCollection<PromoCode>(promoCodesQuery);

  const onSubmit: SubmitHandler<MarketingFormValues> = async (data) => {
    setIsAiLoading(true);
    setAiResponse('');
    try {
      const result = await generatePromoCode(data);
      setAiResponse(result.response);
      toast({
        title: t('aiTaskComplete'),
        description: t('aiRequestProcessed'),
      });
    } catch (error) {
      console.error("AI Marketing Error:", error);
      toast({
        variant: 'destructive',
        title: t('aiErrorTitle'),
        description: t('aiRequestError'),
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleToggleActive = async (code: PromoCode) => {
    const codeRef = doc(db, 'promoCodes', code.id);
    try {
        await updateDoc(codeRef, { isActive: !code.isActive });
        toast({ title: `Code ${code.code} ${!code.isActive ? t('activated') : t('deactivated')}` });
    } catch(err) {
        console.error("Failed to toggle promo code:", err);
        toast({ variant: 'destructive', title: t('errorTitle'), description: t('promoUpdateError') });
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">{t('marketingTitle')}</h1>
        <p className="text-muted-foreground dark:text-slate-400">{t('marketingDescription')}</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white flex items-center gap-2"><Sparkles className="text-amber-400 h-5 w-5"/> {t('mkt_assistant')}</CardTitle>
          <CardDescription className="dark:text-slate-400">
            {t('mktExamples')}
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
                    <FormControl>
                      <Input
                        placeholder={t('prompt_label')}
                        className="dark:bg-slate-700 dark:border-slate-600"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isAiLoading}>
                {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {t('generate_btn')}
              </Button>
            </form>
          </Form>

          {isAiLoading && (
             <div className="mt-6 p-4 rounded-lg bg-muted dark:bg-slate-700/50 flex items-center gap-3 animate-pulse">
                <Speaker className="h-5 w-5 text-muted-foreground"/>
                <p className="text-sm text-muted-foreground">{t('aiWriting')}</p>
            </div>
          )}
          {aiResponse && (
            <div className="mt-6 p-4 rounded-lg bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{aiResponse}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
       <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white flex items-center gap-2"><Tag className="h-5 w-5"/> {t('existingPromoCodes')}</CardTitle>
        </CardHeader>
        <CardContent>
           {codesError && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p>{t('promoLoadError')}</p>
                </div>
            )}
            <Table>
                <TableHeader>
                    <TableRow className="dark:border-slate-700">
                        <TableHead className="dark:text-slate-400">{t('code')}</TableHead>
                        <TableHead className="dark:text-slate-400">{t('discount')}</TableHead>
                        <TableHead className="dark:text-slate-400">{t('expiration')}</TableHead>
                        <TableHead className="text-right dark:text-slate-400">{t('active')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {codesLoading ? (
                        [...Array(3)].map((_, i) => (
                           <TableRow key={i} className="dark:border-slate-700">
                                <TableCell><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16 dark:bg-slate-700" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32 dark:bg-slate-700" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-6 w-11 dark:bg-slate-700" /></TableCell>
                           </TableRow>
                        ))
                    ) : promoCodes && promoCodes.length > 0 ? (
                        promoCodes.map((code) => (
                            <TableRow key={code.id} className="dark:border-slate-700 dark:hover:bg-slate-700/50">
                                <TableCell className="font-mono font-semibold dark:text-slate-100">{code.code}</TableCell>
                                <TableCell className="font-medium dark:text-slate-300">{code.discountPercentage}%</TableCell>
                                <TableCell className="text-muted-foreground dark:text-slate-400">
                                    {code.expiresAt ? format(code.expiresAt.toDate(), 'dd MMM yyyy', { locale: fr }) : t('never')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Switch
                                        checked={code.isActive}
                                        onCheckedChange={() => handleToggleActive(code)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow className="dark:border-slate-700">
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground dark:text-slate-500">
                                {t('noPromoCodes')}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    