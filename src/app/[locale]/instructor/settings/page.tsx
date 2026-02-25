'use client';

/**
 * @fileOverview Réglages Formateur - Centre de pilotage Pédagogique et Financier.
 * Permet de configurer l'IA Mathias et les coordonnées Mobile Money (Payouts).
 */

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfileAction } from '@/actions/userActions';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@/components/ui/form';
import { Loader2, Bot, Bell, Landmark, ShieldCheck, Sparkles, Smartphone, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const instructorSettingsSchema = z.object({
  aiAssistanceEnabled: z.boolean(),
  aiInterventionLevel: z.enum(['low', 'medium', 'high']),
  notifyEnrollment: z.boolean(),
  notifyPayout: z.boolean(),
  mobileMoneyNumber: z.string().min(8, "Numéro requis pour les retraits."),
});

export default function InstructorSettingsPage() {
  const { currentUser, isUserLoading } = useRole();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof instructorSettingsSchema>>({
    resolver: zodResolver(instructorSettingsSchema),
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({
        aiAssistanceEnabled: currentUser.pedagogicalPreferences?.aiAssistanceEnabled ?? true,
        aiInterventionLevel: (currentUser.pedagogicalPreferences?.aiInterventionLevel as any) || 'medium',
        notifyEnrollment: currentUser.instructorNotificationPreferences?.newEnrollment ?? true,
        notifyPayout: currentUser.instructorNotificationPreferences?.payoutUpdate ?? true,
        mobileMoneyNumber: currentUser.payoutInfo?.mobileMoneyNumber || '',
      });
    }
  }, [currentUser, form]);

  const onSubmit = async (values: z.infer<typeof instructorSettingsSchema>) => {
    if (!currentUser) return;
    setIsSaving(true);

    try {
      const payload = {
        'pedagogicalPreferences.aiAssistanceEnabled': values.aiAssistanceEnabled,
        'pedagogicalPreferences.aiInterventionLevel': values.aiInterventionLevel,
        'instructorNotificationPreferences.newEnrollment': values.notifyEnrollment,
        'instructorNotificationPreferences.payoutUpdate': values.notifyPayout,
        'payoutInfo.mobileMoneyNumber': values.mobileMoneyNumber,
      };

      const result = await updateUserProfileAction({
        userId: currentUser.uid,
        data: payload,
        requesterId: currentUser.uid
      });

      if (result.success) {
        toast({ title: "Configuration pédagogique enregistrée" });
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Erreur", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24 animate-in fade-in duration-700 bg-grainy min-h-screen">
      <header className="flex flex-col gap-1 px-4 pt-8">
        <div className="flex items-center gap-2 text-primary">
            <Bot className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Centre de pilotage</span>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Espace Pédagogique</h1>
        <p className="text-slate-500 text-sm font-medium italic">Gérez votre tuteur IA et vos informations de paiement.</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 px-4">
          
          {/* --- FINANCES (PAYOUTS) --- */}
          <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="bg-emerald-500/10 border-b border-white/5 p-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400"><Landmark className="h-6 w-6" /></div>
                <div>
                    <CardTitle className="text-xl font-bold text-white">Retraits Mobile Money</CardTitle>
                    <CardDescription className="text-slate-500">Où devons-nous envoyer vos gains ?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <FormField
                control={form.control}
                name="mobileMoneyNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Numéro de retrait (Orange/MTN/Wave)</FormLabel>
                    <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-1 pr-4">
                        <div className="p-3 bg-slate-800 rounded-xl text-slate-400"><Smartphone className="h-4 w-4"/></div>
                        <FormControl><Input {...field} placeholder="Ex: +236..." className="border-none bg-transparent focus-visible:ring-0 h-12 text-lg font-bold" /></FormControl>
                    </div>
                    <FormDescription className="text-[10px] text-slate-600 italic">Ce numéro sera utilisé pour tous vos futurs retraits de revenus.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* --- MATHIAS IA CONFIG --- */}
          <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="bg-primary/5 border-b border-white/5 p-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl"><Sparkles className="h-6 w-6 text-primary" /></div>
                <div>
                    <CardTitle className="text-xl font-bold text-white">Copilote MATHIAS</CardTitle>
                    <CardDescription className="text-slate-500">L'IA qui assiste vos étudiants 24h/24.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <FormField
                control={form.control}
                name="aiAssistanceEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-5 bg-slate-950/50 border border-white/5 rounded-2xl">
                    <div className="space-y-0.5 pr-4">
                      <FormLabel className="text-sm font-bold text-white">Correction Assistée</FormLabel>
                      <FormDescription className="text-[10px] text-slate-500 uppercase tracking-tight">Suggérer une note et un feedback lors des devoirs.</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aiInterventionLevel"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Autonomie de Mathias</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-14 bg-slate-950 border-slate-800 rounded-2xl">
                          <SelectValue placeholder="Choisir un niveau" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="low" className="py-3">Faible (Discret)</SelectItem>
                        <SelectItem value="medium" className="py-3">Moyen (Équilibré)</SelectItem>
                        <SelectItem value="high" className="py-3">Élevé (Proactif)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
              <Button type="submit" disabled={isSaving} className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-[0.98]">
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <><CheckCircle2 className="mr-2 h-5 w-5"/> Enregistrer la configuration</>}
              </Button>
              <Button variant="ghost" asChild className="h-12 font-bold text-slate-500 uppercase text-[10px] tracking-widest">
                  <Link href="/instructor/dashboard">Revenir au tableau de bord</Link>
              </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
