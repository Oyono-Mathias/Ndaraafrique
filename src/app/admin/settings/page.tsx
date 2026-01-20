
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Settings, FileText, Percent, Building } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormLabel } from "@/components/ui/form";

export default function AdminSettingsPage() {
    return (
        <div className="space-y-8">
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
                
                <TabsContent value="general" className="mt-6">
                    <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader>
                        <CardTitle className="dark:text-white">Identité de la Plateforme</CardTitle>
                        <CardDescription className="dark:text-slate-400">Gérez le nom, le logo et les informations de contact de base.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div><FormLabel>Nom du site</FormLabel><Input disabled placeholder="Ndara Afrique" className="dark:bg-slate-700 dark:border-slate-600"/></div>
                        <div><FormLabel>Email de contact</FormLabel><Input disabled placeholder="support@ndara-afrique.com" className="dark:bg-slate-700 dark:border-slate-600"/></div>
                    </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="commercial" className="mt-6">
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader>
                        <CardTitle className="dark:text-white">Paramètres Commerciaux</CardTitle>
                        <CardDescription className="dark:text-slate-400">Configurez la monétisation et les paiements.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div><FormLabel>Taux de commission (%)</FormLabel><Input type="number" disabled placeholder="30" className="dark:bg-slate-700 dark:border-slate-600"/></div>
                         <div><FormLabel>Devise</FormLabel><Input disabled placeholder="XOF" className="dark:bg-slate-700 dark:border-slate-600"/></div>
                         <div><FormLabel>Seuil minimum de retrait</FormLabel><Input type="number" disabled placeholder="5000" className="dark:bg-slate-700 dark:border-slate-600"/></div>
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
                        <div className="flex items-center justify-between rounded-lg border p-3 dark:border-slate-700"><p className="text-sm font-medium">Mode Maintenance</p><Switch disabled /></div>
                        <div className="flex items-center justify-between rounded-lg border p-3 dark:border-slate-700"><p className="text-sm font-medium">Autoriser les candidatures d'instructeurs</p><Switch disabled checked /></div>
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
                <Button disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrer les Modifications
                </Button>
            </div>
        </div>
    );
}
