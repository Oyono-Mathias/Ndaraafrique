
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Settings, FileText, Percent, Building, Upload, Briefcase, Check, MessagesSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const settingsSchema = z.object({
  general: z.object({
    siteName: z.string().min(1, "Le nom du site est requis."),
    logoUrl: z.string().optional(),
    contactEmail: z.string().email("Adresse e-mail invalide."),
    maintenanceMode: z.boolean().default(false),
  }),
  commercial: z.object({
    platformCommission: z.coerce.number().min(0, "Doit être un nombre positif.").max(100, "Ne peut pas dépasser 100."),
    currency: z.string().length(3, "Le code devise doit faire 3 caractères."),
    minPayoutThreshold: z.coerce.number().min(0, "Doit être un nombre positif."),
  }),
  platform: z.object({
    allowInstructorSignup: z.boolean().default(true),
    autoApproveCourses: z.boolean().default(false),
    enableInternalMessaging: z.boolean().default(true),
  }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            general: {
                siteName: "Ndara Afrique",
                contactEmail: "support@ndara-afrique.com",
                maintenanceMode: false
            },
            commercial: {
              platformCommission: 30,
              currency: 'XOF',
              minPayoutThreshold: 5000
            },
            platform: {
                allowInstructorSignup: true,
                autoApproveCourses: false,
                enableInternalMessaging: true
            }
        }
    });
    
    const onSubmit = (data: SettingsFormValues) => {
        console.log(data);
    };

    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
             <header>
                <h1 className="text-3xl font-bold dark:text-white">Paramètres du Site</h1>
                <p className="text-muted-foreground dark:text-slate-400">Configurez les aspects globaux de la plateforme.</p>
            </header>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 dark:bg-slate-800 dark:border-slate-700">
                    <TabsTrigger value="general"><Settings className="w-4 h-4 mr-2"/>Général</TabsTrigger>
                    <TabsTrigger value="commercial"><Percent className="w-4 h-4 mr-2"/>Commercial</TabsTrigger>
                    <TabsTrigger value="platform"><Building className="w-4 h-4 mr-2"/>Plateforme</TabsTrigger>
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
                                        <AvatarImage src="/icon.svg" />
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
                                name="general.maintenanceMode"
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

                <TabsContent value="legal" className="mt-6">
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader>
                        <CardTitle className="dark:text-white">Textes légaux</CardTitle>
                        <CardDescription className="dark:text-slate-400">Modifiez le contenu des pages légales.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div><FormLabel>Conditions Générales d'Utilisation</FormLabel><Textarea disabled rows={5} placeholder="Contenu des CGU..."/></div>
                        <div><FormLabel>Politique de Confidentialité</FormLabel><Textarea disabled rows={5} placeholder="Contenu de la politique de confidentialité..."/></div>
                    </CardContent>
                </Card>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled>
                    Enregistrer les Modifications
                </Button>
            </div>
        </form>
        </Form>
    );
}

    