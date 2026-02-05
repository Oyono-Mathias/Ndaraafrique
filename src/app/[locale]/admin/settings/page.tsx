
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
import { 
  Settings as SettingsIcon, 
  Globe, 
  ShieldCheck, 
  Loader2, 
  Save,
  Percent
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
    defaultValues: {
      siteName: 'Ndara Afrique',
      logoUrl: '/logo.png',
      contactEmail: 'contact@ndara-afrique.com',
      commission: 20,
      announcementMessage: '',
      maintenanceMode: false,
      allowInstructorSignup: true,
    }
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
        <p className="text-slate-400">Pilotez l'expérience utilisateur et les règles de gestion.</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="bg-slate-900 border-slate-800 mb-6 h-auto p-1">
              <TabsTrigger value="general" className="py-2 px-6"><Globe className="h-4 w-4 mr-2" />Général</TabsTrigger>
              <TabsTrigger value="platform" className="py-2 px-6"><ShieldCheck className="h-4 w-4 mr-2" />Plateforme</TabsTrigger>
              <TabsTrigger value="business" className="py-2 px-6"><Percent className="h-4 w-4 mr-2" />Commerce</TabsTrigger>
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
                        <FormDescription>Conseil : Ajoutez les traductions Sango et Lingala pour plus d'impact.</FormDescription>
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

            {/* --- ONGLET COMMERCE --- */}
            <TabsContent value="business">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle>Commission & Gains</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField control={form.control} name="commission" render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>Commission Ndara (%)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" {...field} className="pl-10" />
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        </div>
                      </FormControl>
                      <FormDescription>Part prélevée par la plateforme sur chaque vente.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <Button type="submit" disabled={isSaving} size="lg" className="px-10 h-14 rounded-2xl shadow-xl shadow-primary/20">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              Sauvegarder les réglages
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
