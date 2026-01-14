
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useDoc, useMemoFirebase } from '@/firebase';
import { useRole } from '@/context/RoleContext';
import Image from 'next/image';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, FileText, Percent, Building, Image as ImageIcon, Wallet, DollarSign } from 'lucide-react';
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
            privacyPolicy: `Politique de Confidentialité de Ndara Afrique

Dernière mise à jour : 28 Juillet 2024

Chez Ndara Afrique, la confiance de nos utilisateurs est notre priorité. Cette politique explique en termes simples quelles informations nous collectons et pourquoi.

**1. Les Données que Nous Collectons**

Pour faire fonctionner la plateforme, nous avons besoin de certaines informations :

- **Informations de Compte :** Votre nom, votre adresse e-mail et votre mot de passe (chiffré). Ces informations sont essentielles pour créer votre compte, vous connecter et sécuriser votre accès.
- **Informations de Profil :** Votre nom d'utilisateur, votre biographie, votre photo de profil et vos objectifs de carrière. Ces données permettent de personnaliser votre expérience et, si vous le souhaitez, d'interagir avec la communauté.
- **Données de Cours :** Les cours auxquels vous vous inscrivez, votre progression, vos devoirs et les certificats que vous obtenez. C'est le cœur de votre parcours d'apprentissage.
- **Données de Paiement :** Lorsque vous achetez un cours, nous enregistrons la transaction (montant, date, cours acheté). Nous ne stockons **jamais** vos informations de carte bancaire ou de Mobile Money ; elles sont traitées de manière sécurisée par notre partenaire de paiement.
- **Communications :** Les messages que vous échangez avec les instructeurs ou d'autres utilisateurs via notre messagerie interne.

**2. Pourquoi Nous Utilisons Vos Données**

Nous utilisons ces informations uniquement pour :

- **Fournir le Service :** Vous donner accès aux cours, suivre votre progression et vous délivrer vos certificats.
- **Gérer les Paiements :** Traiter vos achats et rémunérer les instructeurs.
- **Communiquer :** Vous envoyer des notifications importantes sur vos cours, des confirmations d'inscription ou des réponses de notre support.
- **Améliorer la Plateforme :** Analyser des données anonymisées pour comprendre quels cours sont populaires et comment améliorer l'expérience utilisateur.

**3. Stockage et Sécurité**

- **Où ?** Vos données sont stockées de manière sécurisée sur les serveurs de Google Firebase, un service reconnu mondialement pour sa fiabilité et sa sécurité.
- **Comment ?** Nous utilisons les meilleures pratiques, comme le chiffrement, pour protéger vos informations. L'accès à la base de données est strictement contrôlé par des règles de sécurité pour empêcher tout accès non autorisé.

**4. Qui a Accès à Vos Données ?**

Votre vie privée est essentielle. Voici qui peut voir quoi :

- **Vous :** Vous avez accès à toutes les données de votre profil et de votre parcours.
- **Les Instructeurs :** Un instructeur peut voir votre nom et votre progression **uniquement pour les cours que vous suivez avec lui**. Cela lui permet de vous accompagner.
- **Les Autres Étudiants :** Si vous interagissez dans la communauté, les autres verront votre nom d'utilisateur et les informations que vous choisissez de rendre publiques sur votre profil.
- **Les Administrateurs de Ndara Afrique :** Un nombre très restreint de personnes a un accès plus large pour assurer la maintenance, la modération et le support de la plateforme. Ils sont soumis à des obligations de confidentialité strictes.
- **Tiers :** Nous ne vendons, ne louons et ne partagerons **jamais** vos données personnelles à des fins marketing à des entreprises tierces.

**5. Vos Droits**

Vous restez maître de vos données. Vous avez le droit de :

- **Accéder :** Consulter à tout moment les informations de votre compte.
- **Rectifier :** Mettre à jour votre nom, votre e-mail ou les informations de votre profil.
- **Effacer :** Supprimer définitivement votre compte et toutes les données associées depuis les paramètres de votre profil.

**6. Cookies**

Nous utilisons des cookies techniques indispensables au bon fonctionnement du site (par exemple, pour vous maintenir connecté). Nous n'utilisons pas de cookies de suivi publicitaire tiers.

**7. Contact**

Pour toute question concernant vos données, contactez-nous à : support@ndara-afrique.com.`,
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
                        <h1 className="text-3xl font-bold dark:text-white">{t('site_settings')}</h1>
                        <p className="text-muted-foreground dark:text-slate-400">{t('settings_desc')}</p>
                    </div>
                     <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="w-full sm:w-auto h-12 text-base md:text-sm">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t('save_btn')}
                    </Button>
                </header>
                
                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 dark:bg-slate-800 dark:border-slate-700">
                        <TabsTrigger value="general"><Settings className="w-4 h-4 mr-2"/>{t('tab_general')}</TabsTrigger>
                        <TabsTrigger value="commercial"><Percent className="w-4 h-4 mr-2"/>{t('tab_commercial')}</TabsTrigger>
                        <TabsTrigger value="platform"><Building className="w-4 h-4 mr-2"/>{t('tab_platform')}</TabsTrigger>
                        <TabsTrigger value="legal"><FileText className="w-4 h-4 mr-2"/>{t('tab_legal')}</TabsTrigger>
                    </TabsList>
                    
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <TabsContent value="general" className="mt-6">
                                <Card className="dark:bg-slate-800 dark:border-slate-700">
                                <CardHeader>
                                    <CardTitle className="dark:text-white">{t('platform_identity')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                        <FormField control={form.control} name="siteName" render={({ field }) => ( <FormItem><FormLabel>{t('site_name')}</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary" /></FormControl><FormMessage /></FormItem> )} />
                                        
                                        <FormItem>
                                            <FormLabel>{t('logo_url')}</FormLabel>
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

                                        <FormField control={form.control} name="contactEmail" render={({ field }) => ( <FormItem><FormLabel>{t('contact_email')}</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
                                </CardContent>
                            </Card>
                            </TabsContent>

                            <TabsContent value="commercial" className="mt-6">
                            <Card className="dark:bg-slate-800 dark:border-slate-700">
                                <CardHeader>
                                    <CardTitle className="dark:text-white">{t('commercial_settings')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                        <FormField control={form.control} name="platformCommission" render={({ field }) => ( 
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2"><Percent className="h-4 w-4"/> {t('commission_rate')}</FormLabel>
                                                <FormControl><Input type="number" {...field} className="dark:bg-slate-700 dark:border-slate-600" /></FormControl>
                                                <FormDescription>{t('commission_desc')}</FormDescription>
                                                <FormMessage />
                                            </FormItem> 
                                        )} />
                                        <FormField control={form.control} name="currency" render={({ field }) => ( 
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2"><DollarSign className="h-4 w-4"/> {t('currency')}</FormLabel>
                                                <FormControl><Input readOnly {...field} className="dark:bg-slate-900/50 dark:border-slate-700 cursor-not-allowed" /></FormControl>
                                                <FormDescription>{t('currency_desc')}</FormDescription>
                                                <FormMessage />
                                            </FormItem> 
                                        )} />
                                        <FormField control={form.control} name="minPayoutThreshold" render={({ field }) => ( 
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2"><Wallet className="h-4 w-4"/> {t('payout_threshold')}</FormLabel>
                                                <FormControl><Input type="number" {...field} className="dark:bg-slate-700 dark:border-slate-600" /></FormControl>
                                                <FormDescription>{t('payout_threshold_desc')}</FormDescription>
                                                <FormMessage />
                                            </FormItem> 
                                        )} />
                                </CardContent>
                            </Card>
                            </TabsContent>
                            
                            <TabsContent value="platform" className="mt-6">
                                <Card className="dark:bg-slate-800 dark:border-slate-700">
                                <CardHeader>
                                    <CardTitle className="dark:text-white">{t('platform_config')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                        <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700"><div className="space-y-0.5"><FormLabel>{t('maintenance')}</FormLabel><FormDescription>{t('maintenance_desc')}</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name="allowInstructorSignup" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-slate-700"><div className="space-y-0.5"><FormLabel>{t('allow_applications')}</FormLabel><FormDescription>{t('allow_applications_desc')}</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
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

                            <TabsContent value="legal" className="mt-6">
                            <Card className="dark:bg-slate-800 dark:border-slate-700">
                                <CardHeader><CardTitle className="dark:text-white">{t('legal_texts')}</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                        <FormField control={form.control} name="termsOfService" render={({ field }) => ( <FormItem><FormLabel>{t('cgu')}</FormLabel><FormControl><Textarea {...field} rows={8} placeholder="Collez le contenu des CGU ici..." className="dark:bg-slate-700 dark:border-slate-600" /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="privacyPolicy" render={({ field }) => ( <FormItem><FormLabel>{t('privacy_policy')}</FormLabel><FormControl><Textarea {...field} rows={8} placeholder="Collez le contenu de la politique de confidentialité ici..." className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem> )} />
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
