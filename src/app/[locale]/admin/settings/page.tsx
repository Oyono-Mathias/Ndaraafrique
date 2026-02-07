'use client';

/**
 * @fileOverview Page de configuration globale de la plateforme Ndara Afrique.
 * Permet à l'admin de piloter le site sans toucher au code.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon, 
  Globe, 
  ShieldCheck, 
  Loader2, 
  Save,
  Percent,
  FileText,
  Layout,
  Info,
  Sparkles
} from 'lucide-react';
import type { Settings } from '@/lib/types';

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

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
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
          landingHeroTitle: data.content?.landingPage?.heroTitle || '',
          landingHeroSubtitle: data.content?.landingPage?.heroSubtitle || '',
          landingHeroCta: data.content?.landingPage?.heroCtaText || '',
          landingStepsTitle: data.content?.landingPage?.howItWorksTitle || '',
          landingStepsSubtitle: data.content?.landingPage?.howItWorksSubtitle || '',
          landingTrustTitle: data.content?.landingPage?.securitySectionTitle || '',
          landingTrustSubtitle: data.content?.landingPage?.securitySectionSubtitle || '',
          landingFinalCtaTitle: data.content?.landingPage?.finalCtaTitle || '',
          landingFinalCtaSubtitle: data.content?.landingPage?.finalCtaSubtitle || '',
          landingFinalCtaBtn: data.content?.landingPage?.finalCtaButtonText || '',
          // About
          aboutMainTitle: data.content?.aboutPage?.mainTitle || '',
          aboutHistoryTitle: data.content?.aboutPage?.historyTitle || '',
          aboutHistoryFrench: data.content?.aboutPage?.historyFrench || '',
          aboutHistorySango: data.content?.aboutPage?.historySango || '',
          aboutVisionTitle: data.content?.aboutPage?.visionTitle || '',
          aboutVisionFrench: data.content?.aboutPage?.visionFrench || '',
          aboutVisionSango: data.content?.aboutPage?.visionSango || '',
          // Légal
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
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          Configuration de Ndara
        </h1>
        <p className="text-slate-400">Pilotez l'expérience utilisateur et les règles de gestion sans coder.</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="bg-slate-900 border-slate-800 mb-6 h-auto p-1 overflow-x-auto flex-wrap">
              <TabsTrigger value="general" className="py-2 px-6"><Globe className="h-4 w-4 mr-2" />Général</TabsTrigger>
              <TabsTrigger value="platform" className="py-2 px-6"><ShieldCheck className="h-4 w-4 mr-2" />Plateforme</TabsTrigger>
              <TabsTrigger value="content" className="py-2 px-6"><Layout className="h-4 w-4 mr-2" />Accueil & À propos</TabsTrigger>
              <TabsTrigger value="legal" className="py-2 px-6"><FileText className="h-4 w-4 mr-2" />Légal</TabsTrigger>
            </TabsList>

            {/* --- ONGLET GÉNÉRAL --- */}
            <TabsContent value="general">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle>Identité du Site</CardTitle>
                  <CardDescription>Nom, logo et contacts affichés partout sur Ndara Afrique.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="siteName" render={({ field }) => (
                    <FormItem><FormLabel>Nom de la marque</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="logoUrl" render={({ field }) => (
                    <FormItem><FormLabel>URL du Logo (.png)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="contactEmail" render={({ field }) => (
                    <FormItem><FormLabel>Email de contact public</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="commission" render={({ field }) => (
                    <FormItem><FormLabel>Commission Ndara (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- ONGLET PLATEFORME --- */}
            <TabsContent value="platform">
              <div className="grid gap-6">
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle>Communication & Maintenance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField control={form.control} name="announcementMessage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message d'annonce (Bannière)</FormLabel>
                        <FormControl><Textarea rows={3} placeholder="Sera affiché en haut de toutes les pages..." {...field} /></FormControl>
                        <FormDescription>Format recommandé : Message FR - Sango: ... - Lingala: ...</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 border border-slate-800 rounded-xl bg-red-500/5">
                          <div className="space-y-0.5">
                            <FormLabel className="text-red-400">Mode Maintenance</FormLabel>
                            <FormDescription>Bloque l'accès sauf pour les admins.</FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="allowInstructorSignup" render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 border border-slate-800 rounded-xl bg-blue-500/5">
                          <div className="space-y-0.5">
                            <FormLabel>Candidatures Formateurs</FormLabel>
                            <FormDescription>Autoriser les membres à postuler.</FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* --- ONGLET CONTENU --- */}
            <TabsContent value="content">
              <div className="space-y-8">
                {/* CONFIGURATION LANDING PAGE */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/>Page d'Accueil</CardTitle>
                    <CardDescription>Gérez les textes du Hero et des sections principales.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="landingHeroTitle" render={({ field }) => (
                        <FormItem><FormLabel>Titre Hero</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="landingHeroCta" render={({ field }) => (
                        <FormItem><FormLabel>Texte Bouton Hero</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="landingHeroSubtitle" render={({ field }) => (
                      <FormItem><FormLabel>Sous-titre Hero</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
                    )} />
                    
                    <Separator className="bg-slate-800" />
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="landingStepsTitle" render={({ field }) => (
                        <FormItem><FormLabel>Titre "Comment ça marche"</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="landingStepsSubtitle" render={({ field }) => (
                        <FormItem><FormLabel>Sous-titre "Comment ça marche"</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                    </div>

                    <Separator className="bg-slate-800" />

                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="landingFinalCtaTitle" render={({ field }) => (
                        <FormItem><FormLabel>Titre CTA Final</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="landingFinalCtaBtn" render={({ field }) => (
                        <FormItem><FormLabel>Bouton CTA Final</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>

                {/* CONFIGURATION ABOUT PAGE */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>Page "À Propos"</CardTitle>
                    <CardDescription>Gérez le manifeste et l'histoire de la plateforme.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <FormField control={form.control} name="aboutMainTitle" render={({ field }) => (
                      <FormItem><FormLabel>Titre principal</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    
                    <div className="pt-4 border-t border-slate-800 space-y-4">
                      <h3 className="font-bold text-primary flex items-center gap-2"><Info className="h-4 w-4"/> Notre Histoire</h3>
                      <FormField control={form.control} name="aboutHistoryTitle" render={({ field }) => (
                        <FormItem><FormLabel>Titre Section</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="aboutHistoryFrench" render={({ field }) => (
                        <FormItem><FormLabel>Texte (Français)</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="aboutHistorySango" render={({ field }) => (
                        <FormItem><FormLabel>Texte (Sango)</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>
                      )} />
                    </div>

                    <div className="pt-4 border-t border-slate-800 space-y-4">
                      <h3 className="font-bold text-primary flex items-center gap-2"><Globe className="h-4 w-4"/> Notre Vision</h3>
                      <FormField control={form.control} name="aboutVisionTitle" render={({ field }) => (
                        <FormItem><FormLabel>Titre Section</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="aboutVisionFrench" render={({ field }) => (
                        <FormItem><FormLabel>Texte (Français)</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="aboutVisionSango" render={({ field }) => (
                        <FormItem><FormLabel>Texte (Sango)</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* --- ONGLET LÉGAL --- */}
            <TabsContent value="legal">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle>Documents Légaux</CardTitle>
                  <CardDescription>Éditez les contrats de confiance avec vos utilisateurs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField control={form.control} name="termsOfService" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conditions Générales d'Utilisation (CGU)</FormLabel>
                      <FormControl><Textarea rows={15} {...field} className="font-mono text-xs" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="privacyPolicy" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Politique de Confidentialité</FormLabel>
                      <FormControl><Textarea rows={15} {...field} className="font-mono text-xs" /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <Button type="submit" disabled={isSaving} size="lg" className="px-10 h-14 rounded-2xl shadow-xl shadow-primary/20">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
