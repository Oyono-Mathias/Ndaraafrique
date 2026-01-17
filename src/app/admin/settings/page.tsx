
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/provider';
import { useRole } from '@/context/RoleContext';
import Image from 'next/image';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, FileText, Percent, Building, Image as ImageIcon, Wallet, DollarSign, Text } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { Skeleton } from '@/components/ui/skeleton';
import { updateGlobalSettings } from '@/actions/settingsActions';

const settingsSchema = z.object({
    siteName: z.string().min(3, "Le nom du site est requis."),
    logoUrl: z.string().url("URL du logo invalide.").optional().or(z.literal('')),
    contactEmail: z.string().email("Veuillez entrer un email valide."),
    maintenanceMode: z.boolean().default(false),
    loginBackgroundImage: z.string().url("URL de l'image invalide.").optional().or(z.literal('')),
    supportPhone: z.string().optional(),
    platformCommission: z.coerce.number().min(0).max(100, "La commission ne peut excéder 100%.").optional(),
    currency: z.string().optional(),
    minPayoutThreshold: z.coerce.number().min(0, "Le seuil doit être positif.").optional(),
    featuredCourseId: z.string().optional(),
    announcementMessage: z.string().optional(),
    allowInstructorSignup: z.boolean().default(true),
    autoApproveCourses: z.boolean().default(false),
    enableInternalMessaging: z.boolean().default(true),
    termsOfService: z.string().optional(),
    privacyPolicy: z.string().optional(),
    // About Page Content
    aboutTitle: z.string().optional(),
    aboutSubtitle: z.string().optional(),
    historyTitle: z.string().optional(),
    historyFrench: z.string().optional(),
    historySango: z.string().optional(),
    visionTitle: z.string().optional(),
    visionFrench: z.string().optional(),
    visionSango: z.string().optional(),
    ctaTitle: z.string().optional(),
    ctaSubtitle: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
    const t = useTranslations();
    const { toast } = useToast();
    const { currentUser } = useRole();
    const db = getFirestore();
    const storage = getStorage();
    const [isSaving, setIsSaving] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
    const [imagePreview, setLogoPreview] = useState<string | null>(null);

    const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'global'), [db]);
    const { data: currentSettings, isLoading } = useDoc(settingsRef);

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            siteName: 'Ndara Afrique',
            logoUrl: '',
            contactEmail: 'support@ndara-afrique.com',
            maintenanceMode: false,
            loginBackgroundImage: '',
            supportPhone: '',
            platformCommission: 30,
            currency: 'XOF',
            minPayoutThreshold: 5000,
            featuredCourseId: '',
            announcementMessage: '',
            allowInstructorSignup: true,
            autoApproveCourses: false,
            enableInternalMessaging: true,
            termsOfService: '',
            privacyPolicy: '',
            aboutTitle: '',
            aboutSubtitle: '',
            historyTitle: '',
            historyFrench: '',
            historySango: '',
            visionTitle: '',
            visionFrench: '',
            visionSango: '',
            ctaTitle: '',
            ctaSubtitle: '',
        },
    });

    useEffect(() => {
        if (currentSettings) {
            const settingsData = {
                siteName: currentSettings.general?.siteName || '',
                logoUrl: currentSettings.general?.logoUrl || '',
                contactEmail: currentSettings.general?.contactEmail || '',
                maintenanceMode: currentSettings.platform?.maintenanceMode || false,
                loginBackgroundImage: currentSettings.general?.loginBackgroundImage || '',
                supportPhone: currentSettings.general?.supportPhone || '',
                platformCommission: currentSettings.commercial?.platformCommission,
                currency: currentSettings.commercial?.currency || 'XOF',
                minPayoutThreshold: currentSettings.commercial?.minPayoutThreshold,
                featuredCourseId: currentSettings.commercial?.featuredCourseId || '',
                announcementMessage: currentSettings.platform?.announcementMessage || '',
                allowInstructorSignup: currentSettings.platform?.allowInstructorSignup ?? true,
                autoApproveCourses: currentSettings.platform?.autoApproveCourses ?? false,
                enableInternalMessaging: currentSettings.platform?.enableInternalMessaging ?? true,
                termsOfService: currentSettings.legal?.termsOfService || '',
                privacyPolicy: currentSettings.legal?.privacyPolicy || '',
                aboutTitle: currentSettings.content?.aboutPage?.mainTitle || '',
                aboutSubtitle: currentSettings.content?.aboutPage?.mainSubtitle || '',
                historyTitle: currentSettings.content?.aboutPage?.historyTitle || '',
                historyFrench: currentSettings.content?.aboutPage?.historyFrench || '',
                historySango: currentSettings.content?.aboutPage?.historySango || '',
                visionTitle: currentSettings.content?.aboutPage?.visionTitle || '',
                visionFrench: currentSettings.content?.aboutPage?.visionFrench || '',
                visionSango: currentSettings.content?.aboutPage?.visionSango || '',
                ctaTitle: currentSettings.content?.aboutPage?.ctaTitle || '',
                ctaSubtitle: currentSettings.content?.aboutPage?.ctaSubtitle || '',
            };
            form.reset(settingsData);
            if (settingsData.logoUrl) {
                setLogoPreview(settingsData.logoUrl);
            }
        }
    }, [currentSettings, form]);
    
    const handleLogoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageToCrop(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleCropComplete = (croppedFile: File) => {
        setCroppedImageFile(croppedFile);
        setLogoPreview(URL.createObjectURL(croppedFile));
        setImageToCrop(null);
    };

    const onSubmit = async (data: SettingsFormValues) => {
        if (!currentUser) return;
        setIsSaving(true);
        let finalLogoUrl = form.getValues('logoUrl') || '';

        try {
            if (croppedImageFile) {
                const filePath = `logos/site_logo_${Date.now()}.webp`;
                const storageRef = ref(storage, filePath);
                const uploadResult = await uploadBytes(storageRef, croppedImageFile);
                finalLogoUrl = await getDownloadURL(uploadResult.ref);
            }

            const settingsPayload = {
                general: {
                    siteName: data.siteName,
                    logoUrl: finalLogoUrl,
                    loginBackgroundImage: data.loginBackgroundImage,
                    contactEmail: data.contactEmail,
                    supportPhone: data.supportPhone,
                },
                commercial: {
                    platformCommission: data.platformCommission,
                    currency: data.currency,
                    minPayoutThreshold: data.minPayoutThreshold,
                    featuredCourseId: data.featuredCourseId,
                },
                platform: {
                    announcementMessage: data.announcementMessage,
                    maintenanceMode: data.maintenanceMode,
                    allowInstructorSignup: data.allowInstructorSignup,
                    autoApproveCourses: data.autoApproveCourses,
                    enableInternalMessaging: data.enableInternalMessaging,
                },
                legal: {
                    termsOfService: data.termsOfService,
                    privacyPolicy: data.privacyPolicy
                },
                content: {
                    aboutPage: {
                        mainTitle: data.aboutTitle,
                        mainSubtitle: data.aboutSubtitle,
                        historyTitle: data.historyTitle,
                        historyFrench: data.historyFrench,
                        historySango: data.historySango,
                        visionTitle: data.visionTitle,
                        visionFrench: data.visionFrench,
                        visionSango: data.visionSango,
                        ctaTitle: data.ctaTitle,
                        ctaSubtitle: data.ctaSubtitle,
                    }
                }
            };
            
            const result = await updateGlobalSettings({
                settings: settingsPayload,
                adminId: currentUser.uid
            });

            if (result.success) {
                 toast({ title: "Paramètres enregistrés", description: "Les paramètres globaux du site ont été mis à jour." });
            } else {
                throw new Error(result.error);
            }
           
        } catch (error: any) {
            console.error("Failed to save settings:", error);
            toast({ variant: "destructive", title: "Erreur", description: error.message || "Impossible de sauvegarder les paramètres." });
        } finally {
            setIsSaving(false);
        }
    };
    
     if (isLoading) {
        return (
            <div className="space-y-6">
                <header className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-9 w-64 dark:bg-slate-700" />
                        <Skeleton className="h-4 w-96 mt-2 dark:bg-slate-700" />
                    </div>
                     <Skeleton className="h-12 w-32 dark:bg-slate-700" />
                </header>
                 <Skeleton className="h-12 w-full dark:bg-slate-700" />
                 <Skeleton className="h-96 w-full dark:bg-slate-700" />
            </div>
        );
    }

    return (
        <>
            <ImageCropper
                image={imageToCrop}
                onCropComplete={handleCropComplete}
                onClose={() => setImageToCrop(null)}
            />
            <div className="space-y-8">
                <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold dark:text-white">Paramètres du Site</h1>
                        <p className="text-muted-foreground dark:text-slate-400">Configurez les aspects globaux de la plateforme.</p>
                    </div>
                     <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="w-full sm:w-auto h-12 text-base md:text-sm">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Sauvegarder
                    </Button>
                </header>
                
                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 dark:bg-slate-800 dark:border-slate-700">
                        <TabsTrigger value="general"><Settings className="w-4 h-4 mr-2"/>Général</TabsTrigger>
                        <TabsTrigger value="commercial"><Percent className="w-4 h-4 mr-2"/>Commercial</TabsTrigger>
                        <TabsTrigger value="platform"><Building className="w-4 h-4 mr-2"/>Plateforme</TabsTrigger>
                        <TabsTrigger value="content"><Text className="w-4 h-4 mr-2"/>Contenu</TabsTrigger>
                        <TabsTrigger value="legal"><FileText className="w-4 h-4 mr-2"/>Légal</TabsTrigger>
                    </TabsList>
                    
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <TabsContent value="general" className="mt-6">
                                <Card className="dark:bg-slate-800 dark:border-slate-700">
                                <CardHeader>
                                    <CardTitle className="dark:text-white">Identité de la Plateforme</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                        <FormField control={form.control} name="siteName" render={({ field }) => ( <FormItem><FormLabel>Nom du site</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary" /></FormControl><FormMessage /></FormItem> )} />
                                        
                                        <FormItem>
                                            <FormLabel>Logo</FormLabel>
                                            <div className="flex items-start gap-4">
                                                <label htmlFor="logo-upload" className="cursor-pointer shrink-0">
                                                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-all relative overflow-hidden bg-slate-900">
                                                        {imagePreview ? (
                                                            <Image src={imagePreview} alt="Aperçu du logo" fill className="object-contain p-2"/>
                                                        ) : (
                                                            <ImageIcon className="h-8 w-8"/>
                                                        )}
                                                    </div>
                                                </label>
                                                <Input id="logo-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/svg+xml" onChange={handleLogoFileSelect} />
                                                <div className="w-full space-y-2">
                                                    <p className="text-xs text-slate-400">Cliquez sur l'icône pour importer une nouvelle image. L'URL sera générée automatiquement.</p>
                                                    <Input readOnly value={form.getValues('logoUrl') || 'Aucun logo défini'} className="dark:bg-slate-700 dark:border-slate-600 text-slate-400" />
                                                </div>
                                            </div>
                                        </FormItem>

                                        <FormField control={form.control} name="contactEmail" render={({ field }) => ( <FormItem><FormLabel>Email de contact</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
                                </CardContent>
                            </Card>
                            </TabsContent>

                            <TabsContent value="commercial" className="mt-6">
                            <Card className="dark:bg-slate-800 dark:border-slate-700">
                                <CardHeader>
                                    <CardTitle className="dark:text-white">Paramètres Commerciaux</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                        <FormField control={form.control} name="platformCommission" render={({ field }) => ( 
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2"><Percent className="h-4 w-4"/> Taux de commission (%)</FormLabel>
                                                <FormControl><Input type="number" {...field} className="dark:bg-slate-700 dark:border-slate-600" /></FormControl>
                                                <FormDescription>La commission que la plateforme prend sur chaque vente.</FormDescription>
                                                <FormMessage />
                                            </FormItem> 
                                        )} />
                                        <FormField control={form.control} name="currency" render={({ field }) => ( 
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2"><DollarSign className="h-4 w-4"/> Devise</FormLabel>
                                                <FormControl><Input readOnly {...field} className="dark:bg-slate-900/50 dark:border-slate-700 cursor-not-allowed" /></FormControl>
                                                <FormDescription>La devise par défaut pour tous les paiements.</FormDescription>
                                                <FormMessage />
                                            </FormItem> 
                                        )} />
                                        <FormField control={form.control} name="minPayoutThreshold" render={({ field }) => ( 
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2"><Wallet className="h-4 w-4"/> Seuil minimum de retrait</FormLabel>
                                                <FormControl><Input type="number" {...field} className="dark:bg-slate-700 dark:border-slate-600" /></FormControl>
                                                <FormDescription>Le montant minimum qu'un instructeur doit avoir pour demander un retrait.</FormDescription>
                                                <FormMessage />
                                            </FormItem> 
                                        )} />
                                </CardContent>
                            </Card>
                            </TabsContent>
                            
                            <TabsContent value="platform" className="mt-6">
                                <Card className="dark:bg-slate-800 dark:border-slate-700">
                                <CardHeader>
                                    <CardTitle className="dark:text-white">Configuration de la Plateforme</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                        <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700"><div className="space-y-0.5"><FormLabel>Mode Maintenance</FormLabel><FormDescription>Met le site en maintenance pour tous sauf les admins.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name="allowInstructorSignup" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700"><div className="space-y-0.5"><FormLabel>Autoriser les candidatures d'instructeurs</FormLabel><FormDescription>Active ou désactive la page "Devenir instructeur".</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name="autoApproveCourses" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700"><div className="space-y-0.5"><FormLabel>Approbation automatique des cours</FormLabel><FormDescription>Si activé, les cours soumis par les instructeurs seront publiés immédiatement.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name="enableInternalMessaging" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700"><div className="space-y-0.5"><FormLabel>Activer la messagerie interne</FormLabel><FormDescription>Permet aux étudiants de contacter les instructeurs et autres étudiants.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                                        )} />
                                </CardContent>
                            </Card>
                            </TabsContent>
                            
                            <TabsContent value="content" className="mt-6">
                                <Card className="dark:bg-slate-800 dark:border-slate-700">
                                    <CardHeader><CardTitle className="dark:text-white">Page "À Propos"</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField control={form.control} name="aboutTitle" render={({ field }) => ( <FormItem><FormLabel>Titre principal</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="aboutSubtitle" render={({ field }) => ( <FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Textarea {...field} rows={2} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="historyTitle" render={({ field }) => ( <FormItem><FormLabel>Titre "Notre Histoire"</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="historyFrench" render={({ field }) => ( <FormItem><FormLabel>Texte "Notre Histoire" (FR)</FormLabel><FormControl><Textarea {...field} rows={4} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="historySango" render={({ field }) => ( <FormItem><FormLabel>Texte "Notre Histoire" (Sango)</FormLabel><FormControl><Textarea {...field} rows={4} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="visionTitle" render={({ field }) => ( <FormItem><FormLabel>Titre "Notre Vision"</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="visionFrench" render={({ field }) => ( <FormItem><FormLabel>Texte "Notre Vision" (FR)</FormLabel><FormControl><Textarea {...field} rows={4} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="visionSango" render={({ field }) => ( <FormItem><FormLabel>Texte "Notre Vision" (Sango)</FormLabel><FormControl><Textarea {...field} rows={4} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="ctaTitle" render={({ field }) => ( <FormItem><FormLabel>Titre du CTA final</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="ctaSubtitle" render={({ field }) => ( <FormItem><FormLabel>Sous-titre du CTA final</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="legal" className="mt-6">
                            <Card className="dark:bg-slate-800 dark:border-slate-700">
                                <CardHeader><CardTitle className="dark:text-white">Textes légaux</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                        <FormField control={form.control} name="termsOfService" render={({ field }) => ( <FormItem><FormLabel>Conditions Générales d'Utilisation</FormLabel><FormControl><Textarea {...field} rows={8} placeholder="Collez le contenu des CGU ici..." className="dark:bg-slate-700 dark:border-slate-600" /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="privacyPolicy" render={({ field }) => ( <FormItem><FormLabel>Politique de Confidentialité</FormLabel><FormControl><Textarea {...field} rows={8} placeholder="Collez le contenu de la politique de confidentialité ici..." className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
                                </CardContent>
                            </Card>
                            </TabsContent>
                        </form>
                    </Form>
                </Tabs>
            </div>
        </>
    );
}
