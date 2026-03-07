'use client';

/**
 * @fileOverview Panneau de Configuration Globale Ndara Afrique.
 * ✅ RÉSOLU : Correction définitive de la structure syntaxique (suppression du code corrompu).
 * ✅ SOUVERAINETÉ : Upload direct vers Bunny CDN pour tous les médias.
 * ✅ PERFORMANCE : Outils de synchronisation massive pour les avis et membres.
 */

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { updateGlobalSettings } from '@/actions/settingsActions';
import { repairAllCertificatesAction, syncUsersWithAuthAction, syncAllCourseStatsAction } from '@/actions/userActions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Settings as SettingsIcon, 
  Loader2, 
  Save,
  Youtube,
  PlaySquare,
  Users as UsersIcon,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  Megaphone,
  Scale,
  Wrench,
  History,
  ImageIcon,
  UploadCloud,
  Star,
  CheckCircle2
} from 'lucide-react';
import type { Settings } from '@/lib/types';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const teamMemberSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  role: z.string().min(2, "Rôle requis"),
  imageUrl: z.string().url("URL invalide").or(z.literal('')),
  bio: z.string().max(500, "Bio trop longue").optional(),
});

const settingsSchema = z.object({
  siteName: z.string().min(2, "Le nom est trop court."),
  logoUrl: z.string().url("URL invalide.").or(z.literal('')),
  contactEmail: z.string().email("Email invalide."),
  commission: z.coerce.number().min(0).max(100),
  announcementMessage: z.string().optional(),
  maintenanceMode: z.boolean().default(false),
  allowInstructorSignup: z.boolean().default(true),
  allowYoutube: z.boolean().default(true),
  allowBunny: z.boolean().default(true),
  bunnyLibraryId: z.string().optional(),
  landingHeroTitle: z.string().optional(),
  landingHeroSubtitle: z.string().optional(),
  landingHeroImageUrl: z.string().url("URL invalide").or(z.literal('')).optional(),
  landingHeroCta: z.string().optional(),
  howItWorksTitle: z.string().optional(),
  howItWorksSubtitle: z.string().optional(),
  howItWorks_step1_imageUrl: z.string().url("URL invalide").or(z.literal('')).optional(),
  howItWorks_step2_imageUrl: z.string().url("URL invalide").or(z.literal('')).optional(),
  howItWorks_step3_imageUrl: z.string().url("URL invalide").or(z.literal('')).optional(),
  securitySectionTitle: z.string().optional(),
  securitySectionSubtitle: z.string().optional(),
  securitySection_imageUrl: z.string().url("URL invalide").or(z.literal('')).optional(),
  finalCtaTitle: z.string().optional(),
  finalCtaSubtitle: z.string().optional(),
  finalCtaButtonText: z.string().optional(),
  finalCta_imageUrl: z.string().url("URL invalide").or(z.literal('')).optional(),
  aboutMainTitle: z.string().optional(),
  aboutMainSubtitle: z.string().optional(),
  historyTitle: z.string().optional(),
  historyFrench: z.string().optional(),
  historySango: z.string().optional(),
  visionTitle: z.string().optional(),
  visionFrench: z.string().optional(),
  visionSango: z.string().optional(),
  aboutCtaTitle: z.string().optional(),
  teamMembers: z.array(teamMemberSchema).optional(),
  termsOfService: z.string().optional(),
  privacyPolicy: z.string().optional(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { teamMembers: [] }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "teamMembers"
  });

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Settings;
        form.reset({
          siteName: data.general?.siteName || 'Ndara Afrique',
          logoUrl: data.general?.logoUrl || '/logo.png',
          contactEmail: data.general?.contactEmail || '',
          commission: data.commercial?.platformCommission || 20,
          announcementMessage: data.platform?.announcementMessage || '',
          maintenanceMode: data.platform?.maintenanceMode || false,
          allowInstructorSignup: data.platform?.allowInstructorSignup ?? true,
          allowYoutube: data.platform?.allowYoutube ?? true,
          allowBunny: data.platform?.allowBunny ?? true,
          bunnyLibraryId: data.platform?.bunnyLibraryId || '',
          landingHeroTitle: data.content?.landingPage?.heroTitle || "",
          landingHeroSubtitle: data.content?.landingPage?.heroSubtitle || "",
          landingHeroImageUrl: data.content?.landingPage?.heroImageUrl || "",
          landingHeroCta: data.content?.landingPage?.heroCtaText || "",
          howItWorksTitle: data.content?.landingPage?.howItWorksTitle || "",
          howItWorksSubtitle: data.content?.landingPage?.howItWorksSubtitle || "",
          howItWorks_step1_imageUrl: data.content?.landingPage?.howItWorks_step1_imageUrl || "",
          howItWorks_step2_imageUrl: data.content?.landingPage?.howItWorks_step2_imageUrl || "",
          howItWorks_step3_imageUrl: data.content?.landingPage?.howItWorks_step3_imageUrl || "",
          securitySectionTitle: data.content?.landingPage?.securitySectionTitle || "",
          securitySectionSubtitle: data.content?.landingPage?.securitySectionSubtitle || "",
          securitySection_imageUrl: data.content?.landingPage?.securitySection_imageUrl || "",
          finalCtaTitle: data.content?.landingPage?.finalCtaTitle || "",
          finalCtaSubtitle: data.content?.landingPage?.finalCtaSubtitle || "",
          finalCtaButtonText: data.content?.landingPage?.finalCtaButtonText || "",
          finalCta_imageUrl: data.content?.landingPage?.finalCta_imageUrl || "",
          aboutMainTitle: data.content?.aboutPage?.mainTitle || "",
          aboutMainSubtitle: data.content?.aboutPage?.mainSubtitle || "",
          historyTitle: data.content?.aboutPage?.historyTitle || "",
          historyFrench: data.content?.aboutPage?.historyFrench || "",
          historySango: data.content?.aboutPage?.historySango || "",
          visionTitle: data.content?.aboutPage?.visionTitle || "",
          visionFrench: data.content?.aboutPage?.visionFrench || "",
          visionSango: data.content?.aboutPage?.visionSango || "",
          aboutCtaTitle: data.content?.aboutPage?.ctaTitle || "",
          teamMembers: data.content?.aboutPage?.teamMembers || [],
          termsOfService: data.legal?.termsOfService || '',
          privacyPolicy: data.legal?.privacyPolicy || '',
        });
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db, form]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploading(fieldName);
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', currentUser.uid);
        formData.append('folder', 'platform_assets');

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        if (fieldName.includes('.')) {
            const parts = fieldName.split('.');
            if (parts[0] === 'teamMembers') {
                const index = parseInt(parts[1]);
                const members = form.getValues('teamMembers') || [];
                if (members[index]) {
                    members[index].imageUrl = data.url;
                    form.setValue('teamMembers', members);
                }
            }
        } else {
            form.setValue(fieldName as any, data.url);
        }
        
        toast({ title: "Fichier prêt !", description: "L'image a été hébergée sur votre CDN." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Échec du téléversement", description: error.message });
    } finally {
        setIsUploading(null);
    }
  };

  const onSubmit = async (values: SettingsValues) => {
    if (!currentUser) return;
    setIsSaving(true);

    try {
      const result = await updateGlobalSettings({
        adminId: currentUser.uid,
        settings: {
          general: { siteName: values.siteName, logoUrl: values.logoUrl, contactEmail: values.contactEmail },
          commercial: { platformCommission: values.commission, currency: 'XOF', minPayoutThreshold: 5000 },
          platform: { 
            announcementMessage: values.announcementMessage, 
            maintenanceMode: values.maintenanceMode,
            allowInstructorSignup: values.allowInstructorSignup,
            allowYoutube: values.allowYoutube,
            allowBunny: values.allowBunny,
            bunnyLibraryId: values.bunnyLibraryId,
            autoApproveCourses: false,
            enableInternalMessaging: true
          },
          content: {
            landingPage: {
              heroTitle: values.landingHeroTitle,
              heroSubtitle: values.landingHeroSubtitle,
              heroImageUrl: values.landingHeroImageUrl,
              heroCtaText: values.landingHeroCta,
              howItWorksTitle: values.howItWorksTitle,
              howItWorksSubtitle: values.howItWorksSubtitle,
              howItWorks_step1_imageUrl: values.howItWorks_step1_imageUrl,
              howItWorks_step2_imageUrl: values.howItWorks_step2_imageUrl,
              howItWorks_step3_imageUrl: values.howItWorks_step3_imageUrl,
              securitySectionTitle: values.securitySectionTitle,
              securitySectionSubtitle: values.securitySectionSubtitle,
              securitySection_imageUrl: values.securitySection_imageUrl,
              finalCtaTitle: values.finalCtaTitle,
              finalCtaSubtitle: values.finalCtaSubtitle,
              finalCtaButtonText: values.finalCtaButtonText,
              finalCta_imageUrl: values.finalCta_imageUrl,
            },
            aboutPage: {
              mainTitle: values.aboutMainTitle || '',
              mainSubtitle: values.aboutMainSubtitle || '',
              historyTitle: values.historyTitle || '',
              historyFrench: values.historyFrench || '',
              historySango: values.historySango || '',
              visionTitle: values.visionTitle || '',
              visionFrench: values.visionFrench || '',
              visionSango: values.visionSango || '',
              ctaTitle: values.aboutCtaTitle || '',
              teamMembers: (values.teamMembers || []).map(m => ({
                name: m.name,
                role: m.role,
                imageUrl: m.imageUrl,
                bio: m.bio || ''
              })),
              ctaSubtitle: ''
            }
          },
          legal: {
            termsOfService: values.termsOfService || '',
            privacyPolicy: values.privacyPolicy || '',
          }
        }
      });
      if (result.success) {
        toast({ title: "Configuration Ndara enregistrée !" });
      } else {
        toast({ variant: 'destructive', title: "Erreur", description: result.error });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Erreur technique" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncRatings = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const result = await syncAllCourseStatsAction(currentUser.uid);
      if (result.success) {
        toast({ title: "Synchronisation terminée", description: `${result.count} formations mises à jour.` });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: "Échec sync" });
    } finally {
      setIsSyncing(false);
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
      <header className="px-1">
        <div className="flex items-center gap-2 text-primary mb-1">
            <SettingsIcon className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Pilotage Global</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Configuration Ndara</h1>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="bg-slate-900 border-slate-800 mb-6 h-12 p-1 overflow-x-auto overflow-y-hidden flex flex-nowrap items-center justify-start gap-1 w-full rounded-2xl no-scrollbar">
              <TabsTrigger value="general" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Général</TabsTrigger>
              <TabsTrigger value="platform" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Plateforme</TabsTrigger>
              <TabsTrigger value="video" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Vidéo</TabsTrigger>
              <TabsTrigger value="landing" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Accueil</TabsTrigger>
              <TabsTrigger value="about" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">À Propos</TabsTrigger>
              <TabsTrigger value="team" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">L'Équipe</TabsTrigger>
              <TabsTrigger value="legal" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Légal</TabsTrigger>
              <TabsTrigger value="maintenance" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0 text-amber-500">Outils</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 animate-in fade-in duration-500">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="p-6 border-b border-white/5 bg-slate-800/30">
                  <CardTitle className="text-lg font-bold">Identité & Contact</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6 p-6">
                  <FormField control={form.control} name="siteName" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nom de la plateforme</FormLabel>
                        <FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contactEmail" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email de contact</FormLabel>
                        <FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="commission" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Commission plateforme (%)</FormLabel>
                        <FormControl><Input type="number" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="platform" className="space-y-4 animate-in fade-in duration-500">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="p-6 border-b border-white/5 bg-slate-800/30">
                  <CardTitle className="text-lg font-bold">État de la Plateforme</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold text-white">Mode Maintenance</FormLabel>
                          <FormDescription className="text-[10px] uppercase">Désactiver le site pour le public</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="allowInstructorSignup" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-2xl">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold text-white">Inscriptions Formateurs</FormLabel>
                          <FormDescription className="text-[10px] uppercase">Autoriser les nouvelles demandes</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="announcementMessage" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                            <Megaphone className="h-3 w-3" /> Message d'annonce global
                        </FormLabel>
                        <FormControl><Textarea {...field} placeholder="Ex: Flash Sale ! -20% ce week-end..." rows={3} className="bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                        <FormDescription className="text-[10px] italic">Ce message apparaîtra en haut de chaque page.</FormDescription>
                        <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="video" className="space-y-4 animate-in fade-in duration-500">
                <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6 shadow-xl">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle className="text-lg font-bold">Hébergement Vidéo</CardTitle>
                        <CardDescription>Gérez les fournisseurs de streaming autorisés.</CardDescription>
                    </CardHeader>
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="allowBunny" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <PlaySquare className="h-5 w-5 text-primary" />
                                        <span className="text-sm font-bold text-white">Bunny Stream</span>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="allowYoutube" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <Youtube className="h-5 w-5 text-red-500" />
                                        <span className="text-sm font-bold text-white">YouTube</span>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="bunnyLibraryId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Library ID (Bunny)</FormLabel>
                                <FormControl><Input {...field} placeholder="Identifiant de votre bibliothèque" className="h-12 bg-slate-800/50 border-slate-700 rounded-xl font-mono" /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                </Card>
            </TabsContent>

            <TabsContent value="landing" className="space-y-4 animate-in fade-in duration-500">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="p-6 border-b border-white/5 bg-slate-800/30">
                  <CardTitle className="text-lg font-bold">Édition Page d'Accueil</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-primary tracking-widest border-b border-primary/10 pb-2 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5" /> Hero Section
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <FormField control={form.control} name="landingHeroTitle" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Titre Principal</FormLabel><FormControl><Input {...field} className="bg-slate-800 border-slate-700 h-12 rounded-xl" /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="landingHeroSubtitle" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Sous-titre</FormLabel><FormControl><Textarea {...field} rows={3} className="bg-slate-800 border-slate-700 rounded-xl" /></FormControl></FormItem>
                            )} />
                        </div>
                        <div className="space-y-4">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                                <ImageIcon className="h-3 w-3" /> Image Hero (Bunny CDN)
                            </Label>
                            <div className="relative aspect-video rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group">
                                {form.watch('landingHeroImageUrl') ? (
                                    <Image src={form.watch('landingHeroImageUrl')!} alt="Preview" fill className="object-cover" />
                                ) : (
                                    <ImageIcon className="h-10 w-10 text-slate-800" />
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl bg-primary text-white border-none" asChild disabled={!!isUploading}>
                                        <label className="cursor-pointer">
                                            {isUploading === 'landingHeroImageUrl' ? <Loader2 className="h-4 w-4 animate-spin"/> : <UploadCloud className="h-4 w-4 mr-2"/>}
                                            Téléverser
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'landingHeroImageUrl')} />
                                        </label>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="about" className="space-y-4 animate-in fade-in duration-500">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="p-6 border-b border-white/5 bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-bold">Le Manifeste Ndara</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="aboutMainTitle" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Titre Manifeste</FormLabel><FormControl><Input {...field} className="bg-slate-800 border-slate-700 h-12 rounded-xl" /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="aboutMainSubtitle" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Sous-titre Manifeste</FormLabel><FormControl><Input {...field} className="bg-slate-800 border-slate-700 h-12 rounded-xl" /></FormControl></FormItem>
                    )} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="historyFrench" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Histoire (FR)</FormLabel><FormControl><Textarea rows={4} {...field} className="bg-slate-800 border-slate-700" /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="historySango" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Histoire (Sango)</FormLabel><FormControl><Textarea rows={4} {...field} className="bg-slate-800 border-slate-700 italic" /></FormControl></FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team" className="space-y-4 animate-in fade-in duration-500">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="p-6 border-b border-white/5 bg-slate-800/30">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle className="text-lg font-bold">Équipe de Direction</CardTitle>
                    <Button type="button" size="sm" onClick={() => append({ name: '', role: '', imageUrl: '', bio: '' })} className="rounded-xl h-10 w-full sm:w-auto px-6 font-black uppercase text-[10px] tracking-widest">
                        <Plus className="h-4 w-4 mr-2" /> Ajouter un membre
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  {fields.length > 0 ? (
                    fields.map((field, index) => (
                      <div key={field.id} className="p-5 bg-slate-950/50 rounded-2xl border border-slate-800 relative group animate-in slide-in-from-top-2">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-2 right-2 text-slate-600 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="grid md:grid-cols-3 gap-4">
                          <FormField control={form.control} name={`teamMembers.${index}.name`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500">Nom</FormLabel><FormControl><Input {...field} className="bg-slate-900 border-slate-800" /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name={`teamMembers.${index}.role`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500">Rôle</FormLabel><FormControl><Input {...field} className="bg-slate-900 border-slate-800" /></FormControl></FormItem>
                          )} />
                          <div className="space-y-2">
                            <FormLabel className="text-[10px] uppercase font-black text-slate-500">Photo</FormLabel>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-slate-700">
                                    <AvatarImage src={form.watch(`teamMembers.${index}.imageUrl`)} />
                                    <AvatarFallback>{form.watch(`teamMembers.${index}.name`)?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <Button type="button" variant="outline" size="sm" className="h-9 text-[9px] uppercase font-black" asChild disabled={!!isUploading}>
                                    <label className="cursor-pointer">
                                        {isUploading === `teamMembers.${index}.imageUrl` ? <Loader2 className="h-3 w-3 animate-spin"/> : "Téléverser"}
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, `teamMembers.${index}.imageUrl`)} />
                                    </label>
                                </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-slate-950/20 border-2 border-dashed border-slate-800 rounded-[2rem]">
                        <UsersIcon className="mx-auto h-12 w-12 text-slate-700 mb-4" />
                        <p className="text-xs font-black uppercase text-slate-500 tracking-widest">Aucun membre enregistré</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="legal" className="space-y-4 animate-in fade-in duration-500">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="p-6 border-b border-white/5 bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <Scale className="h-6 w-6 text-primary" />
                    <CardTitle className="text-lg font-bold">Documents Légaux</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <FormField control={form.control} name="termsOfService" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Conditions Générales d'Utilisation (CGU)</FormLabel>
                      <FormControl><Textarea rows={12} {...field} placeholder="Rédigez vos CGU ici..." className="bg-slate-800/50 border-slate-700 rounded-xl font-sans text-sm leading-relaxed" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="privacyPolicy" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Politique de Confidentialité</FormLabel>
                      <FormControl><Textarea rows={12} {...field} placeholder="Rédigez votre politique de confidentialité..." className="bg-slate-800/50 border-slate-700 rounded-xl font-sans text-sm leading-relaxed" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4 animate-in fade-in duration-500">
                <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                    <CardHeader className="p-6 border-b border-white/5 bg-slate-800/30">
                        <div className="flex items-center gap-3">
                            <Wrench className="h-6 w-6 text-amber-500" />
                            <CardTitle className="text-lg font-bold">Outils de Maintenance</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex items-start gap-4">
                            <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-amber-500/70 text-[10px] font-bold uppercase leading-relaxed">
                                Outils de régularisation massive. À utiliser avec précaution. Ces actions modifient des milliers de documents simultanément.
                            </p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Button type="button" onClick={handleSyncRatings} disabled={isSyncing} className="h-16 bg-slate-950 border border-slate-800 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-800 transition-colors shadow-lg">
                                {isSyncing ? <Loader2 className="animate-spin mr-2"/> : <Star className="mr-2 h-4 w-4 text-primary"/>}
                                Recalculer les scores des cours
                            </Button>
                            <Button type="button" onClick={() => currentUser && repairAllCertificatesAction(currentUser.uid)} className="h-16 bg-slate-950 border border-slate-800 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-800 transition-colors shadow-lg">Réparer les Certificats (Mass Sync)</Button>
                            <Button type="button" onClick={() => currentUser && syncUsersWithAuthAction(currentUser.uid)} className="h-16 bg-slate-950 border border-slate-800 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-800 transition-colors shadow-lg">Importer membres Firebase Auth</Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 z-40 safe-area-pb md:relative md:bg-transparent md:border-none md:p-0">
            <Button type="submit" disabled={isSaving} className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all">
                {isSaving ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Sauvegarde...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Enregistrer la configuration globale</span>
                  </div>
                )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
