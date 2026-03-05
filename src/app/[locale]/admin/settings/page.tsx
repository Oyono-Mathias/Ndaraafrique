'use client';

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
  Youtube,
  PlaySquare,
  Users as UsersIcon,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
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
  aboutMainTitle: z.string().optional(),
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
          aboutMainTitle: data.content?.aboutPage?.mainTitle || "",
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
          },
          aboutPage: {
            mainTitle: values.aboutMainTitle || '',
            mainSubtitle: '',
            teamMembers: (values.teamMembers || []).map(m => ({
              name: m.name,
              role: m.role,
              imageUrl: m.imageUrl,
              bio: m.bio || ''
            })),
            historyTitle: '', historyFrench: '', historySango: '', visionTitle: '', visionFrench: '', visionSango: '', ctaTitle: '', ctaSubtitle: ''
          }
        },
        legal: {
          termsOfService: values.termsOfService || '',
          privacyPolicy: values.privacyPolicy || '',
        }
      }
    });

    if (result.success) {
      toast({ title: "Paramètres mis à jour !" });
    } else {
      toast({ variant: 'destructive', title: "Erreur", description: result.error });
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

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
              <TabsTrigger value="team" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">L'Équipe</TabsTrigger>
              <TabsTrigger value="legal" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0">Légal</TabsTrigger>
              <TabsTrigger value="maintenance" className="py-2 px-4 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap shrink-0 text-amber-500">Outils</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 animate-in fade-in duration-500">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden">
                <CardHeader className="p-6 border-b border-white/5">
                  <CardTitle className="text-lg font-bold">Identité & Commerce</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6 p-6">
                  <FormField control={form.control} name="siteName" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nom du site</FormLabel>
                        <FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="commission" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Commission (%)</FormLabel>
                        <FormControl><Input type="number" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="video" className="space-y-4 animate-in fade-in duration-500">
                <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6">
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
                                <FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl font-mono" /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                </Card>
            </TabsContent>

            <TabsContent value="team" className="space-y-4 animate-in fade-in duration-500">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden">
                <CardHeader className="p-6 border-b border-white/5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle className="text-lg font-bold">L'Équipe Ndara</CardTitle>
                    <Button type="button" size="sm" onClick={() => append({ name: '', role: '', imageUrl: '', bio: '' })} className="rounded-xl h-10 w-full sm:w-auto px-6 font-black uppercase text-[10px] tracking-widest">
                        <Plus className="h-4 w-4 mr-2" /> Ajouter un membre
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
                          <FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500">Photo URL</FormLabel><FormControl><Input {...field} className="bg-slate-900 border-slate-800 font-mono text-[9px]" /></FormControl></FormItem>
                        )} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4 animate-in fade-in duration-500">
                <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex items-start gap-4 mb-4">
                    <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
                    <p className="text-amber-500/70 text-[10px] font-bold uppercase leading-relaxed">
                        Outils de régularisation massive. À utiliser avec précaution.
                    </p>
                </div>
                <div className="grid gap-3">
                    <Button type="button" onClick={() => repairAllCertificatesAction(currentUser!.uid)} className="h-14 bg-slate-900 border border-slate-800 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-800 transition-colors">Réparer les Certificats</Button>
                    <Button type="button" onClick={() => syncUsersWithAuthAction(currentUser!.uid)} className="h-14 bg-slate-900 border border-slate-800 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-800 transition-colors">Importer membres Auth</Button>
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
