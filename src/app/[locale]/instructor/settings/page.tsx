'use client';

/**
 * @fileOverview Réglages Formateur - Centre de pilotage Pédagogique et Financier.
 * ✅ RÉSOLU : Harmonisation complète pour débloquer le bouton Enregistrer.
 */

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfileAction } from '@/actions/userActions';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Bot, Bell, Landmark, CheckCircle2 } from 'lucide-react';

const instructorSettingsSchema = z.object({
  aiAssistanceEnabled: z.boolean().default(true),
  aiInterventionLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  notifyEnrollment: z.boolean().default(true),
  notifyPayout: z.boolean().default(true),
  mobileMoneyNumber: z.string().min(8, "Numéro requis pour les retraits.").nullable().or(z.literal('')),
});

export default function InstructorSettingsPage() {
  const { currentUser, isUserLoading } = useRole();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof instructorSettingsSchema>>({
    resolver: zodResolver(instructorSettingsSchema),
    defaultValues: {
        aiAssistanceEnabled: true,
        aiInterventionLevel: 'medium',
        notifyEnrollment: true,
        notifyPayout: true,
        mobileMoneyNumber: '',
    }
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
        'payoutInfo.mobileMoneyNumber': values.mobileMoneyNumber || '',
      };

      const result = await updateUserProfileAction({
        userId: currentUser.uid,
        data: payload,
        requesterId: currentUser.uid
      });

      if (result.success) {
        toast({ title: "Configuration enregistrée !" });
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
    <div className="max-w-3xl mx-auto space-y-8 pb-24 animate-in fade-in duration-700 min-h-screen">
      <header className="flex flex-col gap-1 px-4 pt-8">
        <div className="flex items-center gap-2 text-primary">
            <Bot className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Centre de pilotage</span>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Espace Pédagogique</h1>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 px-4">
          <Tabs defaultValue="finance" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-900 h-12 p-1 rounded-2xl mb-6">
                <TabsTrigger value="finance" className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Finance & IA</TabsTrigger>
                <TabsTrigger value="notifications" className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Alertes</TabsTrigger>
            </TabsList>

            <TabsContent value="finance" className="space-y-6">
                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="bg-emerald-500/10 border-b border-white/5 p-8">
                        <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                            <Landmark className="text-emerald-500"/> Retraits Mobile Money
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <FormField
                            control={form.control}
                            name="mobileMoneyNumber"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Numéro Orange/MTN/Wave</FormLabel>
                                <FormControl><Input {...field} value={field.value || ''} placeholder="+236..." className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white font-bold" /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="bg-primary/5 border-b border-white/5 p-8">
                        <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                            <Bot className="text-primary"/> Copilote MATHIAS
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <FormField
                            control={form.control}
                            name="aiAssistanceEnabled"
                            render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-5 bg-slate-950/50 rounded-2xl border border-white/5">
                                <div><FormLabel className="text-sm font-bold text-white">Correction Assistée</FormLabel></div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="aiInterventionLevel"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Niveau d'intervention</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl><SelectTrigger className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white"><SelectValue placeholder="Choisir" /></SelectTrigger></FormControl>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="low">Faible</SelectItem>
                                    <SelectItem value="medium">Moyen</SelectItem>
                                    <SelectItem value="high">Élevé</SelectItem>
                                </SelectContent>
                                </Select>
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-white/5 bg-slate-800/30">
                        <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                            <Bell className="text-primary"/> Préférences d'Alerte
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-4">
                        <FormField
                            control={form.control}
                            name="notifyEnrollment"
                            render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                                <FormLabel className="text-sm font-bold text-white">Nouvelles Inscriptions</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="notifyPayout"
                            render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                                <FormLabel className="text-sm font-bold text-white">Suivi des Retraits</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>

          <Button type="submit" disabled={isSaving} className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-[0.98]">
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <><CheckCircle2 className="mr-2 h-5 w-5"/> Enregistrer ma configuration</>}
          </Button>
        </form>
      </Form>
    </div>
  );
}
