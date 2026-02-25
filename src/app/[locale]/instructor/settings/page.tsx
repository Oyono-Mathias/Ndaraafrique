
'use client';

/**
 * @fileOverview Paramètres Pédagogiques - Dédié aux Formateurs.
 * Permet de piloter l'IA Mathias et les alertes financières.
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@/components/ui/form';
import { Loader2, Bot, Bell, DollarSign, ShieldCheck, ArrowLeft, Sparkles, BookOpen } from 'lucide-react';
import Link from 'next/link';

const instructorSettingsSchema = z.object({
  aiAssistanceEnabled: z.boolean(),
  aiInterventionLevel: z.enum(['low', 'medium', 'high']),
  notifyEnrollment: z.boolean(),
  notifyPayout: z.boolean(),
});

export default function InstructorSettingsPage() {
  const { currentUser, isUserLoading } = useRole();
  const { toast } = useToast();
  const router = useRouter();
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
      };

      const result = await updateUserProfileAction({
        userId: currentUser.uid,
        data: payload,
        requesterId: currentUser.uid
      });

      if (result.success) {
        toast({ title: "Paramètres pédagogiques mis à jour" });
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
    <div className="max-w-3xl mx-auto space-y-8 pb-24 animate-in fade-in duration-700">
      <header className="flex flex-col gap-1 px-4">
        <div className="flex items-center gap-2 text-primary">
            <Bot className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Copilote Pédagogique</span>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Réglages Formateur</h1>
        <p className="text-slate-500 text-sm font-medium">Pilotez votre assistance IA et vos alertes.</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 px-4">
          
          {/* --- MATHIAS IA CONFIG --- */}
          <Card className="bg-slate-900 border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
            <CardHeader className="bg-primary/5 border-b border-white/5 p-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl"><Sparkles className="h-6 w-6 text-primary" /></div>
                <div>
                    <CardTitle className="text-xl font-bold text-white">Assistant MATHIAS (IA)</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">L'IA qui vous aide à corriger et à encadrer.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <FormField
                control={form.control}
                name="aiAssistanceEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-5 bg-slate-950/50 border border-white/5 rounded-2xl">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-bold text-white">Aide à la correction</FormLabel>
                      <FormDescription className="text-xs text-slate-500">Suggérer automatiquement une note et un feedback.</FormDescription>
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
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Niveau d'autonomie IA</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-14 bg-slate-950 border-slate-800 rounded-2xl">
                          <SelectValue placeholder="Choisir un niveau" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="low" className="py-3">Faible (Suggestions discrètes)</SelectItem>
                        <SelectItem value="medium" className="py-3">Moyen (Analyse équilibrée)</SelectItem>
                        <SelectItem value="high" className="py-3">Élevé (Analyse approfondie)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-[10px] italic text-slate-600">Plus le niveau est élevé, plus Mathias sera proactif dans ses recommandations.</FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* --- ALERTES FINANCIÈRES --- */}
          <Card className="bg-slate-900 border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
            <CardHeader className="bg-slate-800/30 border-b border-white/5 p-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl"><DollarSign className="h-6 w-6 text-emerald-500" /></div>
                <div>
                    <CardTitle className="text-xl font-bold text-white">Notifications & Revenus</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">Restez informé de chaque vente.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <FormField
                control={form.control}
                name="notifyEnrollment"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 bg-slate-950/50 border border-white/5 rounded-2xl">
                    <FormLabel className="text-sm font-bold text-slate-300">Nouvelles inscriptions</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notifyPayout"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 bg-slate-950/50 border border-white/5 rounded-2xl">
                    <FormLabel className="text-sm font-bold text-slate-300">Statut des retraits</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
              <Button type="submit" disabled={isSaving} className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-[0.98]">
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <><ShieldCheck className="mr-2 h-5 w-5"/> Enregistrer mes préférences</>}
              </Button>
              <Button variant="ghost" asChild className="h-12 font-bold text-slate-500 uppercase text-[10px] tracking-widest">
                  <Link href="/instructor/dashboard">Annuler et revenir</Link>
              </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
