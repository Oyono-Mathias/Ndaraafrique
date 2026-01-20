'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Settings, FileText, Percent, Building, Upload, Briefcase, Check, MessagesSquare, FileSignature } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/RoleContext';
import { updateGlobalSettings } from '@/actions/settingsActions';
import type { Settings as SettingsType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const settingsSchema = z.object({
  general: z.object({
    siteName: z.string().min(1, "Le nom du site est requis."),
    logoUrl: z.string().optional(),
    loginBackgroundImage: z.string().url("URL invalide").optional().or(z.literal('')),
    contactEmail: z.string().email("Adresse e-mail invalide."),
    supportPhone: z.string().optional(),
  }),
  commercial: z.object({
    platformCommission: z.coerce.number().min(0, "Doit être un nombre positif.").max(100, "Ne peut pas dépasser 100."),
    currency: z.string().length(3, "Le code devise doit faire 3 caractères."),
    minPayoutThreshold: z.coerce.number().min(0, "Doit être un nombre positif."),
    featuredCourseId: z.string().optional(),
  }),
  platform: z.object({
    announcementMessage: z.string().optional(),
    maintenanceMode: z.boolean().default(false),
    allowInstructorSignup: z.boolean().default(true),
    autoApproveCourses: z.boolean().default(false),
    enableInternalMessaging: z.boolean().default(true),
  }),
  legal: z.object({
    termsOfService: z.string().optional(),
    privacyPolicy: z.string().optional(),
  }),
  content: z.object({
    aboutPage: z.object({
        mainTitle: z.string().optional(),
        mainSubtitle: z.string().optional(),
        historyTitle: z.string().optional(),
        historyFrench: z.string().optional(),
        historySango: z.string().optional(),
        visionTitle: z.string().optional(),
        visionFrench: z.string().optional(),
        visionSango: z.string().optional(),
        ctaTitle: z.string().optional(),
        ctaSubtitle: z.string().optional(),
    }).optional(),
    landingPage: z.object({
        howItWorks_step1_imageUrl: z.string().url("URL invalide").optional().or(z.literal('')),
        howItWorks_step2_imageUrl: z.string().url("URL invalide").optional().or(z.literal('')),
        howItWorks_step3_imageUrl: z.string().url("URL invalide").optional().or(z.literal('')),
        securitySection_imageUrl: z.string().url("URL invalide").optional().or(z.literal('')),
    }).optional(),
  }).optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const { currentUser } = useRole();
    const { toast } = useToast();
    const db = getFirestore();

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            general: {
                siteName: "Ndara Afrique",
                contactEmail: "support@ndara-afrique.com",
            },
            commercial: {
              platformCommission: 30,
              currency: 'XOF',
              minPayoutThreshold: 5000
            },
            platform: {
                maintenanceMode: false,
                allowInstructorSignup: true,
                autoApproveCourses: false,
                enableInternalMessaging: true
            },
            legal: {
                termsOfService: '',
                privacyPolicy: '',
            },
            content: {
                aboutPage: {
                    mainTitle: '',
                    mainSubtitle: '',
                    historyTitle: '',
                    historyFrench: '',
                    historySango: '',
                    visionTitle: '',
                    visionFrench: '',
                    visionSango: '',
                    ctaTitle: '',
                    ctaSubtitle: '',
                },
                landingPage: {
                    howItWorks_step1_imageUrl: '',
                    howItWorks_step2_imageUrl: '',
                    howItWorks_step3_imageUrl: '',
                    securitySection_imageUrl: '',
                }
            }
        }
    });
    
    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'global');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const settingsData = docSnap.data() as SettingsType;
                form.reset(settingsData);
            }
            setIsLoadingData(false);
        });
        return () => unsubscribe();
    }, [db, form]);

    const onSubmit = async (data: SettingsFormValues) => {
      if (!currentUser) {
          toast({ variant: "destructive", title: "Erreur", description: "Vous devez être connecté." });
          return;
      }
      setIsSaving(true);
      const result = await updateGlobalSettings({ settings: data, adminId: currentUser.uid });
      if (result.success) {
          toast({ title: "Paramètres sauvegardés", description: "Les modifications ont été enregistrées avec succès." });
      } else {
          toast({ variant: "destructive", title: "Erreur de sauvegarde", description: result.error });
      }
      setIsSaving(false);
    };

    if (isLoadingData) {
        return (
             <div className="space-y-8">
                <header>
                  <Skeleton className="h-9 w-1/3" />
                  <Skeleton className="h-5 w-1/2 mt-2" />
                </header>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
             </div>
        );
    }

    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-24 md:pb-0">
             <header>
                <h1 className="text-3xl font-bold dark:text-white">Paramètres du Site</h1>
                <p className="text-muted-foreground dark:text-slate-400">Configurez les aspects globaux de la plateforme.</p>
            </header>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 dark:bg-slate-800 dark:border-slate-700">
                    <TabsTrigger value="general"><Settings className="w-4 h-4 mr-2"/>Général</TabsTrigger>
                    <TabsTrigger value="commercial"><Percent className="w-4 h-4 mr-2"/>Commercial</TabsTrigger>
                    <TabsTrigger value="platform"><Building className="w-4 h-4 mr-2"/>Plateforme</TabsTrigger>
                    <TabsTrigger value="content"><FileSignature className="w-4 h-4 mr-2"/>Contenu</TabsTrigger>
                    <TabsTrigger value="legal"><FileText className="w-4 h-4 mr-2"/>Légal</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="mt-6 space-y-6">
                    <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="dark:text-white">Identité de la Plateforme</CardTitle>
                            <CardDescription className="dark:text-slate-400">Gérez le nom, le logo et les informations de contact de base.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="general.siteName"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nom du site</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="general.contactEmail"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email de contact public</FormLabel>
                                    <FormControl>
                                    <Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormItem>
                                <FormLabel>Logo du site</FormLabel>
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16 rounded-lg bg-slate-700">
                                        <AvatarImage src={form.getValues('general.logoUrl')} />
                                        <AvatarFallback>NA</AvatarFallback>
                                    </Avatar>
                                    <Button type="button" variant="outline" className="dark:bg-slate-700 dark:border-slate-600">
                                        <Upload className="mr-2 h-4 w-4"/>
                                        Changer le logo
                                    </Button>
                                </div>
                                <FormControl>
                                    <Input type="file" className="sr-only" />
                                </FormControl>
                            </FormItem>
                        </CardContent>
                    </Card>
                    <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="dark:text-white">Statut de la plateforme</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="platform.maintenanceMode"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 dark:border-slate-700">
                                        <div className="space-y-0.5">
                                            <FormLabel>Mode Maintenance</FormLabel>
                                            <FormDescription>
                                            Si activé, seuls les administrateurs pourront accéder au site.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="platform" className="mt-6">
                    <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="dark:text-white">Configuration de la Plateforme</CardTitle>
                            <CardDescription className="dark:text-slate-400">Activez ou désactivez des fonctionnalités globales.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="platform.allowInstructorSignup" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 dark:border-slate-700">
                                    <div className="space-y-0.5">
                                        <FormLabel className="flex items-center gap-2"><Briefcase className="h-4 w-4"/>Autoriser les candidatures d'instructeurs</FormLabel>
                                        <FormDescription>Permettre aux nouveaux utilisateurs de postuler pour devenir instructeur.</FormDescription>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="platform.autoApproveCourses" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 dark:border-slate-700">
                                    <div className="space-y-0.5">
                                        <FormLabel className="flex items-center gap-2"><Check className="h-4 w-4"/>Validation automatique des cours</FormLabel>
                                        <FormDescription>Si activé, les cours soumis sont publiés sans modération (non recommandé).</FormDescription>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="platform.enableInternalMessaging" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 dark:border-slate-700">
                                    <div className="space-y-0.5">
                                        <FormLabel className="flex items-center gap-2"><MessagesSquare className="h-4 w-4"/>Activer la messagerie interne</FormLabel>
                                        <FormDescription>Permettre aux utilisateurs de communiquer entre eux sur la plateforme.</FormDescription>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="commercial" className="mt-6">
                    <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="dark:text-white">Paramètres Commerciaux</CardTitle>
                            <CardDescription className="dark:text-slate-400">Configurez la monétisation et les paiements.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="commercial.platformCommission"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Taux de commission (%)</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="30" {...field} className="dark:bg-slate-700 dark:border-slate-600" />
                                    </FormControl>
                                    <FormDescription>Le pourcentage que la plateforme retient sur chaque vente.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="commercial.currency"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Devise</FormLabel>
                                    <FormControl>
                                    <Input placeholder="XOF" {...field} className="dark:bg-slate-700 dark:border-slate-600" />
                                    </FormControl>
                                    <FormDescription>Code ISO à 3 lettres de la devise (ex: XOF, EUR, USD).</FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="commercial.minPayoutThreshold"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Seuil minimum de retrait</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="5000" {...field} className="dark:bg-slate-700 dark:border-slate-600" />
                                    </FormControl>
                                    <FormDescription>Montant minimum qu'un instructeur doit atteindre pour demander un retrait.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="content" className="mt-6 space-y-6">
                    <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="dark:text-white">Page d'accueil</CardTitle>
                            <CardDescription className="dark:text-slate-400">Modifiez les images des sections "Comment ça marche" et "Sécurité".</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="content.landingPage.howItWorks_step1_imageUrl" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Image "Étape 1: Choisissez votre formation"</FormLabel>
                                    <FormControl><Input {...field} placeholder="URL de l'image..." className="dark:bg-slate-700 dark:border-slate-600"/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="content.landingPage.howItWorks_step2_imageUrl" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Image "Étape 2: Payez simplement"</FormLabel>
                                    <FormControl><Input {...field} placeholder="URL de l'image..." className="dark:bg-slate-700 dark:border-slate-600"/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="content.landingPage.howItWorks_step3_imageUrl" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Image "Étape 3: Obtenez votre certification"</FormLabel>
                                    <FormControl><Input {...field} placeholder="URL de l'image..." className="dark:bg-slate-700 dark:border-slate-600"/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="content.landingPage.securitySection_imageUrl" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Image de la section "Sécurité des transactions"</FormLabel>
                                    <FormControl><Input {...field} placeholder="URL de l'image..." className="dark:bg-slate-700 dark:border-slate-600"/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </CardContent>
                    </Card>
                    <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="dark:text-white">Page "À Propos"</CardTitle>
                            <CardDescription className="dark:text-slate-400">Modifiez le contenu de la page "À propos de nous".</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <FormField control={form.control} name="content.aboutPage.mainTitle" render={({ field }) => (
                                <FormItem><FormLabel>Titre Principal</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="content.aboutPage.mainSubtitle" render={({ field }) => (
                                <FormItem><FormLabel>Sous-titre Principal</FormLabel><FormControl><Textarea {...field} rows={2} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="content.aboutPage.historyTitle" render={({ field }) => (
                                <FormItem><FormLabel>Titre Section Histoire</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="content.aboutPage.historyFrench" render={({ field }) => (
                                <FormItem><FormLabel>Texte Histoire (Français)</FormLabel><FormControl><Textarea {...field} rows={4} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="content.aboutPage.historySango" render={({ field }) => (
                                <FormItem><FormLabel>Texte Histoire (Sango)</FormLabel><FormControl><Textarea {...field} rows={4} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="content.aboutPage.visionTitle" render={({ field }) => (
                                <FormItem><FormLabel>Titre Section Vision</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="content.aboutPage.visionFrench" render={({ field }) => (
                                <FormItem><FormLabel>Texte Vision (Français)</FormLabel><FormControl><Textarea {...field} rows={4} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="content.aboutPage.visionSango" render={({ field }) => (
                                <FormItem><FormLabel>Texte Vision (Sango)</FormLabel><FormControl><Textarea {...field} rows={4} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="content.aboutPage.ctaTitle" render={({ field }) => (
                                <FormItem><FormLabel>Titre Appel à l'action</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="content.aboutPage.ctaSubtitle" render={({ field }) => (
                                <FormItem><FormLabel>Sous-titre Appel à l'action</FormLabel><FormControl><Input {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                            )} />
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="legal" className="mt-6">
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader>
                        <CardTitle className="dark:text-white">Textes légaux</CardTitle>
                        <CardDescription className="dark:text-slate-400">Modifiez le contenu des pages légales qui seront affichées aux utilisateurs.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <FormField
                            control={form.control}
                            name="legal.termsOfService"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Conditions Générales d'Utilisation</FormLabel>
                                    <FormControl>
                                        <Textarea rows={10} placeholder="Entrez le contenu des CGU ici..." {...field} className="dark:bg-slate-700 dark:border-slate-600" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="legal.privacyPolicy"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Politique de Confidentialité</FormLabel>
                                    <FormControl>
                                        <Textarea rows={10} placeholder="Entrez le contenu de la politique de confidentialité ici..." {...field} className="dark:bg-slate-700 dark:border-slate-600" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
                </TabsContent>
            </Tabs>

            <div className="fixed bottom-0 left-0 right-0 z-50 p-4 border-t md:relative md:p-0 md:border-none bg-background/80 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none md:flex md:justify-end">
                <Button type="submit" disabled={isSaving} className="w-full h-12 text-base md:w-auto md:h-auto md:text-sm">
                     {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer les Modifications
                </Button>
            </div>
        </form>
        </Form>
    );
}
