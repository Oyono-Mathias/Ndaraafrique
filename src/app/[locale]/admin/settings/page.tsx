'use client';

/**
 * @fileOverview Page de configuration globale Ndara Afrique (Android-First Optimisée).
 * ✅ RÉSOLU : Tabs scrollables horizontalement sur mobile.
 * ✅ RÉSOLU : Cartes équipe et boutons ajustés pour éviter les débordements.
 */

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { updateGlobalSettings } from '@/actions/settingsActions';
import { migrateUserProfilesAction, syncUsersWithAuthAction, repairAllCertificatesAction } from '@/actions/userActions';
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
  Globe, 
  ShieldCheck, 
  Loader2, 
  Save,
  FileText,
  Layout,
  Sparkles,
  Users as UsersIcon,
  Wrench,
  RefreshCw,
  AlertTriangle,
  Plus,
  Trash2,
  Award,
  Youtube,
  PlaySquare,
  Key,
} from 'lucide-react';
import type { Settings } from '@/lib/types';

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
  landingHeroCta: z.string().optional(),
  landingStepsTitle: z.string().optional(),
  landingStepsSubtitle: z.string().optional(),
  landingTrustTitle: z.string().optional(),
  landingTrustSubtitle: z.string().optional(),
  landingFinalCtaTitle: z.string().optional(),
  landingFinalCtaSubtitle: z.string().optional(),
  landingFinalCtaBtn: z.string().optional(),
  aboutMainTitle: z.string().optional(),
  aboutHistoryTitle: z.string().optional(),
  aboutHistoryFrench: z.string().optional(),
  aboutHistorySango: z.string().optional(),
  aboutVisionTitle: z.string().optional(),
  aboutVisionFrench: z.string().optional(),
  aboutVisionSango: z.string().optional(),
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
  const [isMigrating, setIsMigrating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

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
          landingHeroCta: data.content?.landingPage?.heroCtaText || "",
          landingStepsTitle: data.content?.landingPage?.howItWorksTitle || "",
          landingStepsSubtitle: data.content?.landingPage?.howItWorksSubtitle || "",
          landingTrustTitle: data.content?.landingPage?.securitySectionTitle || "",
          landingTrustSubtitle: data.content?.landingPage?.securitySectionSubtitle || "",
          landingFinalCtaTitle: data.content?.landingPage?.finalCtaTitle || "",
          landingFinalCtaSubtitle: data.content?.landingPage?.finalCtaSubtitle || "",
          landingFinalCtaBtn: data.content?.landingPage?.finalCtaButtonText || "",
          aboutMainTitle: data.content?.aboutPage?.mainTitle || "",
          aboutHistoryTitle: data.content?.aboutPage?.historyTitle || "",
          aboutHistoryFrench: data.content?.aboutPage?.historyFrench || "",
          aboutHistorySango: data.content?.aboutPage?.historySango || "",
          aboutVisionTitle: data.content?.aboutPage?.visionTitle || "",
          aboutVisionFrench: data.content?.aboutPage?.visionFrench || "",
          aboutVisionSango: data.content?.aboutPage?.visionSango || "",
          teamMembers: data.content?.aboutPage?.teamMembers || [],
          termsOfService: data.legal?.termsOfService || '',
          privacyPolicy: data.legal?.privacyPolicy || '',
        });
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db, form]);

  const onSubmit = async (values: SettingsValues) => {
    if (!currentUser) return;
    setIsSaving(true);

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
            heroCtaText: values.landingHeroCta,
            howItWorksTitle: values.landingStepsTitle,
            howItWorksSubtitle: values.landingStepsSubtitle,
            securitySectionTitle: values.landingTrustTitle,
            securitySectionSubtitle: values.landingTrustSubtitle,
            finalCtaTitle: values.landingFinalCtaTitle,
            finalCtaSubtitle: values.landingFinalCtaSubtitle,
            finalCtaButtonText: values.landingFinalCtaBtn,
          },
          aboutPage: {
            mainTitle: values.aboutMainTitle || '',
            mainSubtitle: '',
            historyTitle: values.aboutHistoryTitle || '',
            historyFrench: values.aboutHistoryFrench || '',
            historySango: values.aboutHistorySango || '',
            visionTitle: values.aboutVisionTitle || '',
            visionFrench: values.aboutVisionFrench || '',
            visionSango: values.aboutVisionSango || '',
            teamMembers: (values.teamMembers || []).map(m => ({
              name: m.name,
              role: m.role,
              imageUrl: m.imageUrl,
              bio: m.bio || ''
            })),
            ctaTitle: '',
            ctaSubtitle: '',
          }
        },
        legal: {
          termsOfService: values.termsOfService || '',
          privacyPolicy: values.privacyPolicy || '',
        }
      }
    });

    if (result.success) {
      toast({ title: "Paramètres mis à jour avec succès !" });
    } else {
      toast({ variant: 'destructive', title: "Erreur", description: result.error });
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-col gap-1 px-1">
        <div className="flex items-center gap-2 text-primary">
            <SettingsIcon className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Centre de pilotage</span>
        </div>
        <h1 className="text-xl md:text-3xl font-black text-white uppercase tracking-tight">Configuration Ndara</h1>
        <p className="text-slate-500 text-[11px] font-medium italic leading-tight">Gérez l'identité et les règles de votre plateforme.</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            {/* ✅ Barre d'onglets corrigée : flex-nowrap + overflow-x-auto */}
            <TabsList className="bg-slate-900 border-slate-800 mb-6 h-12 p-1 overflow-x-auto overflow-y-hidden flex flex-nowrap items-center justify-start gap-1 w-full rounded-2xl no-scrollbar">
              <TabsTrigger value="general" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Général</TabsTrigger>
              <TabsTrigger value="platform" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Plateforme</TabsTrigger>
              <TabsTrigger value="video" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Vidéo</TabsTrigger>
              <TabsTrigger value="content" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Textes</TabsTrigger>
              <TabsTrigger value="team" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">L'Équipe</TabsTrigger>
              <TabsTrigger value="legal" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Légal</TabsTrigger>
              <TabsTrigger value="maintenance" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0 text-amber-500">Outils</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 animate-in fade-in duration-500">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="p-6 border-b border-white/5">
                  <CardTitle className="text-lg font-bold">Identité du Site</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6 p-6">
                  <FormField control={form.control} name="siteName" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nom de la marque</FormLabel>
                        <FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="logoUrl" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">URL du Logo</FormLabel>
                        <FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl font-mono text-[10px]" /></FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contactEmail" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email contact</FormLabel>
                        <FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="commission" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Commission (%)</FormLabel>
                        <FormControl><Input type="number" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl font-bold" /></FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="platform" className="space-y-4 animate-in fade-in duration-500">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="p-6 border-b border-white/5">
                  <CardTitle className="text-lg font-bold">Règles & État</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <FormField control={form.control} name="announcementMessage" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Annonce globale</FormLabel>
                        <FormControl><Textarea {...field} className="bg-slate-800/50 border-slate-700 rounded-xl resize-none" rows={3} /></FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-2xl">
                        <FormLabel className="text-sm font-bold text-white uppercase tracking-tight">Maintenance</FormLabel>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="allowInstructorSignup" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-2xl">
                        <FormLabel className="text-sm font-bold text-white uppercase tracking-tight">Recrutement</FormLabel>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team" className="space-y-4 animate-in fade-in duration-500">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="p-6 border-b border-white/5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold">Équipe Ndara</CardTitle>
                        <CardDescription className="text-[11px]">Membres affichés sur "À Propos".</CardDescription>
                    </div>
                    <Button type="button" size="sm" onClick={() => append({ name: '', role: '', imageUrl: '', bio: '' })} className="rounded-xl h-10 w-full sm:w-auto px-6 font-black uppercase text-[10px] tracking-widest">
                        <Plus className="h-4 w-4 mr-2" /> Membre
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  {fields.map((field, index) => (
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
                        <FormField control={form.control} name={`teamMembers.${index}.imageUrl`} render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500">URL Photo</FormLabel><FormControl><Input {...field} className="bg-slate-900 border-slate-800 font-mono text-[9px]" /></FormControl></FormItem>
                        )} />
                      </div>
                    </div>
                  ))}
                  {fields.length === 0 && <div className="py-12 text-center text-slate-600 font-bold uppercase text-[10px] tracking-widest">Aucun membre ajouté</div>}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Les autres onglets restent similaires mais avec des styles épurés */}
            <TabsContent value="video" className="space-y-4 animate-in fade-in duration-500">
                <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6">
                    <CardHeader className="p-0 mb-6">
                        <CardTitle className="text-lg font-bold">Hébergement Vidéo</CardTitle>
                    </CardHeader>
                    <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="allowBunny" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <PlaySquare className="h-5 w-5 text-primary" />
                                        <span className="text-sm font-bold text-white">Bunny</span>
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
                                <FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl font-mono" /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                </Card>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4 animate-in fade-in duration-500">
                <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex items-start gap-4">
                    <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
                    <div>
                        <h3 className="text-amber-500 font-bold uppercase text-sm tracking-tight">Outils de Maintenance</h3>
                        <p className="text-amber-500/70 text-[10px] mt-1 leading-relaxed">
                            Actions massives pour régulariser votre base de données. Utilisez avec précaution.
                        </p>
                    </div>
                </div>
                <div className="grid gap-4">
                    <Button type="button" onClick={() => repairAllCertificatesAction(currentUser!.uid)} className="h-14 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl">Réparer les Certificats</Button>
                    <Button type="button" onClick={() => syncUsersWithAuthAction(currentUser!.uid)} className="h-14 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl">Importer membres Auth</Button>
                </div>
            </TabsContent>
          </Tabs>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 z-40 safe-area-pb md:relative md:bg-transparent md:border-none md:p-0">
            <Button type="submit" disabled={isSaving} className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all">
                {isSaving ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-5 w-5" />}
                Enregistrer tout
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
