'use client';

/**
 * @fileOverview Réglages Globaux Ndara Afrique.
 * Pilotage complet de la plateforme via 11 onglets thématiques.
 * ✅ CEO FEATURE: Gestion dynamique du contenu de la Landing Page.
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
import { Badge } from '@/components/ui/badge';
import { 
  Settings as SettingsIcon, 
  Loader2, 
  CheckCircle2,
  BadgeEuro,
  Wrench,
  Globe,
  Mail,
  Bell,
  Search,
  Lock,
  Bot,
  Trophy,
  Landmark,
  ImageIcon,
  UploadCloud,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Smartphone,
  MapPin,
  Layout
} from 'lucide-react';
import type { Settings } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const settingsSchema = z.object({
  siteName: z.string().min(2, "Nom requis"),
  slogan: z.string().optional(),
  contactEmail: z.string().email("Email invalide"),
  supportPhone: z.string().optional(),
  address: z.string().optional(),
  logoUrl: z.string().url().or(z.literal('')).optional(),
  logoMobileUrl: z.string().url().or(z.literal('')).optional(),
  loginBackgroundImage: z.string().url().or(z.literal('')).optional(),
  facebookUrl: z.string().url().or(z.literal('')).optional(),
  twitterUrl: z.string().url().or(z.literal('')).optional(),
  linkedinUrl: z.string().url().or(z.literal('')).optional(),
  instagramUrl: z.string().url().or(z.literal('')).optional(),
  maintenanceMode: z.boolean().default(false),
  allowUserSignup: z.boolean().default(true),
  allowInstructorSignup: z.boolean().default(true),
  videoPlayerType: z.enum(['bunny', 'youtube', 'mixed']).default('mixed'),
  platformCommission: z.coerce.number().min(0).max(100),
  minPayoutThreshold: z.coerce.number().min(1000),
  commissionFreezeDays: z.coerce.number().min(0),
  enableMobileMoney: z.boolean().default(true),
  affiliateEnabled: z.boolean().default(true),
  affiliatePercentage: z.coerce.number().min(0).max(50),
  cookieDuration: z.coerce.number().min(1),
  smtpHost: z.string().optional(),
  senderName: z.string().optional(),
  channelWeb: z.boolean().default(true),
  channelEmail: z.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  admin2fa: z.boolean().default(false),
  blockVpn: z.boolean().default(false),
  enableTutor: z.boolean().default(true),
  maxDailyRequests: z.coerce.number().min(1),
  pointsPerLesson: z.coerce.number().min(0),
  // Landing Page Content
  heroTitle: z.string().optional(),
  heroSubtitle: z.string().optional(),
  heroCtaText: z.string().optional(),
  showHeroCta: z.boolean().default(true),
  finalCtaTitle: z.string().optional(),
  finalCtaButtonText: z.string().optional(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { 
      siteName: 'Ndara Afrique',
      maintenanceMode: false,
      platformCommission: 20,
      affiliatePercentage: 10,
      videoPlayerType: 'mixed',
      allowUserSignup: true,
      allowInstructorSignup: true,
      enableMobileMoney: true,
      affiliateEnabled: true,
      cookieDuration: 30,
      channelWeb: true,
      channelEmail: true,
      admin2fa: false,
      blockVpn: false,
      enableTutor: true,
      maxDailyRequests: 50,
      pointsPerLesson: 10,
      showHeroCta: true,
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
          address: d.general?.address || '',
          logoUrl: d.general?.logoUrl || '',
          logoMobileUrl: d.general?.logoMobileUrl || '',
          loginBackgroundImage: d.general?.loginBackgroundImage || '',
          facebookUrl: d.general?.facebookUrl || '',
          twitterUrl: d.general?.twitterUrl || '',
          linkedinUrl: d.general?.linkedinUrl || '',
          instagramUrl: d.general?.instagramUrl || '',
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
          // Landing
          heroTitle: d.content?.landingPage?.heroTitle || '',
          heroSubtitle: d.content?.landingPage?.heroSubtitle || '',
          heroCtaText: d.content?.landingPage?.heroCtaText || '',
          showHeroCta: d.content?.landingPage?.showHeroCta ?? true,
          finalCtaTitle: d.content?.landingPage?.finalCtaTitle || '',
          finalCtaButtonText: d.content?.landingPage?.finalCtaButtonText || '',
        });
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof SettingsValues) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploadingField(fieldName);
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', currentUser.uid);
        formData.append('folder', 'branding');

        const response = await fetch('/api/storage/upload', { method: 'POST', body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        form.setValue(fieldName as any, data.url);
        toast({ title: "Fichier mis en ligne !" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Erreur", description: error.message });
    } finally {
        setUploadingField(null);
    }
  };

  const onSubmit = async (values: SettingsValues) => {
    if (!currentUser) return;
    setIsSaving(true);

    try {
      const payload: Partial<Settings> = {
        general: { 
          siteName: values.siteName, 
          slogan: values.slogan, 
          contactEmail: values.contactEmail, 
          supportPhone: values.supportPhone, 
          address: values.address,
          logoUrl: values.logoUrl, 
          logoMobileUrl: values.logoMobileUrl,
          loginBackgroundImage: values.loginBackgroundImage,
          facebookUrl: values.facebookUrl,
          twitterUrl: values.twitterUrl,
          linkedinUrl: values.linkedinUrl,
          instagramUrl: values.instagramUrl
        } as any,
        platform: { 
          maintenanceMode: values.maintenanceMode, 
          allowUserSignup: values.allowUserSignup, 
          allowInstructorSignup: values.allowInstructorSignup, 
          videoPlayerType: values.videoPlayerType 
        } as any,
        commercial: { 
          platformCommission: values.platformCommission, 
          minPayoutThreshold: values.minPayoutThreshold, 
          commissionFreezeDays: values.commissionFreezeDays, 
          enableMobileMoney: values.enableMobileMoney, 
          affiliateEnabled: values.affiliateEnabled, 
          affiliatePercentage: values.affiliatePercentage, 
          affiliateCookieDurationDays: values.cookieDuration 
        } as any,
        content: {
          landingPage: {
            heroTitle: values.heroTitle,
            heroSubtitle: values.heroSubtitle,
            heroCtaText: values.heroCtaText,
            showHeroCta: values.showHeroCta,
            finalCtaTitle: values.finalCtaTitle,
            finalCtaButtonText: values.finalCtaButtonText,
          }
        } as any,
        // ... les autres champs restent inchangés car on fait un merge
      };

      const result = await updateGlobalSettings({
        adminId: currentUser.uid,
        targetDoc: activeTab,
        settings: payload
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary"/>
      </div>
    );
  }

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
              <TabsTrigger value="general" className="py-3 px-6 font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                <Globe size={14} /> <span>Général</span>
              </TabsTrigger>
              <TabsTrigger value="content" className="py-3 px-6 font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                <Layout size={14} /> <span>Contenu Accueil</span>
              </TabsTrigger>
              <TabsTrigger value="platform" className="py-3 px-6 font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                <Wrench size={14} /> <span>Plateforme</span>
              </TabsTrigger>
              <TabsTrigger value="commercial" className="py-3 px-6 font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                <Landmark size={14} /> <span>Commercial</span>
              </TabsTrigger>
              <TabsTrigger value="affiliation" className="py-3 px-6 font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                <BadgeEuro size={14} /> <span>Affiliation</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="py-3 px-6 font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                <Lock size={14} /> <span>Sécurité</span>
              </TabsTrigger>
            </TabsList>

            <main className="px-4 max-w-5xl mx-auto space-y-8">
                
                <TabsContent value="general" className="space-y-10">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase tracking-tight">Identité & Branding</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <FormField control={form.control} name="siteName" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nom du site</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="slogan" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Slogan</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem>
                                )}/>
                            </div>
                            <div className="grid sm:grid-cols-3 gap-8 pt-4">
                                <ImageUploadField label="Logo Desktop" value={form.watch('logoUrl')} onUpload={(e) => handleFileUpload(e, 'logoUrl')} isUploading={uploadingField === 'logoUrl'} />
                                <ImageUploadField label="Logo Mobile" value={form.watch('logoMobileUrl')} onUpload={(e) => handleFileUpload(e, 'logoMobileUrl')} isUploading={uploadingField === 'logoMobileUrl'} />
                                <ImageUploadField label="Fond Connexion" value={form.watch('loginBackgroundImage')} onUpload={(e) => handleFileUpload(e, 'loginBackgroundImage')} isUploading={uploadingField === 'loginBackgroundImage'} aspect="video" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase tracking-tight">Contacts & Réseaux</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                                    <FormItem><FormLabel className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><Mail size={12}/> Email Officiel</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="supportPhone" render={({ field }) => (
                                    <FormItem><FormLabel className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><Smartphone size={12}/> Support WhatsApp</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem><FormLabel className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><MapPin size={12}/> Siège Social</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem>
                                )}/>
                            </div>
                            <div className="grid md:grid-cols-4 gap-6 pt-4 border-t border-white/5">
                                <FormField control={form.control} name="facebookUrl" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><Facebook size={12}/> Facebook</FormLabel><FormControl><Input {...field} className="h-10 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem> )}/>
                                <FormField control={form.control} name="twitterUrl" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><Twitter size={12}/> Twitter</FormLabel><FormControl><Input {...field} className="h-10 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem> )}/>
                                <FormField control={form.control} name="linkedinUrl" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><Linkedin size={12}/> LinkedIn</FormLabel><FormControl><Input {...field} className="h-10 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem> )}/>
                                <FormField control={form.control} name="instagramUrl" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><Instagram size={12}/> Instagram</FormLabel><FormControl><Input {...field} className="h-10 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem> )}/>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="content" className="space-y-10">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-primary/5 p-8 border-b border-white/5"><CardTitle className="text-xl font-black uppercase tracking-tight">Section Hero (Accroche)</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <FormField control={form.control} name="heroTitle" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Titre Principal (utilisez &lt;br/&gt; pour les retours)</FormLabel><FormControl><Textarea {...field} rows={3} className="bg-slate-950 border-slate-800 rounded-xl font-black text-xl uppercase" /></FormControl></FormItem>
                            )}/>
                            <FormField control={form.control} name="heroSubtitle" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Sous-titre (Copywriting)</FormLabel><FormControl><Textarea {...field} rows={2} className="bg-slate-950 border-slate-800 rounded-xl italic" /></FormControl></FormItem>
                            )}/>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <FormField control={form.control} name="heroCtaText" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Texte du bouton principal</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="showHeroCta" render={({ field }) => (
                                    <FormItem className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                                        <FormLabel className="text-[10px] font-black uppercase">Afficher le bouton</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5"><CardTitle className="text-xl font-black uppercase tracking-tight">Fermeture (Pied de page)</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <FormField control={form.control} name="finalCtaTitle" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Titre de fin de page</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem>
                            )}/>
                            <FormField control={form.control} name="finalCtaButtonText" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Texte du bouton final</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl></FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>

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
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="commercial" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-primary/5 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase tracking-tight">Économie Ndara</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid sm:grid-cols-2 gap-6">
                                <FormField control={form.control} name="platformCommission" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Commission Plateforme (%)</FormLabel><FormControl><Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 rounded-xl text-xl font-black text-primary" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="minPayoutThreshold" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Seuil Retrait (XOF)</FormLabel><FormControl><Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 rounded-xl text-xl font-black" /></FormControl></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </main>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 z-40 safe-area-pb md:relative md:bg-transparent md:border-none md:p-0 md:max-w-5xl md:mx-auto md:px-4">
                <Button 
                    type="submit" 
                    disabled={isSaving} 
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2"/> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                    Enregistrer les réglages
                </Button>
            </div>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}

function ImageUploadField({ label, value, onUpload, isUploading, aspect = "square" }: { label: string, value?: string, onUpload: (e: any) => void, isUploading: boolean, aspect?: "square" | "video" }) {
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{label}</label>
            <div className={cn(
                "relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden group flex items-center justify-center",
                aspect === "square" ? "aspect-square" : "aspect-video"
            )}>
                {value ? (
                    <Image src={value} alt={label} fill className="object-contain p-2" />
                ) : (
                    <ImageIcon className="h-8 w-8 text-slate-800" />
                )}
                
                {isUploading ? (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                        <UploadCloud size={24} />
                        <span className="text-[8px] font-black uppercase mt-2">Téléverser</span>
                        <input type="file" className="hidden" accept="image/*" onChange={onUpload} />
                    </label>
                )}
            </div>
        </div>
    );
}
