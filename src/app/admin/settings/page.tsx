
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, FileText, Percent, Building } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const settingsSchema = z.object({
    siteName: z.string().min(3, "Le nom du site est requis."),
    logoUrl: z.string().url("URL du logo invalide.").optional().or(z.literal('')),
    loginBackgroundImage: z.string().url("URL de l'image invalide.").optional().or(z.literal('')),
    contactEmail: z.string().email("Veuillez entrer un email valide."),
    supportPhone: z.string().optional(),
    platformCommission: z.coerce.number().min(0).max(100).optional(),
    featuredCourseId: z.string().optional(),
    announcementMessage: z.string().optional(),
    maintenanceMode: z.boolean().default(false),
    allowInstructorSignup: z.boolean().default(true),
    termsOfService: z.string().optional(),
    privacyPolicy: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
    const { toast } = useToast();
    const db = getFirestore();
    const [isSaving, setIsSaving] = useState(false);

    const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'global'), [db]);
    const { data: currentSettings, isLoading } = useDoc(settingsRef);

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            siteName: 'FormaAfrique',
            logoUrl: '',
            loginBackgroundImage: '',
            contactEmail: 'support@formaafrique.com',
            supportPhone: '',
            platformCommission: 30,
            featuredCourseId: '',
            announcementMessage: '',
            maintenanceMode: false,
            allowInstructorSignup: true,
            termsOfService: '',
            privacyPolicy: '',
        },
    });

    useEffect(() => {
        if (currentSettings) {
            const settingsData = {
                siteName: currentSettings.general?.siteName,
                logoUrl: currentSettings.general?.logoUrl,
                loginBackgroundImage: currentSettings.general?.loginBackgroundImage,
                contactEmail: currentSettings.general?.contactEmail,
                supportPhone: currentSettings.general?.supportPhone,
                platformCommission: currentSettings.commercial?.platformCommission,
                featuredCourseId: currentSettings.commercial?.featuredCourseId,
                announcementMessage: currentSettings.platform?.announcementMessage,
                maintenanceMode: currentSettings.platform?.maintenanceMode,
                allowInstructorSignup: currentSettings.platform?.allowInstructorSignup,
                termsOfService: currentSettings.legal?.termsOfService,
                privacyPolicy: currentSettings.legal?.privacyPolicy,
            }
            form.reset(settingsData);
        }
    }, [currentSettings, form]);

    const onSubmit = async (data: SettingsFormValues) => {
        setIsSaving(true);
        try {
            const settingsPayload = {
                general: {
                    siteName: data.siteName,
                    logoUrl: data.logoUrl,
                    loginBackgroundImage: data.loginBackgroundImage,
                    contactEmail: data.contactEmail,
                    supportPhone: data.supportPhone,
                },
                commercial: {
                    platformCommission: data.platformCommission,
                    featuredCourseId: data.featuredCourseId,
                },
                platform: {
                    announcementMessage: data.announcementMessage,
                    maintenanceMode: data.maintenanceMode,
                    allowInstructorSignup: data.allowInstructorSignup,
                },
                legal: {
                    termsOfService: data.termsOfService,
                    privacyPolicy: data.privacyPolicy
                }
            };
            await setDoc(settingsRef, settingsPayload, { merge: true });
            toast({ title: "Paramètres enregistrés !", description: "Les modifications ont été sauvegardées." });
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer les paramètres." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold dark:text-white">Paramètres</h1>
                        <p className="text-muted-foreground dark:text-slate-400">Gérez les configurations globales de la plateforme.</p>
                    </div>
                     <Button type="submit" disabled={isSaving} className="h-12 w-32 text-lg tv:h-20 tv:w-48 tv:text-2xl">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin tv:h-8 tv:w-8" /> : null}
                        Enregistrer
                    </Button>
                </header>
                
                <Tabs defaultValue="platform" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 dark:bg-slate-800 dark:border-slate-700">
                        <TabsTrigger value="general" className="tv:text-xl tv:py-4"><Settings className="w-4 h-4 mr-2 tv:w-6 tv:h-6"/>Général</TabsTrigger>
                        <TabsTrigger value="commercial" className="tv:text-xl tv:py-4"><Percent className="w-4 h-4 mr-2 tv:w-6 tv:h-6"/>Commercial</TabsTrigger>
                        <TabsTrigger value="platform" className="tv:text-xl tv:py-4"><Building className="w-4 h-4 mr-2 tv:w-6 tv:h-6"/>Plateforme</TabsTrigger>
                        <TabsTrigger value="legal" className="tv:text-xl tv:py-4"><FileText className="w-4 h-4 mr-2 tv:w-6 tvh-6-"/>Légal</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="general" className="mt-6">
                        <Card className="dark:bg-slate-800 dark:border-slate-700">
                           <CardHeader>
                               <CardTitle className="dark:text-white tv:text-2xl">Identité de la Plateforme</CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-4">
                                <FormField control={form.control} name="siteName" render={({ field }) => ( <FormItem><FormLabel className="tv:text-lg">Nom du site</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600 tv:h-14 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary" /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="logoUrl" render={({ field }) => ( <FormItem><FormLabel className="tv:text-lg">URL du logo</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600 tv:h-14 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary" /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="loginBackgroundImage" render={({ field }) => ( <FormItem><FormLabel className="tv:text-lg">Image de fond (page de connexion)</FormLabel><FormControl><Input {...field} placeholder="URL de l'image..." className="dark:bg-slate-700 dark:border-slate-600 tv:h-14 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary"/></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="contactEmail" render={({ field }) => ( <FormItem><FormLabel className="tv:text-lg">Email de contact</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600 tv:h-14 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary"/></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="supportPhone" render={({ field }) => ( <FormItem><FormLabel className="tv:text-lg">Téléphone du support (optionnel)</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600 tv:h-14 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary"/></FormControl><FormMessage /></FormItem> )} />
                           </CardContent>
                       </Card>
                    </TabsContent>

                    <TabsContent value="commercial" className="mt-6">
                       <Card className="dark:bg-slate-800 dark:border-slate-700">
                           <CardHeader>
                               <CardTitle className="dark:text-white tv:text-2xl">Paramètres Commerciaux</CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-4">
                                <FormField control={form.control} name="platformCommission" render={({ field }) => ( 
                                    <FormItem>
                                        <FormLabel className="tv:text-lg">Commission de la plateforme (%)</FormLabel>
                                        <FormControl><Input type="number" {...field} className="dark:bg-slate-700 dark:border-slate-600 tv:h-14 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary" /></FormControl>
                                        <FormDescription className="tv:text-base">Le pourcentage que la plateforme prend sur chaque vente.</FormDescription>
                                        <FormMessage />
                                    </FormItem> 
                                )} />
                                <FormField control={form.control} name="featuredCourseId" render={({ field }) => ( 
                                    <FormItem>
                                        <FormLabel className="tv:text-lg">ID du cours mis en avant</FormLabel>
                                        <FormControl><Input {...field} placeholder="ID du cours..." className="dark:bg-slate-700 dark:border-slate-600 tv:h-14 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary" /></FormControl>
                                        <FormDescription className="tv:text-base">Le cours qui apparaîtra en premier sur la page d'accueil.</FormDescription>
                                        <FormMessage />
                                    </FormItem> 
                                )} />
                           </CardContent>
                       </Card>
                    </TabsContent>
                    
                    <TabsContent value="platform" className="mt-6">
                        <Card className="dark:bg-slate-800 dark:border-slate-700">
                           <CardHeader>
                               <CardTitle className="dark:text-white tv:text-2xl">Configuration de la Plateforme</CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-4">
                                <FormField control={form.control} name="announcementMessage" render={({ field }) => ( <FormItem><FormLabel className="tv:text-lg">Bannière d'annonce globale</FormLabel><FormControl><Input {...field} placeholder="Ex: Promotion spéciale ce weekend !" className="dark:bg-slate-700 dark:border-slate-600 tv:h-14 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary"/></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                                   <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700 tv:p-6"><div className="space-y-0.5"><FormLabel className="tv:text-lg">Mode Maintenance</FormLabel><FormDescription className="tv:text-base">Bloquer l'accès au site pour les utilisateurs non-admins.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="allowInstructorSignup" render={({ field }) => (
                                   <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700 tv:p-6"><div className="space-y-0.5"><FormLabel className="tv:text-lg">Autoriser les candidatures</FormLabel><FormDescription className="tv:text-base">Permettre aux nouveaux utilisateurs de postuler pour devenir instructeur.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                                )} />
                           </CardContent>
                       </Card>
                    </TabsContent>

                    <TabsContent value="legal" className="mt-6">
                       <Card className="dark:bg-slate-800 dark:border-slate-700">
                           <CardHeader><CardTitle className="dark:text-white tv:text-2xl">Textes Légaux</CardTitle></CardHeader>
                           <CardContent className="space-y-4">
                                <FormField control={form.control} name="termsOfService" render={({ field }) => ( <FormItem><FormLabel className="tv:text-lg">Conditions Générales d'Utilisation</FormLabel><FormControl><Textarea {...field} rows={8} placeholder="Collez le contenu des CGU ici..." className="dark:bg-slate-700 dark:border-slate-600 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary" /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="privacyPolicy" render={({ field }) => ( <FormItem><FormLabel className="tv:text-lg">Politique de Confidentialité</FormLabel><FormControl><Textarea {...field} rows={8} placeholder="Collez le contenu de la politique de confidentialité ici..." className="dark:bg-slate-700 dark:border-slate-600 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary"/></FormControl><FormMessage /></FormItem> )} />
                           </CardContent>
                       </Card>
                    </TabsContent>
                </Tabs>
            </form>
        </Form>
    );
}
