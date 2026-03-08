'use client';

/**
 * @fileOverview Réglages Globaux Ndara Afrique.
 * ✅ AJOUT : Configuration PWA (Branding App Mobile).
 */

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { updateGlobalSettings } from '@/actions/settingsActions';
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
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon, 
  Loader2, 
  Save,
  ImageIcon,
  UploadCloud,
  CheckCircle2,
  ShoppingCart,
  BadgeEuro,
  ShieldCheck,
  MessageSquare,
  Globe,
  Percent,
  Users,
  Plus,
  Trash2,
  TrendingUp,
  UserPlus,
  Clock,
  Smartphone
} from 'lucide-react';
import type { Settings } from '@/lib/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
  allowResaleRights: z.boolean().default(true),
  allowTeacherToTeacherResale: z.boolean().default(false),
  autoApproveCourses: z.boolean().default(false),
  enableInternalMessaging: z.boolean().default(true),
  allowYoutube: z.boolean().default(true),
  allowBunny: z.boolean().default(true),
  primaryColor: z.enum(['emerald', 'ocre', 'blue', 'gold']).default('emerald'),
  fontScale: z.enum(['small', 'medium', 'large']).default('medium'),
  borderRadius: z.enum(['none', 'md', 'lg', 'xl']).default('lg'),
  teamMembers: z.array(teamMemberSchema).optional(),
  // --- REVENUS ---
  affiliateEnabled: z.boolean().default(true),
  affiliatePercentage: z.coerce.number().min(0).max(50),
  affiliateCookieDurationDays: z.coerce.number().min(1).max(365),
  referralEnabled: z.boolean().default(true),
  referralPercentage: z.coerce.number().min(0).max(20),
  minPayoutThreshold: z.coerce.number().min(1000),
  // --- PWA ---
  pwaAppName: z.string().min(3, "Nom requis"),
  pwaShortName: z.string().min(3, "Nom court requis"),
  pwaIconUrl: z.string().url("URL invalide").or(z.literal('')),
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
      teamMembers: [],
      allowCourseBuyout: true,
      allowResaleRights: true,
      allowTeacherToTeacherResale: false,
      autoApproveCourses: false,
      enableInternalMessaging: true,
      affiliateEnabled: true,
      affiliatePercentage: 10,
      affiliateCookieDurationDays: 30,
      referralEnabled: true,
      referralPercentage: 5,
      minPayoutThreshold: 5000,
      pwaAppName: 'Ndara Afrique',
      pwaShortName: 'Ndara',
      pwaIconUrl: '/logo.png',
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
          allowTeacherToTeacherResale: data.platform?.allowTeacherToTeacherResale ?? false,
          autoApproveCourses: data.platform?.autoApproveCourses ?? false,
          enableInternalMessaging: data.platform?.enableInternalMessaging ?? true,
          allowYoutube: data.platform?.allowYoutube ?? true,
          allowBunny: data.platform?.allowBunny ?? true,
          primaryColor: data.design?.primaryColor || 'emerald',
          fontScale: data.design?.fontScale || 'medium',
          borderRadius: data.design?.borderRadius || 'lg',
          teamMembers: data.content?.aboutPage?.teamMembers || [],
          // --- REVENUS ---
          affiliateEnabled: data.commercial?.affiliateEnabled ?? true,
          affiliatePercentage: data.commercial?.affiliatePercentage ?? 10,
          affiliateCookieDurationDays: data.commercial?.affiliateCookieDurationDays ?? 30,
          referralEnabled: data.commercial?.referralEnabled ?? true,
          referralPercentage: data.commercial?.referralPercentage ?? 5,
          minPayoutThreshold: data.commercial?.minPayoutThreshold ?? 5000,
          // --- PWA ---
          pwaAppName: data.pwa?.appName || 'Ndara Afrique',
          pwaShortName: data.pwa?.shortName || 'Ndara',
          pwaIconUrl: data.pwa?.iconUrl || '/logo.png',
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
            logoUrl: values.logoUrl, 
            contactEmail: values.contactEmail, 
            supportPhone: values.supportPhone, 
            facebookUrl: values.facebookUrl, 
            linkedinUrl: values.linkedinUrl, 
            twitterUrl: values.twitterUrl, 
            instagramUrl: values.instagramUrl 
          },
          commercial: { 
            platformCommission: values.commission, 
            currency: 'XOF', 
            minPayoutThreshold: values.minPayoutThreshold,
            affiliateEnabled: values.affiliateEnabled,
            affiliatePercentage: values.affiliatePercentage,
            affiliateCookieDurationDays: values.affiliateCookieDurationDays,
            referralEnabled: values.referralEnabled,
            referralPercentage: values.referralPercentage
          },
          platform: { 
            announcementMessage: values.announcementMessage, 
            maintenanceMode: values.maintenanceMode,
            allowInstructorSignup: values.allowInstructorSignup,
            allowCourseBuyout: values.allowCourseBuyout,
            allowResaleRights: values.allowResaleRights,
            allowTeacherToTeacherResale: values.allowTeacherToTeacherResale,
            autoApproveCourses: values.autoApproveCourses,
            enableInternalMessaging: values.enableInternalMessaging,
            allowYoutube: values.allowYoutube,
            allowBunny: values.allowBunny
          },
          pwa: {
            appName: values.pwaAppName,
            shortName: values.pwaShortName,
            appDescription: "L'excellence panafricaine par le savoir.",
            iconUrl: values.pwaIconUrl,
            themeColor: '#10b981',
            backgroundColor: '#0f172a'
          },
          design: { primaryColor: values.primaryColor, fontScale: values.fontScale, borderRadius: values.borderRadius },
          content: {
              aboutPage: { teamMembers: values.teamMembers }
          }
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

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

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
              <TabsTrigger value="pwa" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest text-primary">App Mobile (PWA)</TabsTrigger>
              <TabsTrigger value="growth" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest">Croissance</TabsTrigger>
              <TabsTrigger value="design" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest">Studio Design</TabsTrigger>
              <TabsTrigger value="platform" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest">Plateforme</TabsTrigger>
              <TabsTrigger value="content" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest">Contenu</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-800/30 border-b border-white/5"><CardTitle className="text-lg font-bold">Identité & Contact</CardTitle></CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <FormField control={form.control} name="siteName" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Nom du site</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="contactEmail" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Email de contact</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="supportPhone" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">WhatsApp Support</FormLabel><FormControl><Input placeholder="+236..." {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="space-y-4">
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">Logo Site (Square)</FormLabel>
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
                  <Separator className="bg-white/5" />
                  <div className="space-y-6">
                    <CardTitle className="text-sm font-black uppercase text-slate-500 flex items-center gap-2"><Globe className="h-4 w-4"/> Réseaux Sociaux</CardTitle>
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="facebookUrl" render={({ field }) => ( <FormItem><FormLabel className="text-[9px] font-bold text-slate-600 uppercase">Facebook</FormLabel><FormControl><Input {...field} className="bg-slate-800/30" /></FormControl></FormItem> )} />
                        <FormField control={form.control} name="linkedinUrl" render={({ field }) => ( <FormItem><FormLabel className="text-[9px] font-bold text-slate-600 uppercase">LinkedIn</FormLabel><FormControl><Input {...field} className="bg-slate-800/30" /></FormControl></FormItem> )} />
                        <FormField control={form.control} name="twitterUrl" render={({ field }) => ( <FormItem><FormLabel className="text-[9px] font-bold text-slate-600 uppercase">X (Twitter)</FormLabel><FormControl><Input {...field} className="bg-slate-800/30" /></FormControl></FormItem> )} />
                        <FormField control={form.control} name="instagramUrl" render={({ field }) => ( <FormItem><FormLabel className="text-[9px] font-bold text-slate-600 uppercase">Instagram</FormLabel><FormControl><Input {...field} className="bg-slate-800/30" /></FormControl></FormItem> )} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pwa" className="space-y-6">
                <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl border-l-4 border-l-primary">
                    <CardHeader className="bg-primary/5 p-8 border-b border-white/5">
                        <CardTitle className="text-xl font-black text-white uppercase flex items-center gap-3">
                            <Smartphone className="text-primary"/> Branding App Mobile (PWA)
                        </CardTitle>
                        <CardDescription>Configurez comment Ndara s'affiche une fois installée sur mobile.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <FormField control={form.control} name="pwaAppName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nom complet de l'App</FormLabel>
                                        <FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="pwaShortName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nom court (Icon Label)</FormLabel>
                                        <FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                                        <FormDescription className="text-[9px]">Ce qui s'affiche sous l'icône sur l'écran d'accueil.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            
                            <div className="space-y-4">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Icône App (512x512px)</FormLabel>
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
                                                Charger l'icône
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'pwaIconUrl')} />
                                            </label>
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-500 italic max-w-[200px]">Utilisez un fond opaque et un design simple pour une meilleure visibilité sur smartphone.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="commercial" className="space-y-6">
                <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                    <CardHeader className="bg-slate-800/30 border-b border-white/5"><CardTitle className="text-lg font-bold">Modèle Économique</CardTitle></CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <FormField control={form.control} name="commission" render={({ field }) => (
                            <FormItem className="max-w-xs">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><Percent className="h-3 w-3" /> Commission Ndara Afrique (%)</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-14 bg-slate-800/50 border-slate-700 rounded-xl text-2xl font-black text-primary" /></FormControl>
                                <FormDescription className="text-[10px] italic">Pourcentage prélevé sur chaque vente formateur.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="minPayoutThreshold" render={({ field }) => (
                            <FormItem className="max-w-xs">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><BadgeEuro className="h-3 w-3" /> Seuil de retrait minimum (XOF)</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl font-bold" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="growth" className="space-y-6">
                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="bg-primary/5 p-8 border-b border-white/5">
                        <CardTitle className="text-xl font-black text-white uppercase flex items-center gap-3"><TrendingUp className="text-primary"/> Accélération de Croissance</CardTitle>
                        <CardDescription>Gérez les systèmes de recommandation rémunérée.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-10">
                        {/* Section Ambassadeurs */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-white flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" /> Programme Ambassadeur (Étudiants)</h3>
                                    <p className="text-xs text-slate-500">Permet aux étudiants de revendre les cours et toucher des commissions.</p>
                                </div>
                                <FormField control={form.control} name="affiliateEnabled" render={({ field }) => (
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                )} />
                            </div>
                            <div className={cn("grid sm:grid-cols-2 gap-6", !form.watch('affiliateEnabled') && "opacity-40 pointer-events-none")}>
                                <FormField control={form.control} name="affiliatePercentage" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Commission Ambassadeur (%)</FormLabel>
                                        <FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="affiliateCookieDurationDays" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><Clock className="h-3 w-3" /> Durée du Cookie (Jours)</FormLabel>
                                        <FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                                        <FormDescription className="text-[9px]">Temps pendant lequel l'affilié reste crédité après le clic.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        <Separator className="bg-white/5" />

                        {/* Section Parrainage */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-white flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Parrainage d'Instructeurs</h3>
                                    <p className="text-xs text-slate-500">Commissions pour les formateurs qui invitent de nouveaux experts.</p>
                                </div>
                                <FormField control={form.control} name="referralEnabled" render={({ field }) => (
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                )} />
                            </div>
                            <div className={cn("grid sm:grid-cols-2 gap-6", !form.watch('referralEnabled') && "opacity-40 pointer-events-none")}>
                                <FormField control={form.control} name="referralPercentage" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Commission Parrain (%)</FormLabel>
                                        <FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="design" className="space-y-6">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-800/30 border-b border-white/5"><CardTitle className="text-lg font-bold">Studio Design Ndara</CardTitle></CardHeader>
                <CardContent className="p-6 grid md:grid-cols-3 gap-8">
                    <FormField control={form.control} name="primaryColor" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Palette Couleur</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl><SelectTrigger className="h-12 bg-slate-800 border-slate-700 rounded-xl"><SelectValue placeholder="Couleur" /></SelectTrigger></FormControl>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="emerald">🌿 Émeraude Ndara</SelectItem>
                            <SelectItem value="ocre">🏜️ Ocre Sahélien</SelectItem>
                            <SelectItem value="blue">💎 Bleu Royal</SelectItem>
                            <SelectItem value="gold">👑 Or Panafricain</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="fontScale" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Taille Textes</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl><SelectTrigger className="h-12 bg-slate-800 border-slate-700 rounded-xl"><SelectValue placeholder="Taille" /></SelectTrigger></FormControl>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="small">Compact</SelectItem>
                            <SelectItem value="medium">Standard</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="borderRadius" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Style des Cartes</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl><SelectTrigger className="h-12 bg-slate-800 border-slate-700 rounded-xl"><SelectValue placeholder="Arrondi" /></SelectTrigger></FormControl>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="none">Flat (Carré)</SelectItem>
                            <SelectItem value="md">Modern (Doux)</SelectItem>
                            <SelectItem value="lg">Round (Arrondi)</SelectItem>
                            <SelectItem value="xl">Ultra Round (Vintage)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="platform" className="space-y-4">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="bg-slate-800/30 border-b border-white/5"><CardTitle className="text-lg font-bold">Sécurité & Économie</CardTitle></CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="allowCourseBuyout" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold text-white flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Rachat direct</FormLabel><FormDescription className="text-[10px] uppercase">Vente à Ndara</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="allowResaleRights" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold text-white flex items-center gap-2"><BadgeEuro className="h-4 w-4" /> Bourse du Savoir</FormLabel><FormDescription className="text-[10px] uppercase">Marché des Licences</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="autoApproveCourses" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold text-white flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Approbation Auto</FormLabel><FormDescription className="text-[10px] uppercase">Pas de modération</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="enableInternalMessaging" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold text-white flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Messagerie Interne</FormLabel><FormDescription className="text-[10px] uppercase">Chat entre membres</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-6">
                <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                    <CardHeader className="bg-slate-800/30 border-b border-white/5 flex flex-row items-center justify-between p-8">
                        <div><CardTitle className="text-lg font-bold flex items-center gap-2"><Users className="h-5 w-5"/> Équipe de Direction</CardTitle><CardDescription>Gérez les membres affichés sur la page "À propos".</CardDescription></div>
                        <Button type="button" onClick={() => append({ name: '', role: '', imageUrl: '', bio: '' })} className="rounded-xl h-10 px-4 font-black uppercase text-[9px] tracking-widest"><Plus className="h-4 w-4 mr-2"/> Ajouter un membre</Button>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid gap-6">
                            {fields.map((field, index) => (
                                <div key={field.id} className="p-6 bg-slate-950 border border-slate-800 rounded-3xl relative">
                                    <Button variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-4 right-4 text-red-500 hover:bg-red-500/10 rounded-full h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <FormField control={form.control} name={`teamMembers.${index}.name`} render={({ field }) => ( <FormItem><FormLabel className="text-[9px] uppercase font-black text-slate-600">Nom Complet</FormLabel><FormControl><Input {...field} className="bg-slate-900 border-slate-800" /></FormControl></FormItem> )} />
                                            <FormField control={form.control} name={`teamMembers.${index}.role`} render={({ field }) => ( <FormItem><FormLabel className="text-[9px] uppercase font-black text-slate-600">Poste / Rôle</FormLabel><FormControl><Input {...field} className="bg-slate-900 border-slate-800" /></FormControl></FormItem> )} />
                                        </div>
                                        <div className="space-y-4">
                                            <FormField control={form.control} name={`teamMembers.${index}.imageUrl`} render={({ field }) => ( <FormItem><FormLabel className="text-[9px] uppercase font-black text-slate-600">URL de l'image</FormLabel><FormControl><Input {...field} placeholder="https://..." className="bg-slate-900 border-slate-800" /></FormControl></FormItem> )} />
                                            <FormField control={form.control} name={`teamMembers.${index}.bio`} render={({ field }) => ( <FormItem><FormLabel className="text-[9px] uppercase font-black text-slate-600">Biographie courte</FormLabel><FormControl><Textarea {...field} rows={2} className="bg-slate-900 border-slate-800 resize-none" /></FormControl></FormItem> )} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
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