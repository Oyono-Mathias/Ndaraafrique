'use client';

/**
 * @fileOverview Réglages Expert Ndara Afrique - Design Elite Forest & Wealth.
 * ✅ DESIGN : Immersion totale, texture grainée, navigation par pilules.
 * ✅ FONCTIONNEL : Pilotage IA Mathias, Finance Mobile Money et Alertes.
 */

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfileAction } from '@/actions/userActions';
import Link from 'next/link';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Loader2, 
    Bot, 
    Bell, 
    Landmark, 
    CheckCircle2, 
    UserCircle, 
    ShieldCheck, 
    ChevronRight,
    Smartphone,
    Brain,
    Feather,
    Lock,
    ExternalLink,
    HelpCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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
  const db = getFirestore();
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
        toast({ title: "Réglages enregistrés !" });
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Erreur", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading) return <div className="h-screen flex items-center justify-center bg-ndara-bg"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-ndara-bg relative flex flex-col font-sans">
      <div className="grain-overlay" />
      
      {/* --- HEADER --- */}
      <header className="fixed top-0 w-full max-w-md z-50 bg-ndara-bg/95 backdrop-blur-md safe-area-pt border-b border-white/5">
        <div className="px-6 py-6 flex items-center justify-between">
            <h1 className="font-black text-xl text-white tracking-wide uppercase">Configuration</h1>
            <button className="w-10 h-10 rounded-full bg-ndara-surface flex items-center justify-center text-gray-400 hover:text-white transition active:scale-90">
                <HelpCircle size={20} />
            </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pt-32 pb-40 px-6 space-y-8">
        
        {/* --- IDENTITY CARD --- */}
        <div className="bg-ndara-surface rounded-4xl p-5 border border-white/5 flex items-center gap-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 flex-shrink-0">
                <Avatar className="h-full w-full">
                    <AvatarImage src={currentUser?.profilePictureURL} className="object-cover" />
                    <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                        {currentUser?.fullName?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="font-bold text-white text-base truncate uppercase tracking-tight">{currentUser?.fullName}</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{currentUser?.careerGoals?.currentRole || 'Expert Ndara'}</p>
            </div>
            <Link href={`/instructor/${currentUser?.uid}`} className="text-primary text-[10px] font-black uppercase tracking-widest hover:text-emerald-400 transition flex items-center gap-1.5 active:scale-90">
                PROFIL <ExternalLink size={12} />
            </Link>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs defaultValue="finance" className="w-full">
                {/* --- TAB SWITCHER --- */}
                <TabsList className="flex p-1 bg-ndara-surface rounded-[1.5rem] mb-8 border border-white/5 h-14">
                    <TabsTrigger value="finance" className="flex-1 rounded-2xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                        Finance & IA
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="flex-1 rounded-2xl text-slate-500 data-[state=active]:text-primary data-[state=active]:bg-primary/10 text-[10px] font-black uppercase tracking-widest transition-all">
                        Préférences
                    </TabsTrigger>
                </TabsList>

                {/* --- FINANCE & IA --- */}
                <TabsContent value="finance" className="space-y-6 m-0 animate-in fade-in duration-500">
                    <div className="bg-ndara-surface rounded-4xl p-6 border border-white/5 shadow-xl">
                        <h3 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center gap-3">
                            <Landmark className="text-primary h-4 w-4" /> RETRAITS MOBILE MONEY
                        </h3>
                        <FormField
                            control={form.control}
                            name="mobileMoneyNumber"
                            render={({ field }) => (
                            <FormItem className="space-y-4">
                                <div>
                                    <FormLabel className="block text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-3 ml-1">Numéro de compte (Orange / MTN / Wave)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50"><Smartphone size={18}/></div>
                                            <Input {...field} value={field.value ?? ''} placeholder="+236..." className="h-14 pl-12 bg-ndara-bg border-white/5 rounded-[1.5rem] text-white font-black text-lg focus-visible:ring-primary/20" />
                                        </div>
                                    </FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>

                    <div className="bg-ndara-surface rounded-4xl p-6 border border-white/5 shadow-xl">
                        <h3 className="font-black text-white text-xs uppercase tracking-widest mb-2 flex items-center gap-3">
                            <Bot className="text-primary h-4 w-4" /> CO-PILOTE MATHIAS
                        </h3>
                        <p className="text-slate-500 text-[10px] font-medium italic mb-6 leading-relaxed">
                            Définissez le degré d'autonomie de l'IA pour la correction et la structuration.
                        </p>
                        
                        <FormField
                            control={form.control}
                            name="aiInterventionLevel"
                            render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormControl>
                                    <div className="grid gap-3">
                                        <AiLevelOption 
                                            value="low" 
                                            currentValue={field.value} 
                                            onChange={field.onChange}
                                            icon={Feather}
                                            label="Faible"
                                            desc="Assistant de rédaction simple"
                                            color="text-blue-400"
                                            bgColor="bg-blue-500/10"
                                        />
                                        <AiLevelOption 
                                            value="medium" 
                                            currentValue={field.value} 
                                            onChange={field.onChange}
                                            icon={Bot}
                                            label="Moyen"
                                            desc="Analyste pédagogique actif"
                                            color="text-primary"
                                            bgColor="bg-primary/10"
                                            isRecommended
                                        />
                                        <AiLevelOption 
                                            value="high" 
                                            currentValue={field.value} 
                                            onChange={field.onChange}
                                            icon={Brain}
                                            label="Élevé"
                                            desc="Correcteur autonome complet"
                                            color="text-purple-400"
                                            bgColor="bg-purple-500/10"
                                        />
                                    </div>
                                </FormControl>
                            </FormItem>
                            )}
                        />
                    </div>
                </TabsContent>

                {/* --- PRÉFÉRENCES --- */}
                <TabsContent value="preferences" className="space-y-6 m-0 animate-in fade-in duration-500">
                    <div className="bg-ndara-surface rounded-4xl p-6 border border-white/5 shadow-xl">
                        <h3 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center gap-3">
                            <Bell className="text-primary h-4 w-4" /> ALERTES ÉVÉNEMENTIELLES
                        </h3>
                        <div className="space-y-6">
                            <FormField
                                control={form.control}
                                name="notifyEnrollment"
                                render={({ field }) => (
                                <FormItem className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white text-sm uppercase tracking-tight">Ventes directes</p>
                                        <p className="text-[10px] text-slate-500 font-medium">À chaque nouvelle inscription</p>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" /></FormControl>
                                </FormItem>
                                )}
                            />
                            <div className="h-px bg-white/5" />
                            <FormField
                                control={form.control}
                                name="notifyPayout"
                                render={({ field }) => (
                                <FormItem className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white text-sm uppercase tracking-tight">Suivi Financier</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Audit et virements validés</p>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" /></FormControl>
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <div className="bg-ndara-surface rounded-4xl p-6 border border-white/5 shadow-xl">
                        <h3 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center gap-3">
                            <Lock className="text-primary h-4 w-4" /> CONFIDENTIALITÉ
                        </h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-white text-sm uppercase tracking-tight">Visibilité Publique</p>
                                <p className="text-[10px] text-slate-500 font-medium">Afficher mon académie aux Ndara</p>
                            </div>
                            <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* --- STICKY SAVE BAR --- */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-ndara-bg via-ndara-bg to-transparent z-40 safe-area-pb">
                <Button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full h-16 rounded-[2.5rem] bg-gradient-to-r from-primary to-emerald-600 text-slate-950 font-black uppercase text-sm tracking-[0.15em] shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95 transition-all animate-pulse-glow border-none"
                >
                    {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : <><CheckCircle2 className="mr-3 h-5 w-5" /> ENREGISTRER LES RÉGLAGES</>}
                </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}

function AiLevelOption({ value, currentValue, onChange, icon: Icon, label, desc, color, bgColor, isRecommended }: any) {
    const isActive = currentValue === value;
    return (
        <label className={cn(
            "flex items-center justify-between p-4 rounded-[1.5rem] border-2 transition-all active:scale-[0.98] cursor-pointer group",
            isActive ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" : "border-white/5 bg-ndara-bg opacity-60 grayscale hover:opacity-100"
        )}>
            <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shadow-inner", bgColor, color)}>
                    <Icon size={20} />
                </div>
                <div className="flex flex-col">
                    <span className={cn("text-sm font-black uppercase tracking-tight", isActive ? "text-white" : "text-slate-400")}>{label}</span>
                    <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">{desc}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {isRecommended && <Badge className="bg-primary text-slate-950 border-none font-black text-[7px] uppercase px-1.5 h-4">TOP</Badge>}
                <input type="radio" name="ai-level" checked={isActive} onChange={() => onChange(value)} className="w-5 h-5 accent-primary cursor-pointer" />
            </div>
        </label>
    );
}
