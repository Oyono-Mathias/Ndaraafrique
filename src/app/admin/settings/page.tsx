
'use client';

import { useState } from 'react';
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
import { Loader2, Sparkles, Settings, FileText, Image as ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useEffect } from 'react';


const settingsSchema = z.object({
    siteName: z.string().min(3, "Le nom du site est requis."),
    contactEmail: z.string().email("Veuillez entrer un email valide."),
    supportPhone: z.string().optional(),
    logoUrl: z.string().url("URL du logo invalide.").optional().or(z.literal('')),
    loginBackgroundImage: z.string().url("URL de l'image invalide.").optional().or(z.literal('')),
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
            contactEmail: 'support@formaafrique.com',
            supportPhone: '',
            logoUrl: '',
            loginBackgroundImage: '',
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
                contactEmail: currentSettings.general?.contactEmail,
                supportPhone: currentSettings.general?.supportPhone,
                logoUrl: currentSettings.general?.logoUrl,
                loginBackgroundImage: currentSettings.general?.loginBackgroundImage,
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
                    contactEmail: data.contactEmail,
                    supportPhone: data.supportPhone,
                    logoUrl: data.logoUrl,
                    loginBackgroundImage: data.loginBackgroundImage
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
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold dark:text-white">Paramètres Généraux</h1>
                <p className="text-muted-foreground dark:text-slate-400">Gérez la configuration globale de la plateforme.</p>
            </header>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                     <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="dark:text-white">Identité de la Plateforme</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="siteName" render={({ field }) => ( <FormItem><FormLabel>Nom du site</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="logoUrl" render={({ field }) => ( <FormItem><FormLabel>URL du logo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                             <FormField control={form.control} name="loginBackgroundImage" render={({ field }) => ( <FormItem><FormLabel>Image de fond (page de connexion)</FormLabel><FormControl><Input {...field} placeholder="URL de l'image..."/></FormControl><FormMessage /></FormItem> )} />
                        </CardContent>
                    </Card>

                     <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="dark:text-white">Paramètres de la Plateforme</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="announcementMessage" render={({ field }) => ( <FormItem><FormLabel>Bannière d'annonce globale</FormLabel><FormControl><Input {...field} placeholder="Ex: Promotion spéciale ce weekend !"/></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700"><div className="space-y-0.5"><FormLabel>Mode Maintenance</FormLabel><FormDescription>Bloquer l'accès au site pour les utilisateurs non-admins.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                             )} />
                             <FormField control={form.control} name="allowInstructorSignup" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700"><div className="space-y-0.5"><FormLabel>Autoriser les candidatures</FormLabel><FormDescription>Permettre aux nouveaux utilisateurs de postuler pour devenir instructeur.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                             )} />
                        </CardContent>
                    </Card>
                    
                    <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader><CardTitle className="dark:text-white">Textes Légaux</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <FormField control={form.control} name="termsOfService" render={({ field }) => ( <FormItem><FormLabel>Conditions Générales d'Utilisation</FormLabel><FormControl><Textarea {...field} rows={8} placeholder="Collez le contenu des CGU ici..." /></FormControl><FormMessage /></FormItem> )} />
                             <FormField control={form.control} name="privacyPolicy" render={({ field }) => ( <FormItem><FormLabel>Politique de Confidentialité</FormLabel><FormControl><Textarea {...field} rows={8} placeholder="Collez le contenu de la politique de confidentialité ici..."/></FormControl><FormMessage /></FormItem> )} />
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Settings className="mr-2 h-4 w-4" />}
                            Enregistrer les paramètres
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
