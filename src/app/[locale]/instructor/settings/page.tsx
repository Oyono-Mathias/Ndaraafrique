'use client';

/**
 * @fileOverview Réglages Formateur - Centre de pilotage Pédagogique et Financier.
 * Ce profil privé est différent du profil public car il se concentre sur les outils de gestion.
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
import { Loader2, Bot, Bell, Landmark, CheckCircle2, UserCircle, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

  if (isUserLoading) return <div className="h-screen flex items-center justify-center bg-[#0f172a]"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-32 animate-in fade-in duration-700 min-h-screen bg-[#0f172a] p-6 relative">
      <div className="grain-overlay opacity-[0.03]" />
      
      <header className="flex flex-col gap-1 pt-8 text-center sm:text-left relative z-10">
        <div className="flex items-center justify-center sm:justify-start gap-3 text-primary mb-2">
            <UserCircle className="h-8 w-8" />
            <span className="text-[11px] font-black uppercase tracking-[0.4em]">Profil de Gestion</span>
        </div>
        <h1 className="text-4xl font-black text-white uppercase tracking-tight">Configuration Expert</h1>
      </header>

      {/* --- IDENTITÉ RÉSUMÉE (DIFFÉRENTE DE L'ÉTUDIANT) --- */}
      <Card className="bg-slate-900 border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden z-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <div className="flex items-center gap-6 relative z-10">
              <div className="relative flex-shrink-0">
                  <Avatar className="h-20 w-20 border-4 border-[#0f172a] shadow-xl">
                      <AvatarImage src={currentUser?.profilePictureURL} className="object-cover" />
                      <AvatarFallback className="bg-slate-800 text-2xl font-black text-slate-500 uppercase">
                          {currentUser?.fullName?.charAt(0)}
                      </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-primary p-1.5 rounded-full border-4 border-slate-900 shadow-xl">
                      <ShieldCheck className="h-3 w-3 text-slate-950" />
                  </div>
              </div>
              <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">{currentUser?.fullName}</h2>
                  <p className="text-primary font-bold text-xs uppercase tracking-widest mt-1">Academy Owner</p>
                  <Link href={`/instructor/${currentUser?.uid}`} className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-3 flex items-center gap-1.5 hover:text-white transition">
                      Voir mon profil public <ChevronRight size={12} />
                  </Link>
              </div>
          </div>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 relative z-10">
          <Tabs defaultValue="finance" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-950/50 border border-white/5 h-14 p-1 rounded-2xl mb-8 shadow-xl">
                <TabsTrigger value="finance" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-slate-950">Finance & IA</TabsTrigger>
                <TabsTrigger value="notifications" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-slate-950">Préférences</TabsTrigger>
            </TabsList>

            <TabsContent value="finance" className="space-y-6 m-0 animate-in slide-in-from-bottom-2 duration-500">
                <Card className="bg-slate-900 border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="bg-emerald-500/10 border-b border-white/5 p-8">
                        <CardTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Landmark className="text-emerald-500"/> Retraits Mobile Money
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <FormField
                            control={form.control}
                            name="mobileMoneyNumber"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Numéro Orange / MTN / Wave</FormLabel>
                                <FormControl><Input {...field} value={field.value ?? ''} placeholder="+236..." className="h-14 bg-slate-950 border-white/5 rounded-2xl text-white font-black text-xl px-6" /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="bg-primary/5 border-b border-white/5 p-8">
                        <CardTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Bot className="text-primary"/> Copilote MATHIAS
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <FormField
                            control={form.control}
                            name="aiAssistanceEnabled"
                            render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-6 bg-slate-950/50 rounded-3xl border border-white/5 shadow-inner">
                                <div className="space-y-1">
                                    <FormLabel className="text-sm font-black text-white uppercase">Correction Assistée</FormLabel>
                                    <p className="text-[10px] text-slate-500 font-medium italic">L'IA pré-note vos devoirs complexes.</p>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" /></FormControl>
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
                                <FormControl><SelectTrigger className="h-14 bg-slate-950 border-white/5 rounded-2xl text-white font-bold px-6 shadow-inner"><SelectValue placeholder="Choisir" /></SelectTrigger></FormControl>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="low" className="font-bold py-3 uppercase text-[10px]">Faible (Conseiller)</SelectItem>
                                    <SelectItem value="medium" className="font-bold py-3 uppercase text-[10px]">Moyen (Analyste)</SelectItem>
                                    <SelectItem value="high" className="font-bold py-3 uppercase text-[10px]">Élevé (Correcteur)</SelectItem>
                                </SelectContent>
                                </Select>
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6 m-0 animate-in slide-in-from-bottom-2 duration-500">
                <Card className="bg-slate-900 border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="p-8 border-b border-white/5 bg-slate-800/30">
                        <CardTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Bell className="text-primary"/> Alertes Événementielles
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-4">
                        <FormField
                            control={form.control}
                            name="notifyEnrollment"
                            render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-5 bg-slate-950/50 rounded-3xl border border-white/5 shadow-inner">
                                <FormLabel className="text-xs font-black text-white uppercase tracking-wider">Nouvelles Inscriptions</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" /></FormControl>
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="notifyPayout"
                            render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-5 bg-slate-950/50 rounded-3xl border border-white/5 shadow-inner">
                                <FormLabel className="text-xs font-black text-white uppercase tracking-wider">Suivi des Virements</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" /></FormControl>
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>

          <Button 
            type="submit" 
            disabled={isSaving} 
            className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 transition-all active:scale-[0.98] mb-12"
          >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2"/> : <><CheckCircle2 className="mr-2 h-5 w-5"/> Enregistrer les réglages</>}
          </Button>
        </form>
      </Form>
    </div>
  );
}
