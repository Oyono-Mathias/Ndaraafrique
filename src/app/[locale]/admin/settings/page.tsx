'use client';

/**
 * @fileOverview Page de configuration globale de la plateforme Ndara Afrique.
 * Permet à l'admin de piloter le site sans toucher au code.
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
  Award
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
  // Contenu Landing Page
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
  // Contenu About Page
  aboutMainTitle: z.string().optional(),
  aboutHistoryTitle: z.string().optional(),
  aboutHistoryFrench: z.string().optional(),
  aboutHistorySango: z.string().optional(),
  aboutVisionTitle: z.string().optional(),
  aboutVisionFrench: z.string().optional(),
  aboutVisionSango: z.string().optional(),
  teamMembers: z.array(teamMemberSchema).optional(),
  // Légal
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
    defaultValues: {
        teamMembers: []
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
          commission: data.commercial?.platformCommission || 20,
          announcementMessage: data.platform?.announcementMessage || '',
          maintenanceMode: data.platform?.maintenanceMode || false,
          allowInstructorSignup: data.platform?.allowInstructorSignup ?? true,
          // Landing
          landingHeroTitle: data.content?.landingPage?.heroTitle || "Apprenez. Construisez. Prospérez.",
          landingHeroSubtitle: data.content?.landingPage?.heroSubtitle || "",
          landingHeroCta: data.content?.landingPage?.heroCtaText || "Démarrer mon parcours",
          landingStepsTitle: data.content?.landingPage?.howItWorksTitle || "Comment ça marche ?",
          landingStepsSubtitle: data.content?.landingPage?.howItWorksSubtitle || "",
          landingTrustTitle: data.content?.landingPage?.securitySectionTitle || "Votre sérénité, notre priorité",
          landingTrustSubtitle: data.content?.landingPage?.securitySectionSubtitle || "",
          landingFinalCtaTitle: data.content?.landingPage?.finalCtaTitle || "Prêt à transformer votre avenir ?",
          landingFinalCtaSubtitle: data.content?.landingPage?.finalCtaSubtitle || "",
          landingFinalCtaBtn: data.content?.landingPage?.finalCtaButtonText || "Devenir Membre",
          // About
          aboutMainTitle: data.content?.aboutPage?.mainTitle || "Le Manifeste Ndara",
          aboutHistoryTitle: data.content?.aboutPage?.historyTitle || "Notre Histoire",
          aboutHistoryFrench: data.content?.aboutPage?.historyFrench || "",
          aboutHistorySango: data.content?.aboutPage?.historySango || "",
          aboutVisionTitle: data.content?.aboutPage?.visionTitle || "Notre Vision",
          aboutVisionFrench: data.content?.aboutPage?.visionFrench || "",
          aboutVisionSango: data.content?.aboutPage?.visionSango || "",
          teamMembers: data.content?.aboutPage?.teamMembers || [],
          // Légal
          termsOfService: data.legal?.termsOfService || '',
          privacyPolicy: data.legal?.privacyPolicy || '',
        });
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db, form]);

  const handleMigration = async () => {
    if (!currentUser) return;
    setIsMigrating(true);
    const result = await migrateUserProfilesAction(currentUser.uid);
    if (result.success) {
        toast({ title: "Migration réussie !", description: `${result.count} profils régularisés.` });
    } else {
        toast({ variant: 'destructive', title: "Erreur", description: result.error });
    }
    setIsMigrating(false);
  };

  const handleSyncAuth = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
        const result = await syncUsersWithAuthAction(currentUser.uid);
        if (result.success) {
            toast({ title: "Synchronisation terminée", description: `${result.count} membres manquants importés de l'Authentification.` });
        } else {
            toast({ variant: 'destructive', title: "Échec", description: result.error });
        }
    } catch (e) {
        toast({ variant: 'destructive', title: "Erreur technique" });
    } finally {
        setIsSyncing(false);
    }
  };

  const handleRepairCertificates = async () => {
    if (!currentUser) return;
    setIsRepairing(true);
    const result = await repairAllCertificatesAction(currentUser.uid);
    if (result.success) {
        toast({ title: "Réparation terminée", description: `${result.count} dossiers d'inscriptions synchronisés avec succès.` });
    } else {
        toast({ variant: 'destructive', title: "Échec", description: result.error });
    }
    setIsRepairing(false);
  };

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
      toast({ title: "Paramètres mis à jour !" });
    } else {
      toast({ variant: 'destructive', title: "Erreur", description: result.error });
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 pb-24">
      <header>
        <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
          <SettingsIcon className="h-8 w-8 text-primary" />
          Configuration de Ndara
        </h1>
        <p className="text-slate-400 font-medium italic">Pilotez l'expérience utilisateur et les règles de gestion.</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="bg-slate-900 border-slate-800 mb-6 h-auto p-1 overflow-x-auto flex-nowrap gap-1">
              <TabsTrigger value="general" className="py-2.5 px-6 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap"><Globe className="h-3 w-3 mr-2" />Général</TabsTrigger>
              <TabsTrigger value="platform" className="py-2.5 px-6 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap"><ShieldCheck className="h-3 w-3 mr-2" />Plateforme</TabsTrigger>
              <TabsTrigger value="content" className="py-2.5 px-6 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap"><Layout className="h-3 w-3 mr-2" />Textes & SEO</TabsTrigger>
              <TabsTrigger value="team" className="py-2.5 px-6 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap"><UsersIcon className="h-3 w-3 mr-2" />L'Équipe</TabsTrigger>
              <TabsTrigger value="legal" className="py-2.5 px-6 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap"><FileText className="h-3 w-3 mr-2" />Légal</TabsTrigger>
              <TabsTrigger value="maintenance" className="py-2.5 px-6 font-bold uppercase text-[10px] tracking-widest text-amber-500 whitespace-nowrap bg-amber-500/5"><Wrench className="h-3 w-3 mr-2" />Maintenance</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="bg-slate-800/30 border-b border-white/5">
                  <CardTitle className="text-lg font-bold">Identité du Site</CardTitle>
                  <CardDescription>Nom, logo et contacts affichés partout sur Ndara Afrique.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
                  <FormField control={form.control} name="siteName" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Nom de la marque</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="logoUrl" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">URL du Logo (.png)</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="contactEmail" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Email de contact public</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="commission" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Commission Ndara (%)</FormLabel><FormControl><Input type="number" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="platform">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="bg-slate-800/30 border-b border-white/5">
                  <CardTitle className="text-lg font-bold">Règles & État</CardTitle>
                  <CardDescription>Bannière d'annonce, maintenance et inscriptions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <FormField control={form.control} name="announcementMessage" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Message d'annonce global (Haut de page)</FormLabel><FormControl><Textarea {...field} className="bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-2xl">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold text-white">Mode Maintenance</FormLabel><FormDescription className="text-xs">Bloque l'accès aux non-admins.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="allowInstructorSignup" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-2xl">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold text-white">Recrutement Formateurs</FormLabel><FormDescription className="text-xs">Affiche le lien "Devenir Instructeur".</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="bg-slate-800/30 border-b border-white/5">
                  <CardTitle className="text-lg font-bold">Textes Page d'Accueil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <FormField control={form.control} name="landingHeroTitle" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Titre Hero</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="landingHeroSubtitle" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Sous-titre Hero</FormLabel><FormControl><Textarea {...field} className="bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl></FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-800/30 border-b border-white/5 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">Équipe Ndara</CardTitle>
                    <CardDescription>Gérez les membres affichés sur la page "À Propos".</CardDescription>
                  </div>
                  <Button type="button" size="sm" onClick={() => append({ name: '', role: '', imageUrl: '', bio: '' })} className="rounded-xl">
                    <Plus className="h-4 w-4 mr-2" /> Ajouter
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 relative group">
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="grid md:grid-cols-3 gap-4">
                        <FormField control={form.control} name={`teamMembers.${index}.name`} render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500">Nom</FormLabel><FormControl><Input {...field} className="bg-slate-900" /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name={`teamMembers.${index}.role`} render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500">Rôle</FormLabel><FormControl><Input {...field} className="bg-slate-900" /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name={`teamMembers.${index}.imageUrl`} render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500">URL Image</FormLabel><FormControl><Input {...field} className="bg-slate-900" /></FormControl></FormItem>
                        )} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="legal">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="bg-slate-800/30 border-b border-white/5">
                  <CardTitle className="text-lg font-bold">Documents Légaux</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <FormField control={form.control} name="termsOfService" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Conditions Générales (HTML supporté)</FormLabel><FormControl><Textarea {...field} rows={10} className="bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="privacyPolicy" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Confidentialité (HTML supporté)</FormLabel><FormControl><Textarea {...field} rows={10} className="bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl></FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance">
                <div className="space-y-6">
                    <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-start gap-4">
                        <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
                        <div>
                            <h3 className="text-amber-500 font-bold uppercase text-sm tracking-tight">Espace de Maintenance Critique</h3>
                            <p className="text-amber-500/70 text-xs mt-1 leading-relaxed">
                                Utilisez ces outils si vous constatez un décalage entre vos membres inscrits et la liste affichée dans le Panel Admin.
                            </p>
                        </div>
                    </div>

                    <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-800/30 border-b border-white/5">
                            <CardTitle className="text-white flex items-center gap-2">
                                <Award className="h-5 w-5 text-primary" />
                                Synchronisation des Certificats
                            </CardTitle>
                            <CardDescription>Scanner les progressions à 100% et forcer la mise à jour des certificats pour tous les élèves.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex-1 space-y-1">
                                    <h3 className="text-white font-bold text-sm">Action : Réparation massive des diplômes</h3>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        Si des étudiants disent avoir fini un cours mais ne voient pas leur certificat, ce bouton synchronise tout globalement.
                                    </p>
                                </div>
                                <Button 
                                    type="button" 
                                    onClick={handleRepairCertificates} 
                                    disabled={isRepairing}
                                    className="h-14 px-10 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 shrink-0 rounded-xl"
                                >
                                    {isRepairing ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <RefreshCw className="h-4 w-4 mr-2" />}
                                    Réparer tous les certificats
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-800/30 border-b border-white/5">
                            <CardTitle className="text-white flex items-center gap-2">
                                <RefreshCw className="h-5 w-5 text-primary" />
                                Synchronisation des Comptes
                            </CardTitle>
                            <CardDescription>Scanner les comptes réels de l'Authentification et créer les profils Firestore manquants.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex-1 space-y-1">
                                    <h3 className="text-white font-bold text-sm">Action : Importer les membres manquants</h3>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        Si vous avez 10 membres dans la console Firebase mais qu'ils n'apparaissent pas ici, cet outil va générer les documents Firestore nécessaires.
                                    </p>
                                </div>
                                <Button 
                                    type="button" 
                                    onClick={handleSyncAuth} 
                                    disabled={isSyncing}
                                    className="h-14 px-10 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 shrink-0 rounded-xl"
                                >
                                    {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <RefreshCw className="h-4 w-4 mr-2" />}
                                    Lancer la synchronisation
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-800/30 border-b border-white/5">
                            <CardTitle className="text-white flex items-center gap-2">
                                <Wrench className="h-5 w-5 text-amber-500" />
                                Réparation des Profils
                            </CardTitle>
                            <CardDescription>Initialise les données techniques manquantes sur tous les membres existants.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex-1 space-y-1">
                                    <h3 className="text-white font-bold text-sm">Action : Régularisation massive</h3>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        Vérifie chaque profil et ajoute les champs par défaut (rôle, statut, préférences) s'ils sont absents.
                                    </p>
                                </div>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={handleMigration} 
                                    disabled={isMigrating}
                                    className="h-14 px-10 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 font-black uppercase text-[10px] tracking-widest rounded-xl"
                                >
                                    {isMigrating ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Sparkles className="h-4 w-4 mr-2" />}
                                    Réparer les profils
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4 border-t border-slate-800 sticky bottom-6 z-30">
            <Button type="submit" disabled={isSaving} className="px-12 h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all">
              {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
