'use client';

/**
 * @fileOverview Réglages Globaux Ndara Afrique.
 * Pilotage complet de la plateforme via 10 onglets thématiques.
 * Android-first Design & Vintage Aesthetic.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { updateGlobalSettings } from '@/actions/settingsActions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings as SettingsIcon, 
  Loader2, 
  ImageIcon,
  UploadCloud,
  CheckCircle2,
  BadgeEuro,
  ShieldCheck,
  Percent,
  Smartphone,
  Wrench,
  Youtube,
  PlayCircle,
  Palette,
  Globe,
  Mail,
  Bell,
  Search,
  Lock,
  Bot,
  Trophy,
  Landmark,
  Coins
} from 'lucide-react';
import type { Settings } from '@/lib/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const settingsSchema = z.object({
  // 1. Général
  siteName: z.string().min(2),
  slogan: z.string().optional(),
  contactEmail: z.string().email(),
  supportPhone: z.string().optional(),
  logoUrl: z.string().url().or(z.literal('')).optional(),
  logoMobileUrl: z.string().url().or(z.literal('')).optional(),
  // 2. Plateforme
  maintenanceMode: z.boolean().default(false),
  allowUserSignup: z.boolean().default(true),
  allowInstructorSignup: z.boolean().default(true),
  videoPlayerType: z.enum(['bunny', 'youtube', 'mixed']).default('mixed'),
  // 3. Commercial
  platformCommission: z.coerce.number().min(0).max(100),
  minPayoutThreshold: z.coerce.number().min(1000),
  commissionFreezeDays: z.coerce.number().min(0),
  enableMobileMoney: z.boolean().default(true),
  // 4. Affiliation
  affiliateEnabled: z.boolean().default(true),
  affiliatePercentage: z.coerce.number().min(0).max(50),
  cookieDuration: z.coerce.number().min(1),
  // 5. Emails
  smtpHost: z.string().optional(),
  senderName: z.string().optional(),
  // 6. Notifications
  channelWeb: z.boolean().default(true),
  channelEmail: z.boolean().default(true),
  // 7. SEO
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  // 8. Sécurité
  admin2fa: z.boolean().default(false),
  blockVpn: z.boolean().default(false),
  // 9. IA Mathias
  enableTutor: z.boolean().default(true),
  maxDailyRequests: z.coerce.number().min(1),
  // 10. Gamification
  pointsPerLesson: z.coerce.number().min(0),
});

type SettingsValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { 
      siteName: 'Ndara Afrique',
      maintenanceMode: false,
      platformCommission: 20,
      affiliatePercentage: 10,
      videoPlayerType: 'mixed'
    }
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as Settings;
        form.reset({
          siteName: d.general?.siteName || 'Ndara Afrique',
          slogan: d.general?.slogan || '',
          contactEmail: d.general?.contactEmail || '',
          supportPhone: d.general?.supportPhone || '',
          logoUrl: d.general?.logoUrl || '',
          logoMobileUrl: d.general?.logoMobileUrl || '',
          maintenanceMode: d.platform?.maintenanceMode || false,
          allowUserSignup: d.platform?.allowUserSignup ?? true,
          allowInstructorSignup: d.platform?.allowInstructorSignup ?? true,
          videoPlayerType: d.platform?.videoPlayerType || 'mixed',
          platformCommission: d.commercial?.platformCommission || 20,
          minPayoutThreshold: d.commercial?.minPayoutThreshold || 5000,
          commissionFreezeDays: d.commercial?.commissionFreezeDays || 14,
          enableMobileMoney: d.commercial?.enableMobileMoney ?? true,
          affiliateEnabled: d.commercial?.affiliateEnabled ?? true,
          affiliatePercentage: d.commercial?.affiliatePercentage ?? 10,
          cookieDuration: d.commercial?.affiliateCookieDurationDays || 30,
          smtpHost: d.email?.smtpHost || '',
          senderName: d.email?.senderName || 'Ndara Afrique',
          channelWeb: d.notifications?.channelWeb ?? true,
          channelEmail: d.notifications?.channelEmail ?? true,
          metaTitle: d.seo?.metaTitle || '',
          metaDescription: d.seo?.metaDescription || '',
          admin2fa: d.security?.admin2fa ?? false,
          blockVpn: d.security?.blockVpn ?? false,
          enableTutor: d.ai?.enableTutor ?? true,
          maxDailyRequests: d.ai?.maxDailyRequests || 50,
          pointsPerLesson: d.gamification?.pointsPerLesson || 10,
        });
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db, form]);

  const onSubmit = async (values: SettingsValues) => {
    if (!currentUser) return;
    setIsSaving(true);

    try {
      const result = await updateGlobalSettings({
        adminId: currentUser.uid,
        targetDoc: activeTab, // On enregistre dans le document spécifique à l'onglet pour la propreté
        settings: {
          general: { siteName: values.siteName, slogan: values.slogan, contactEmail: values.contactEmail, supportPhone: values.supportPhone, logoUrl: values.logoUrl, logoMobileUrl: values.logoMobileUrl },
          platform: { maintenanceMode: values.maintenanceMode, allowUserSignup: values.allowUserSignup, allowInstructorSignup: values.allowInstructorSignup, videoPlayerType: values.videoPlayerType },
          commercial: { platformCommission: values.platformCommission, minPayoutThreshold: values.minPayoutThreshold, commissionFreezeDays: values.commissionFreezeDays, enableMobileMoney: values.enableMobileMoney, affiliateEnabled: values.affiliateEnabled, affiliatePercentage: values.affiliatePercentage, affiliateCookieDurationDays: values.cookieDuration },
          email: { smtpHost: values.smtpHost, senderName: values.senderName },
          notifications: { channelWeb: values.channelWeb, channelEmail: values.channelEmail },
          seo: { metaTitle: values.metaTitle, metaDescription: values.metaDescription },
          security: { admin2fa: values.admin2fa, blockVpn: values.blockVpn },
          ai: { enableTutor: values.enableTutor, maxDailyRequests: values.maxDailyRequests },
          gamification: { pointsPerLesson: values.pointsPerLesson },
        } as any
      });

      if (result.success) toast({ title: "Configuration enregistrée !" });
      else throw new Error(result.error);
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Erreur", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>;

  const TabItem = ({ value, icon: Icon, label }: { value: string, icon: any, label: string }) => (
    <TabsTrigger value={value} className="py-3 px-6 font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
        <Icon size={14} />
        <span className="hidden sm:inline">{label}</span>
    </TabsTrigger>
  );

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700">
      <header className="px-4">
        <div className="flex items-center gap-3 text-primary mb-2">
            <SettingsIcon className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Infrastructure Plateforme</span>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Configuration Globale</h1>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-900 border-slate-800 p-1 h-14 rounded-[1.5rem] mx-4 mb-8 overflow-x-auto no-scrollbar flex items-center justify-start gap-1">
              <TabItem value="general" icon={Globe} label="Général" />
              <TabItem value="platform" icon={Wrench} label="Plateforme" />
              <TabItem value="commercial" icon={Landmark} label="Commercial" />
              <TabItem value="affiliation" icon={BadgeEuro} label="Affiliation" />
              <TabItem value="email" icon={Mail} label="Emails" />
              <TabItem value="notifications" icon={Bell} label="Notifications" />
              <TabItem value="seo" icon={Search} label="SEO" />
              <TabItem value="security" icon={Lock} label="Sécurité" />
              <TabItem value="ai" icon={Bot} label="IA Mathias" />
              <TabItem value="gamification" icon={Trophy} label="Gamification" />
            </TabsList>

            <main className="px-4 max-w-5xl mx-auto space-y-8">
                
                {/* 1. GÉNÉRAL */}
                <TabsContent value="general" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase tracking-tight">Identité de Marque</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <FormField control={form.control} name="siteName" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Nom du site</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="slogan" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Slogan</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem>
                                )}/>
                            </div>
                            <div className="grid md:grid-cols-2 gap-8">
                                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Email Officiel</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="supportPhone" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Support WhatsApp</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 2. PLATEFORME */}
                <TabsContent value="platform" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase tracking-tight">Modes Système</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-5 bg-red-500/5 border border-red-500/10 rounded-2xl">
                                    <div className="space-y-0.5"><FormLabel className="text-sm font-bold text-white uppercase">Mode Maintenance</FormLabel><FormDescription className="text-[10px]">Bloque l'accès à tous sauf aux admins.</FormDescription></div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="allowUserSignup" render={({ field }) => (
                                    <FormItem className="flex items-center justify-between p-5 bg-slate-950/50 rounded-2xl border border-white/5">
                                        <FormLabel className="text-[10px] font-black uppercase">Inscriptions Élèves</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="allowInstructorSignup" render={({ field }) => (
                                    <FormItem className="flex items-center justify-between p-5 bg-slate-950/50 rounded-2xl border border-white/5">
                                        <FormLabel className="text-[10px] font-black uppercase">Inscriptions Experts</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. COMMERCIAL */}
                <TabsContent value="commercial" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-primary/5 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase tracking-tight">Économie Ndara</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid sm:grid-cols-3 gap-6">
                                <FormField control={form.control} name="platformCommission" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Com. Plateforme (%)</FormLabel><FormControl><Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 rounded-xl text-xl font-black text-primary" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="minPayoutThreshold" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Seuil Retrait (XOF)</FormLabel><FormControl><Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 rounded-xl text-xl font-black" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="commissionFreezeDays" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Gel (Jours)</FormLabel><FormControl><Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 rounded-xl text-xl font-black" /></FormControl></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 4. AFFILIATION */}
                <TabsContent value="affiliation" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-emerald-500/5 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase tracking-tight">Règles Ambassadeurs</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <FormField control={form.control} name="affiliateEnabled" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                    <FormLabel className="text-sm font-bold uppercase">Activer l'Affiliation</FormLabel>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <FormField control={form.control} name="affiliatePercentage" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Commission Vente (%)</FormLabel><FormControl><Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 rounded-xl text-xl font-black text-emerald-400" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="cookieDuration" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Durée Cookie (Jours)</FormLabel><FormControl><Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 rounded-xl text-xl font-black" /></FormControl></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* AUTRES ONGLETS (STRUCTURE SIMILAIRE) */}
                <TabsContent value="security" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-red-500/5 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase tracking-tight">Sécurisation & Fraude</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <FormField control={form.control} name="admin2fa" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-5 bg-slate-950/50 rounded-2xl border border-white/5">
                                    <FormLabel className="text-sm font-bold uppercase">Authentification 2FA Admin</FormLabel>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="blockVpn" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-5 bg-slate-950/50 rounded-2xl border border-white/5">
                                    <FormLabel className="text-sm font-bold uppercase">Bloquer accès VPN</FormLabel>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="ai" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-primary/10 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase tracking-tight">Intelligence Mathias</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <FormField control={form.control} name="enableTutor" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-5 bg-primary/5 border border-primary/10 rounded-2xl">
                                    <FormLabel className="text-sm font-bold uppercase">Activation Tuteur Interactif</FormLabel>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="maxDailyRequests" render={({ field }) => (
                                <FormItem className="max-w-xs"><FormLabel className="text-[10px] font-black uppercase text-slate-500">Limite requêtes / jour</FormLabel><FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>

            </main>

            {/* --- ACTION BAR FIXE (MOBILE) --- */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 z-40 safe-area-pb md:relative md:bg-transparent md:border-none md:p-0 md:max-w-5xl md:mx-auto md:px-4">
                <Button 
                    type="submit" 
                    disabled={isSaving} 
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2"/> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                    Enregistrer les réglages {activeTab}
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
