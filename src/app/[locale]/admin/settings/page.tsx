'use client';

/**
 * @fileOverview Réglages Globaux Ndara Afrique.
 * ✅ RÉSOLU : Type Error Vercel (value null non assignable aux Inputs).
 * ✅ SÉCURITÉ : Utilisation de ?? '' pour garantir une chaîne de caractères.
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
  Palette
} from 'lucide-react';
import type { Settings } from '@/lib/types';
import Image from 'next/image';

const settingsSchema = z.object({
  siteName: z.string().min(2, "Le nom est trop court."),
  logoUrl: z.string().url().or(z.literal('')).optional().nullable(),
  contactEmail: z.string().email("Email invalide."),
  supportPhone: z.string().optional().nullable(),
  commission: z.coerce.number().min(0).max(100),
  announcementMessage: z.string().optional().nullable(),
  maintenanceMode: z.boolean().default(false),
  allowInstructorSignup: z.boolean().default(true),
  allowCourseBuyout: z.boolean().default(true),
  allowResaleRights: z.boolean().default(true),
  allowYoutube: z.boolean().default(true),
  allowBunny: z.boolean().default(true),
  primaryColor: z.enum(['emerald', 'ocre', 'blue', 'gold']).default('emerald'),
  fontScale: z.enum(['small', 'medium', 'large']).default('medium'),
  borderRadius: z.enum(['none', 'md', 'lg', 'xl']).default('lg'),
  affiliateEnabled: z.boolean().default(true),
  affiliatePercentage: z.coerce.number().min(0).max(50),
  minPayoutThreshold: z.coerce.number().min(1000),
  pwaAppName: z.string().min(3),
  pwaShortName: z.string().min(3),
  pwaIconUrl: z.string().url().or(z.literal('')).optional().nullable(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { 
      siteName: 'Ndara Afrique',
      contactEmail: '',
      pwaAppName: 'Ndara Afrique',
      pwaShortName: 'Ndara',
      allowCourseBuyout: true,
      allowResaleRights: true,
      maintenanceMode: false,
      allowInstructorSignup: true,
      allowYoutube: true,
      allowBunny: true,
      affiliateEnabled: true,
      minPayoutThreshold: 5000,
      primaryColor: 'emerald',
      fontScale: 'medium',
      borderRadius: 'lg',
      commission: 20,
      affiliatePercentage: 10
    }
  });

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Settings;
        form.reset({
          siteName: data.general?.siteName || 'Ndara Afrique',
          logoUrl: data.general?.logoUrl || '',
          contactEmail: data.general?.contactEmail || '',
          supportPhone: data.general?.supportPhone || '',
          commission: data.commercial?.platformCommission || 20,
          announcementMessage: data.platform?.announcementMessage || '',
          maintenanceMode: data.platform?.maintenanceMode || false,
          allowInstructorSignup: data.platform?.allowInstructorSignup ?? true,
          allowCourseBuyout: data.platform?.allowCourseBuyout ?? true,
          allowResaleRights: data.platform?.allowResaleRights ?? true,
          allowYoutube: data.platform?.allowYoutube ?? true,
          allowBunny: data.platform?.allowBunny ?? true,
          primaryColor: data.design?.primaryColor || 'emerald',
          fontScale: data.design?.fontScale || 'medium',
          borderRadius: data.design?.borderRadius || 'lg',
          affiliateEnabled: data.commercial?.affiliateEnabled ?? true,
          affiliatePercentage: data.commercial?.affiliatePercentage ?? 10,
          minPayoutThreshold: data.commercial?.minPayoutThreshold ?? 5000,
          pwaAppName: data.pwa?.appName || 'Ndara Afrique',
          pwaShortName: data.pwa?.shortName || 'Ndara',
          pwaIconUrl: data.pwa?.iconUrl || '',
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
        settings: {
          general: { 
            siteName: values.siteName, 
            logoUrl: values.logoUrl || '', 
            contactEmail: values.contactEmail, 
            supportPhone: values.supportPhone || '', 
          },
          commercial: { 
            platformCommission: values.commission, 
            currency: 'XOF', 
            minPayoutThreshold: values.minPayoutThreshold,
            affiliateEnabled: values.affiliateEnabled,
            affiliatePercentage: values.affiliatePercentage,
          },
          platform: { 
            announcementMessage: values.announcementMessage || '', 
            maintenanceMode: values.maintenanceMode,
            allowInstructorSignup: values.allowInstructorSignup,
            allowCourseBuyout: values.allowCourseBuyout,
            allowResaleRights: values.allowResaleRights,
            allowYoutube: values.allowYoutube,
            allowBunny: values.allowBunny
          },
          pwa: {
            appName: values.pwaAppName,
            shortName: values.pwaShortName,
            appDescription: "L'excellence panafricaine par le savoir.",
            iconUrl: values.pwaIconUrl || '',
            themeColor: '#10b981',
            backgroundColor: '#0f172a'
          },
          design: { primaryColor: values.primaryColor, fontScale: values.fontScale, borderRadius: values.borderRadius },
        } as any
      });

      if (result.success) toast({ title: "Configuration Ndara enregistrée !" });
      else toast({ variant: 'destructive', title: "Erreur", description: result.error });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Erreur technique", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;
    setIsUploading(fieldName);
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', currentUser.uid);
        formData.append('folder', 'platform_assets');
        const response = await fetch('/api/storage/upload', { method: 'POST', body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        form.setValue(fieldName as any, data.url);
        toast({ title: "Fichier prêt !" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Échec", description: error.message });
    } finally {
        setIsUploading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <header>
        <div className="flex items-center gap-2 text-primary mb-1">
            <SettingsIcon className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Pilotage Global</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Configuration Ndara</h1>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="bg-slate-900 border-slate-800 mb-6 h-12 p-1 overflow-x-auto flex items-center justify-start gap-1 w-full rounded-2xl no-scrollbar">
              <TabsTrigger value="general" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest">Général</TabsTrigger>
              <TabsTrigger value="commercial" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest">Commercial</TabsTrigger>
              <TabsTrigger value="pwa" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest text-primary">App Mobile</TabsTrigger>
              <TabsTrigger value="design" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest">Design</TabsTrigger>
              <TabsTrigger value="platform" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest">Plateforme</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-800/30 border-b border-white/5"><CardTitle className="text-lg font-bold text-white">Identité & Contact</CardTitle></CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <FormField control={form.control} name="siteName" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Nom du site</FormLabel><FormControl><Input {...field} value={field.value ?? ''} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl text-white" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="contactEmail" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Email de contact</FormLabel><FormControl><Input {...field} value={field.value ?? ''} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl text-white" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="supportPhone" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">WhatsApp Support</FormLabel><FormControl><Input placeholder="+236..." {...field} value={field.value ?? ''} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl text-white" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="space-y-4">
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">Logo Site</FormLabel>
                      <div className="relative h-32 w-32 rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group">
                          {form.watch('logoUrl') ? <Image src={form.watch('logoUrl')!} alt="Logo" fill className="object-contain p-4" /> : <ImageIcon className="h-10 w-10 text-slate-800" />}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl bg-primary text-white border-none" asChild disabled={!!isUploading}>
                                  <label className="cursor-pointer">
                                      {isUploading === 'logoUrl' ? <Loader2 className="h-4 w-4 animate-spin"/> : <UploadCloud className="h-4 w-4 mr-2"/>}
                                      Changer
                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoUrl')} />
                                  </label>
                              </Button>
                          </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pwa" className="space-y-6">
                <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                    <CardHeader className="bg-primary/5 p-8 border-b border-white/5">
                        <CardTitle className="text-xl font-black text-white uppercase flex items-center gap-3">
                            <Smartphone className="text-primary"/> Branding App Mobile (PWA)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <FormField control={form.control} name="pwaAppName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Nom complet de l'App</FormLabel>
                                        <FormControl><Input {...field} value={field.value ?? ''} className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="pwaShortName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Nom court (Icône)</FormLabel>
                                        <FormControl><Input {...field} value={field.value ?? ''} className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="space-y-4">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500">Icône App (512px)</FormLabel>
                                <div className="relative h-40 w-40 rounded-[2rem] bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group shadow-2xl">
                                    {form.watch('pwaIconUrl') ? (
                                        <Image src={form.watch('pwaIconUrl')!} alt="PWA Icon" fill className="object-cover" />
                                    ) : (
                                        <Smartphone className="h-12 w-12 text-slate-800" />
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl bg-primary text-white border-none" asChild disabled={!!isUploading}>
                                            <label className="cursor-pointer">
                                                {isUploading === 'pwaIconUrl' ? <Loader2 className="h-4 w-4 animate-spin"/> : <UploadCloud className="h-4 w-4 mr-2"/>}
                                                Changer
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'pwaIconUrl')} />
                                            </label>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="platform" className="space-y-6">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="bg-slate-800/30 border-b border-white/5"><CardTitle className="text-lg font-bold text-white">Sécurité & Pilotage</CardTitle></CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold text-white flex items-center gap-2"><Wrench className="h-4 w-4" /> Mode Maintenance</FormLabel><FormDescription className="text-[10px]">Bloque l'accès aux membres</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="allowInstructorSignup" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold text-white flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Inscriptions Formateurs</FormLabel><FormDescription className="text-[10px]">Autorise les nouveaux experts</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="allowYoutube" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-800 rounded-2xl">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold text-white flex items-center gap-2"><Youtube className="h-4 w-4" /> Vidéos YouTube</FormLabel><FormDescription className="text-[10px]">Supporte les liens externes</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="allowBunny" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-800 rounded-2xl">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold text-white flex items-center gap-2"><PlayCircle className="h-4 w-4" /> Bunny.net Stream</FormLabel><FormDescription className="text-[10px]">Supporte le lecteur premium</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                    )} />
                  </div>
                  
                  <FormField control={form.control} name="announcementMessage" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">Bannière d'Annonce Globale</FormLabel>
                      <FormControl><Textarea placeholder="Texte défilant en haut du site..." {...field} value={field.value ?? ''} className="bg-slate-950 border-slate-800 rounded-xl text-white" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commercial" className="space-y-6">
                <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                    <CardHeader className="bg-slate-800/30 border-b border-white/5"><CardTitle className="text-lg font-bold text-white">Modèle Économique</CardTitle></CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <FormField control={form.control} name="commission" render={({ field }) => (
                            <FormItem className="max-w-xs">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><Percent className="h-3 w-3" /> Commission Plateforme (%)</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-14 bg-slate-800/50 border-slate-700 rounded-xl text-2xl font-black text-primary" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="affiliatePercentage" render={({ field }) => (
                            <FormItem className="max-w-xs">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><BadgeEuro className="h-3 w-3" /> Commission Ambassadeurs (%)</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-14 bg-slate-800/50 border-slate-700 rounded-xl text-2xl font-black text-blue-400" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="minPayoutThreshold" render={({ field }) => (
                            <FormItem className="max-w-xs">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> Seuil de retrait min (XOF)</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl font-bold text-white" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="design" className="space-y-6">
                <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                    <CardHeader className="bg-slate-800/30 border-b border-white/5"><CardTitle className="text-lg font-bold text-white">Apparence (Design System)</CardTitle></CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <FormField control={form.control} name="primaryColor" render={({ field }) => (
                            <FormItem className="max-w-xs">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><Palette className="h-3 w-3" /> Couleur Principale</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-12 bg-slate-800/50 border-slate-700 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        <SelectItem value="emerald">Vert Ndara (Emerald)</SelectItem>
                                        <SelectItem value="ocre">Ocre Sahélien</SelectItem>
                                        <SelectItem value="blue">Bleu Technologique</SelectItem>
                                        <SelectItem value="gold">Or Africain</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="borderRadius" render={({ field }) => (
                            <FormItem className="max-w-xs">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500">Arrondi des cartes (Radius)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-12 bg-slate-800/50 border-slate-700 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        <SelectItem value="none">Carré (0px)</SelectItem>
                                        <SelectItem value="md">Moyen (12px)</SelectItem>
                                        <SelectItem value="lg">Large (24px)</SelectItem>
                                        <SelectItem value="xl">Extra-Large (40px)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 z-40 safe-area-pb md:relative md:bg-transparent md:border-none md:p-0">
            <Button type="submit" disabled={isSaving} className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-[0.2em] shadow-2xl">
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5 mr-2" /> Valider la configuration globale</>}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}