
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useDoc, useMemoFirebase } from '@/firebase';
import Image from 'next/image';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, FileText, Percent, Building, Image as ImageIcon, Wallet, DollarSign, MessageCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { Skeleton } from '@/components/ui/skeleton';

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
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
    const { t } = useTranslation();
    const { toast } = useToast();
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
            termsOfService: `Bienvenue sur Ndara Afrique !

Dernière mise à jour : 28 Juillet 2024

Ces Conditions Générales d'Utilisation (CGU) régissent votre accès et votre utilisation de la plateforme Ndara Afrique. En vous inscrivant, vous acceptez d'être lié par ces conditions.

**1. Votre Compte**

- **Création :** Vous devez fournir des informations exactes lors de votre inscription. Vous êtes responsable de la sécurité de votre mot de passe et de toute activité sur votre compte.
- **Unicité :** Chaque utilisateur ne peut détenir qu'un seul compte. La création de comptes multiples est interdite.

**2. Rôles et Responsabilités**

- **Étudiant :** Vous avez accès aux cours auxquels vous êtes inscrit. Vous vous engagez à respecter les droits de propriété intellectuelle des instructeurs et à ne pas distribuer le contenu des cours.
- **Instructeur :** En publiant un cours, vous garantissez que vous en détenez tous les droits. Vous accordez à Ndara Afrique une licence pour héberger, commercialiser et distribuer votre cours sur la plateforme. Vous êtes responsable du contenu que vous publiez et de l'accompagnement de vos étudiants.
- **Admin :** L'équipe de Ndara Afrique a le droit de modérer les contenus, de gérer les utilisateurs et d'assurer le bon fonctionnement de la plateforme.

**3. Paiements et Remboursements**

- **Paiements :** Les prix des cours sont fixés par les instructeurs et sont indiqués en Francs CFA (XOF). Les paiements sont traités via des passerelles sécurisées (Mobile Money, etc.).
- **Revenus de l'Instructeur :** Ndara Afrique prélève une commission sur chaque vente. Le solde est versé à l'instructeur selon les modalités définies dans la section "Mes Revenus".
- **Remboursements :** Les demandes de remboursement sont traitées au cas par cas. En règle générale, un remboursement peut être accordé si la demande est faite dans les 7 jours suivant l'achat et si moins de 20% du cours a été consulté.

**4. Propriété Intellectuelle**

- **Votre Contenu (Instructeurs) :** Vous conservez tous les droits de propriété sur le contenu que vous publiez.
- **Contenu de Ndara Afrique :** La marque, le logo et le design de la plateforme sont la propriété exclusive de Ndara Afrique.

**5. Suspension et Résiliation de Compte**

Ndara Afrique se réserve le droit de suspendre ou de résilier votre compte sans préavis si vous ne respectez pas ces conditions, notamment en cas de :
- Fraude ou tentative de fraude.
- Violation des droits d'auteur.
- Harcèlement ou comportement inapproprié envers d'autres utilisateurs.
- Non-respect de nos standards de qualité pour les cours (instructeurs).

**6. Limitation de Responsabilité**

Ndara Afrique est une plateforme de mise en relation. Nous ne sommes pas responsables de la qualité intrinsèque du contenu fourni par les instructeurs. Cependant, nous nous engageons à mettre en place des processus de validation pour garantir un niveau de qualité élevé.

**7. Modification des Conditions**

Nous pouvons modifier ces CGU à tout moment. Vous serez notifié de tout changement important. Votre utilisation continue de la plateforme après une modification vaut acceptation des nouvelles conditions.

Pour toute question, contactez-nous à support@ndara-afrique.com`,
            privacyPolicy: '',
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
        setIsSaving(true);
        let finalLogoUrl = form.getValues('logoUrl') || '';

        try {
            if (croppedImageFile) {
                const filePath = `logos/site_logo_${Date.now()}`;
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
                }
            };
            await setDoc(settingsRef, settingsPayload, { merge: true });
            toast({ title: t('settings_saved_title'), description: t('settings_saved_desc') });
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast({ variant: "destructive", title: t('errorTitle'), description: t('settings_save_error') });
        } finally {
            setIsSaving(false);
        }
    };
    
     if (isLoading) {
        return (
            <div className="space-y-6">
                <header className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-9 w-64" />
                        <Skeleton className="h-4 w-96 mt-2" />
                    </div>
                     <Skeleton className="h-12 w-32" />
                </header>
                 <Skeleton className="h-12 w-full" />
                 <Skeleton className="h-96 w-full" />
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
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <header className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold dark:text-white">{t('site_settings')}</h1>
                            <p className="text-muted-foreground dark:text-slate-400">{t('settings_desc')}</p>
                        </div>
                         <Button type="submit" disabled={isSaving} className="h-12 w-32 text-lg tv:h-20 tv:w-48 tv:text-2xl">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin tv:h-8 tv:w-8" /> : null}
                            {t('save_btn')}
                        </Button>
                    </header>
                    
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 dark:bg-slate-800 dark:border-slate-700">
                            <TabsTrigger value="general" className="tv:text-xl tv:py-4"><Settings className="w-4 h-4 mr-2 tv:w-6 tv:h-6"/>{t('tab_general')}</TabsTrigger>
                            <TabsTrigger value="commercial" className="tv:text-xl tv:py-4"><Percent className="w-4 h-4 mr-2 tv:w-6 tv:h-6"/>{t('tab_commercial')}</TabsTrigger>
                            <TabsTrigger value="platform" className="tv:text-xl tv:py-4"><Building className="w-4 h-4 mr-2 tv:w-6 tv:h-6"/>{t('tab_platform')}</TabsTrigger>
                            <TabsTrigger value="legal" className="tv:text-xl tv:py-4"><FileText className="w-4 h-4 mr-2 tvh-6-"/>{t('tab_legal')}</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="general" className="mt-6">
                            <Card className="dark:bg-slate-800 dark:border-slate-700">
                               <CardHeader>
                                   <CardTitle className="dark:text-white tv:text-2xl">{t('platform_identity')}</CardTitle>
                               </CardHeader>
                               <CardContent className="space-y-4">
                                    <FormField control={form.control} name="siteName" render={({ field }) => ( <FormItem><FormLabel className="tv:text-lg">{t('site_name')}</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600 tv:h-14 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary" /></FormControl><FormMessage /></FormItem> )} />
                                    
                                    <FormItem>
                                        <FormLabel className="tv:text-lg">{t('logo_url')}</FormLabel>
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

                                    <FormField control={form.control} name="contactEmail" render={({ field }) => ( <FormItem><FormLabel className="tv:text-lg">{t('contact_email')}</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600 tv:h-14 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary"/></FormControl><FormMessage /></FormItem> )} />
                               </CardContent>
                           </Card>
                        </TabsContent>

                        <TabsContent value="commercial" className="mt-6">
                           <Card className="dark:bg-slate-800 dark:border-slate-700">
                               <CardHeader>
                                   <CardTitle className="dark:text-white tv:text-2xl">{t('commercial_settings')}</CardTitle>
                               </CardHeader>
                               <CardContent className="space-y-6">
                                    <FormField control={form.control} name="platformCommission" render={({ field }) => ( 
                                        <FormItem>
                                            <FormLabel className="tv:text-lg flex items-center gap-2"><Percent className="h-4 w-4"/> {t('commission_rate')}</FormLabel>
                                            <FormControl><Input type="number" {...field} className="dark:bg-slate-700 dark:border-slate-600 tv:h-14 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary" /></FormControl>
                                            <FormDescription className="tv:text-base">{t('commission_desc')}</FormDescription>
                                            <FormMessage />
                                        </FormItem> 
                                    )} />
                                    <FormField control={form.control} name="currency" render={({ field }) => ( 
                                        <FormItem>
                                            <FormLabel className="tv:text-lg flex items-center gap-2"><DollarSign className="h-4 w-4"/> {t('currency')}</FormLabel>
                                            <FormControl><Input readOnly {...field} className="dark:bg-slate-900/50 dark:border-slate-700 tv:h-14 tv:text-lg cursor-not-allowed" /></FormControl>
                                            <FormDescription className="tv:text-base">{t('currency_desc')}</FormDescription>
                                            <FormMessage />
                                        </FormItem> 
                                    )} />
                                    <FormField control={form.control} name="minPayoutThreshold" render={({ field }) => ( 
                                        <FormItem>
                                            <FormLabel className="tv:text-lg flex items-center gap-2"><Wallet className="h-4 w-4"/> {t('payout_threshold')}</FormLabel>
                                            <FormControl><Input type="number" {...field} className="dark:bg-slate-700 dark:border-slate-600 tv:h-14 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary" /></FormControl>
                                            <FormDescription className="tv:text-base">{t('payout_threshold_desc')}</FormDescription>
                                            <FormMessage />
                                        </FormItem> 
                                    )} />
                               </CardContent>
                           </Card>
                        </TabsContent>
                        
                        <TabsContent value="platform" className="mt-6">
                            <Card className="dark:bg-slate-800 dark:border-slate-700">
                               <CardHeader>
                                   <CardTitle className="dark:text-white tv:text-2xl">{t('platform_config')}</CardTitle>
                               </CardHeader>
                               <CardContent className="space-y-4">
                                    <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                                       <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700 tv:p-6"><div className="space-y-0.5"><FormLabel className="tv:text-lg">{t('maintenance')}</FormLabel><FormDescription className="tv:text-base">{t('maintenance_desc')}</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="allowInstructorSignup" render={({ field }) => (
                                       <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700 tv:p-6"><div className="space-y-0.5"><FormLabel className="tv:text-lg">{t('allow_applications')}</FormLabel><FormDescription className="tv:text-base">{t('allow_applications_desc')}</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="autoApproveCourses" render={({ field }) => (
                                       <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700 tv:p-6"><div className="space-y-0.5"><FormLabel className="tv:text-lg">Approbation automatique des cours</FormLabel><FormDescription className="tv:text-base">Si activé, les cours soumis par les instructeurs seront publiés immédiatement.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                                    )} />
                                     <FormField control={form.control} name="enableInternalMessaging" render={({ field }) => (
                                       <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700 tv:p-6"><div className="space-y-0.5"><FormLabel className="tv:text-lg">Activer la messagerie interne</FormLabel><FormDescription className="tv:text-base">Permet aux étudiants de contacter les instructeurs et autres étudiants.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                                    )} />
                               </CardContent>
                           </Card>
                        </TabsContent>

                        <TabsContent value="legal" className="mt-6">
                           <Card className="dark:bg-slate-800 dark:border-slate-700">
                               <CardHeader><CardTitle className="dark:text-white tv:text-2xl">{t('legal_texts')}</CardTitle></CardHeader>
                               <CardContent className="space-y-4">
                                    <FormField control={form.control} name="termsOfService" render={({ field }) => ( <FormItem><FormLabel className="tv:text-lg">{t('cgu')}</FormLabel><FormControl><Textarea {...field} rows={8} placeholder="Collez le contenu des CGU ici..." className="dark:bg-slate-700 dark:border-slate-600 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary" /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="privacyPolicy" render={({ field }) => ( <FormItem><FormLabel className="tv:text-lg">{t('privacy_policy')}</FormLabel><FormControl><Textarea {...field} rows={8} placeholder="Collez le contenu de la politique de confidentialité ici..." className="dark:bg-slate-700 dark:border-slate-600 tv:text-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary"/></FormControl><FormMessage /></FormItem> )} />
                               </CardContent>
                           </Card>
                        </TabsContent>
                    </Tabs>
                </form>
            </Form>
        </>
    );
}
