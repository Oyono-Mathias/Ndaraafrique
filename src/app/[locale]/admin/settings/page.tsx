'use client';

/**
 * @fileOverview Réglages Globaux Ndara Afrique.
 * ✅ NOUVEAU : Interrupteur pour le marché des Droits de Revente.
 */

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { updateGlobalSettings } from '@/actions/settingsActions';
import { syncUsersWithAuthAction, syncAllCourseStatsAction } from '@/actions/userActions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  ImageIcon,
  UploadCloud,
  CheckCircle2,
  Eye,
  Facebook,
  Linkedin,
  Twitter,
  Instagram,
  MessageCircle,
  Palette,
  Type,
  Layout,
  ShoppingCart,
  BadgeEuro
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
  supportPhone: z.string().optional(),
  facebookUrl: z.string().url("URL invalide").or(z.literal('')).optional(),
  linkedinUrl: z.string().url("URL invalide").or(z.literal('')).optional(),
  twitterUrl: z.string().url("URL invalide").or(z.literal('')).optional(),
  instagramUrl: z.string().url("URL invalide").or(z.literal('')).optional(),
  commission: z.coerce.number().min(0).max(100),
  announcementMessage: z.string().optional(),
  maintenanceMode: z.boolean().default(false),
  allowInstructorSignup: z.boolean().default(true),
  allowCourseBuyout: z.boolean().default(true),
  allowResaleRights: z.boolean().default(true), // ✅ Nouveau champ
  allowYoutube: z.boolean().default(true),
  allowBunny: z.boolean().default(true),
  bunnyLibraryId: z.string().optional(),
  primaryColor: z.enum(['emerald', 'ocre', 'blue', 'gold']).default('emerald'),
  fontScale: z.enum(['small', 'medium', 'large']).default('medium'),
  borderRadius: z.enum(['none', 'md', 'lg', 'xl']).default('lg'),
  landingHeroTitle: z.string().optional(),
  landingHeroSubtitle: z.string().optional(),
  landingHeroImageUrl: z.string().url("URL invalide").or(z.literal('')).optional(),
  landingHeroCta: z.string().optional(),
  showHeroCta: z.boolean().default(true),
  showHeroExplore: z.boolean().default(true),
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
  showFinalCta: z.boolean().default(true),
  showFinalContact: z.boolean().default(true),
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
    defaultValues: { 
      teamMembers: [],
      showHeroCta: true,
      showHeroExplore: true,
      showFinalCta: true,
      showFinalContact: true,
      logoUrl: '/logo.png',
      primaryColor: 'emerald',
      fontScale: 'medium',
      borderRadius: 'lg',
      allowCourseBuyout: true,
      allowResaleRights: true
    }
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
          supportPhone: data.general?.supportPhone || '',
          facebookUrl: data.general?.facebookUrl || '',
          linkedinUrl: data.general?.linkedinUrl || '',
          twitterUrl: data.general?.twitterUrl || '',
          instagramUrl: data.general?.instagramUrl || '',
          commission: data.commercial?.platformCommission || 20,
          announcementMessage: data.platform?.announcementMessage || '',
          maintenanceMode: data.platform?.maintenanceMode || false,
          allowInstructorSignup: data.platform?.allowInstructorSignup ?? true,
          allowCourseBuyout: data.platform?.allowCourseBuyout ?? true,
          allowResaleRights: data.platform?.allowResaleRights ?? true,
          allowYoutube: data.platform?.allowYoutube ?? true,
          allowBunny: data.platform?.allowBunny ?? true,
          bunnyLibraryId: data.platform?.bunnyLibraryId || '',
          primaryColor: data.design?.primaryColor || 'emerald',
          fontScale: data.design?.fontScale || 'medium',
          borderRadius: data.design?.borderRadius || 'lg',
          landingHeroTitle: data.content?.landingPage?.heroTitle || "",
          landingHeroSubtitle: data.content?.landingPage?.heroSubtitle || "",
          landingHeroImageUrl: data.content?.landingPage?.heroImageUrl || "",
          landingHeroCta: data.content?.landingPage?.heroCtaText || "",
          showHeroCta: data.content?.landingPage?.showHeroCta ?? true,
          showHeroExplore: data.content?.landingPage?.showHeroExplore ?? true,
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
          showFinalCta: data.content?.landingPage?.showFinalCta ?? true,
          showFinalContact: data.content?.landingPage?.showFinalContact ?? true,
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
      const payload: Partial<Settings> = {
        general: { 
          siteName: values.siteName, 
          logoUrl: values.logoUrl, 
          contactEmail: values.contactEmail,
          supportPhone: values.supportPhone,
          facebookUrl: values.facebookUrl,
          linkedinUrl: values.linkedinUrl,
          twitterUrl: values.twitterUrl,
          instagramUrl: values.instagramUrl
        },
        commercial: { platformCommission: values.commission, currency: 'XOF', minPayoutThreshold: 5000 },
        platform: { 
          announcementMessage: values.announcementMessage, 
          maintenanceMode: values.maintenanceMode,
          allowInstructorSignup: values.allowInstructorSignup,
          allowCourseBuyout: values.allowCourseBuyout,
          allowResaleRights: values.allowResaleRights,
          allowYoutube: values.allowYoutube,
          allowBunny: values.allowBunny,
          bunnyLibraryId: values.bunnyLibraryId,
          autoApproveCourses: false,
          enableInternalMessaging: true
        },
        design: {
          primaryColor: values.primaryColor,
          fontScale: values.fontScale,
          borderRadius: values.borderRadius,
        },
        content: {
          landingPage: {
            heroTitle: values.landingHeroTitle,
            heroSubtitle: values.landingHeroSubtitle,
            heroImageUrl: values.landingHeroImageUrl,
            heroCtaText: values.landingHeroCta,
            showHeroCta: values.showHeroCta,
            showHeroExplore: values.showHeroExplore,
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
            showFinalCta: values.showFinalCta,
            showFinalContact: values.showFinalContact,
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
      };

      const result = await updateGlobalSettings({
        adminId: currentUser.uid,
        settings: payload
      });

      if (result.success) {
        toast({ title: "Configuration Ndara enregistrée !" });
      } else {
        toast({ variant: 'destructive', title: "Erreur", description: result.error });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Erreur technique", description: e.message });
    } finally {
      setIsSaving(false);
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
              <TabsTrigger value="design" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Studio Design</TabsTrigger>
              <TabsTrigger value="platform" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Plateforme</TabsTrigger>
              <TabsTrigger value="video" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Vidéo</TabsTrigger>
              <TabsTrigger value="landing" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Accueil</TabsTrigger>
              <TabsTrigger value="about" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">À Propos</TabsTrigger>
              <TabsTrigger value="team" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">L'Équipe</TabsTrigger>
              <TabsTrigger value="legal" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Légal</TabsTrigger>
              <TabsTrigger value="maintenance" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0 text-amber-500">Outils</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="p-6 border-b border-white/5 bg-slate-800/30">
                  <CardTitle className="text-lg font-bold">Identité de Marque</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="grid md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-6">
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
                      <FormField control={form.control} name="supportPhone" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                              <MessageCircle className="h-3 w-3" /> WhatsApp de Support
                            </FormLabel>
                            <FormControl><Input placeholder="+236..." {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                            <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="space-y-4">
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                          <ImageIcon className="h-3 w-3" /> Logo du Site (Bunny CDN)
                      </FormLabel>
                      <div className="relative h-32 w-32 rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group">
                          {form.watch('logoUrl') ? (
                              <Image src={form.watch('logoUrl')!} alt="Logo Preview" fill className="object-contain p-4" />
                          ) : (
                              <ImageIcon className="h-10 w-10 text-slate-800" />
                          )}
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

                  <div className="pt-6 border-t border-white/5 space-y-6">
                    <h3 className="text-xs font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                      <UsersIcon className="h-3.5 w-3.5" /> Présence Sociale
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="facebookUrl" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                              <Facebook className="h-3 w-3" /> Facebook
                            </FormLabel>
                            <FormControl><Input placeholder="https://facebook.com/..." {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                            <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                              <Linkedin className="h-3 w-3" /> LinkedIn
                            </FormLabel>
                            <FormControl><Input placeholder="https://linkedin.com/company/..." {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                            <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="twitterUrl" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                              <Twitter className="h-3 w-3" /> Twitter / X
                            </FormLabel>
                            <FormControl><Input placeholder="https://x.com/..." {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                            <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="instagramUrl" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                              <Instagram className="h-3 w-3" /> Instagram
                            </FormLabel>
                            <FormControl><Input placeholder="https://instagram.com/..." {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                            <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="design" className="space-y-6">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="p-6 border-b border-white/5 bg-slate-800/30">
                  <CardTitle className="text-lg font-bold">Ambiance Visuelle (Studio Design)</CardTitle>
                  <CardDescription>Ajustez les couleurs et la structure sans toucher au code.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-10">
                  <div className="grid md:grid-cols-2 gap-8">
                    <FormField control={form.control} name="primaryColor" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                          <Palette className="h-3.5 w-3.5" /> Thème de Couleur
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-14 bg-slate-800 border-slate-700 rounded-xl">
                              <SelectValue placeholder="Choisir une couleur" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="emerald" className="py-3">🌿 Émeraude Ndara (Vert)</SelectItem>
                            <SelectItem value="ocre" className="py-3">🏜️ Ocre Sahélien (Marron)</SelectItem>
                            <SelectItem value="blue" className="py-3">💎 Deep Tech (Bleu)</SelectItem>
                            <SelectItem value="gold" className="py-3">👑 Or Panafricain (Jaune)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="fontScale" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                          <Type className="h-3.5 w-3.5" /> Taille des Textes
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-14 bg-slate-800 border-slate-700 rounded-xl">
                              <SelectValue placeholder="Choisir une échelle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="small" className="py-3">Compact (Fin)</SelectItem>
                            <SelectItem value="medium" className="py-3">Standard (Équilibré)</SelectItem>
                            <SelectItem value="large" className="py-3">Confort (Large)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="borderRadius" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                          <Layout className="h-3.5 w-3.5" /> Courbure des Éléments
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-14 bg-slate-800 border-slate-700 rounded-xl">
                              <SelectValue placeholder="Choisir un arrondi" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="none" className="py-3">Droit (Brut)</SelectItem>
                            <SelectItem value="md" className="py-3">Modéré (Soft)</SelectItem>
                            <SelectItem value="lg" className="py-3">Accentué (Ndara Style)</SelectItem>
                            <SelectItem value="xl" className="py-3">Immersif (Android First)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="platform" className="space-y-4">
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
                          <FormDescription className="text-[10px] uppercase">Désactiver le site</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="allowInstructorSignup" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-2xl">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold text-white">Inscriptions Formateurs</FormLabel>
                          <FormDescription className="text-[10px] uppercase">Autoriser nouvelles demandes</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="allowCourseBuyout" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold text-white flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-primary" /> Rachat de formations
                          </FormLabel>
                          <FormDescription className="text-[10px] uppercase">Autoriser les cessions directes</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    {/* ✅ NOUVEAU : Interrupteur Resale Rights */}
                    <FormField control={form.control} name="allowResaleRights" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold text-white flex items-center gap-2">
                            <BadgeEuro className="h-4 w-4 text-amber-500" /> Marché des Droits (NFT-style)
                          </FormLabel>
                          <FormDescription className="text-[10px] uppercase">Autoriser la revente de licences</FormDescription>
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
                        <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ... Autres onglets (video, landing, about, team, legal, maintenance) ... */}
            
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
