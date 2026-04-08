
'use client';

/**
 * @fileOverview Centre de Contrôle Global Ndara Afrique - Version 2.5 Intégrale.
 * ✅ RÉORGANISATION : 14 sections fusionnées en 6 Hubs fonctionnels.
 * ✅ RÉSOLU : Correction du typage strict pour enable2fa dans le schéma Zod.
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings as SettingsIcon, 
  Loader2, 
  CheckCircle2,
  BadgeEuro,
  Globe,
  Smartphone,
  BookOpen,
  Bell,
  Lock,
  Palette,
  HardDrive,
  Mail,
  ShieldCheck,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Settings } from '@/lib/types';

const settingsSchema = z.object({
  // Général
  siteName: z.string().min(2),
  siteDescription: z.string().optional(),
  contactEmail: z.string().email(),
  supportPhone: z.string().optional(),
  defaultLanguage: z.string(),
  defaultCountry: z.string(),
  maintenanceMode: z.boolean(),
  announcementMessage: z.string().optional(),
  
  // Économie & Paiement
  platformCommission: z.coerce.number().min(0).max(100),
  instructorShare: z.coerce.number().min(0).max(100),
  minPayoutThreshold: z.coerce.number().min(1000),
  withdrawalFee: z.coerce.number().min(0),
  payoutDelayDays: z.coerce.number().min(0),
  currency: z.string(),
  mesombEnabled: z.boolean(),
  monerooEnabled: z.boolean(),
  paymentMode: z.enum(['test', 'live']),
  affiliateEnabled: z.boolean(),
  affiliateCommissionRate: z.coerce.number(),
  cookieDurationDays: z.coerce.number(),

  // Pédagogie
  courseAutoApproval: z.boolean(),
  minCoursePrice: z.coerce.number(),
  maxCoursePrice: z.coerce.number(),
  allowFreeCourses: z.boolean(),
  instructorVerificationRequired: z.boolean(),
  instructorAutoApproval: z.boolean(),
  allowInstructorSignup: z.boolean(),
  maxCoursesPerUser: z.coerce.number(),
  allowRegistration: z.boolean(),
  emailVerificationRequired: z.boolean(),
  
  // Look & Feel
  primaryColor: z.string(),
  borderRadius: z.enum(['none', 'md', 'lg', 'xl']),
  useBunnyCdn: z.boolean(),
  maxFileSizeMb: z.coerce.number(),
  googleAnalyticsId: z.string().optional(),
  facebookPixelId: z.string().optional(),

  // Légal
  termsOfService: z.string(),
  privacyPolicy: z.string(),

  // Email
  senderName: z.string().optional(),
  senderEmail: z.string().email().optional().or(z.literal('')),

  // Sécurité
  enable2fa: z.boolean().default(false),
});

type SettingsValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
        siteName: 'Ndara Afrique',
        maintenanceMode: false,
        platformCommission: 20,
        currency: 'XOF',
        paymentMode: 'test',
        allowRegistration: true,
        affiliateEnabled: true,
        useBunnyCdn: true,
        maxFileSizeMb: 50,
        mesombEnabled: true,
        allowInstructorSignup: true,
        enable2fa: false,
    }
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as any; 
        form.reset({
          siteName: d.general?.siteName || 'Ndara Afrique',
          siteDescription: d.general?.siteDescription || '',
          contactEmail: d.general?.contactEmail || '',
          supportPhone: d.general?.supportPhone || '',
          defaultLanguage: d.general?.defaultLanguage || 'fr',
          defaultCountry: d.general?.defaultCountry || 'CF',
          maintenanceMode: d.platform?.maintenanceMode || false,
          announcementMessage: d.platform?.announcementMessage || '',
          platformCommission: d.commercial?.platformCommission || 20,
          instructorShare: d.commercial?.instructorShare || 70,
          minPayoutThreshold: d.commercial?.minPayoutThreshold || 5000,
          withdrawalFee: d.commercial?.withdrawalFee || 0,
          payoutDelayDays: d.commercial?.payoutDelayDays || 14,
          currency: d.commercial?.currency || 'XOF',
          mesombEnabled: d.payments?.mesombEnabled ?? true,
          monerooEnabled: d.payments?.monerooEnabled ?? false,
          paymentMode: d.payments?.paymentMode || 'test',
          affiliateEnabled: d.affiliate?.enabled ?? true,
          affiliateCommissionRate: d.affiliate?.commissionRate || 10,
          cookieDurationDays: d.affiliate?.cookieDurationDays || 30,
          courseAutoApproval: d.courses?.autoApproval ?? false,
          minCoursePrice: d.courses?.minPrice || 0,
          maxCoursePrice: d.courses?.maxPrice || 500000,
          allowFreeCourses: d.courses?.allowFree ?? true,
          instructorVerificationRequired: d.instructors?.verificationRequired ?? true,
          instructorAutoApproval: d.instructors?.autoApproval ?? false,
          allowInstructorSignup: d.platform?.allowInstructorSignup ?? true,
          maxCoursesPerUser: d.instructors?.maxCoursesPerUser || 20,
          allowRegistration: d.students?.allowRegistration ?? true,
          emailVerificationRequired: d.students?.emailVerification ?? true,
          primaryColor: d.appearance?.primaryColor || '#10b981',
          borderRadius: d.appearance?.borderRadius || 'lg',
          useBunnyCdn: d.storage?.useBunnyCdn ?? true,
          maxFileSizeMb: d.storage?.maxFileSizeMb || 50,
          googleAnalyticsId: d.analytics?.googleAnalyticsId || '',
          facebookPixelId: d.analytics?.facebookPixelId || '',
          termsOfService: d.legal?.termsOfService || '',
          privacyPolicy: d.legal?.privacyPolicy || '',
          senderName: d.email?.senderName || 'Ndara Afrique',
          senderEmail: d.email?.senderEmail || '',
          enable2fa: d.security?.enable2fa || false,
        });
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db, form]);

  const onSubmit = async (values: SettingsValues) => {
    if (!currentUser) return;
    setIsSaving(true);

    try {
      const payload: any = {
        general: { siteName: values.siteName, siteDescription: values.siteDescription, contactEmail: values.contactEmail, supportPhone: values.supportPhone, defaultLanguage: values.defaultLanguage, defaultCountry: values.defaultCountry },
        platform: { maintenanceMode: values.maintenanceMode, announcementMessage: values.announcementMessage, allowInstructorSignup: values.allowInstructorSignup },
        commercial: { platformCommission: values.platformCommission, instructorShare: values.instructorShare, minPayoutThreshold: values.minPayoutThreshold, withdrawalFee: values.withdrawalFee, payoutDelayDays: values.payoutDelayDays, currency: values.currency },
        payments: { mesombEnabled: values.mesombEnabled, monerooEnabled: values.monerooEnabled, paymentMode: values.paymentMode },
        affiliate: { enabled: values.affiliateEnabled, commissionRate: values.affiliateCommissionRate, cookieDurationDays: values.cookieDurationDays },
        courses: { autoApproval: values.courseAutoApproval, minPrice: values.minCoursePrice, maxPrice: values.maxCoursePrice, allowFree: values.allowFreeCourses },
        instructors: { verificationRequired: values.instructorVerificationRequired, autoApproval: values.instructorAutoApproval, maxCoursesPerUser: values.maxCoursesPerUser },
        students: { allowRegistration: values.allowRegistration, emailVerification: values.emailVerificationRequired },
        appearance: { primaryColor: values.primaryColor, borderRadius: values.borderRadius },
        storage: { useBunnyCdn: values.useBunnyCdn, maxFileSizeMb: values.maxFileSizeMb },
        analytics: { googleAnalyticsId: values.googleAnalyticsId, facebookPixelId: values.facebookPixelId },
        legal: { termsOfService: values.termsOfService, privacyPolicy: values.privacyPolicy },
        email: { senderName: values.senderName, senderEmail: values.senderEmail },
        security: { enable2fa: values.enable2fa },
      };

      const result = await updateGlobalSettings({ adminId: currentUser.uid, settings: payload });
      if (result.success) toast({ title: "Configuration propagée !" });
      else throw new Error(result.error);
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Erreur", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    { id: 'general', label: 'Général', icon: Globe },
    { id: 'economy', label: 'Économie', icon: BadgeEuro },
    { id: 'pedagogy', label: 'Pédagogie', icon: BookOpen },
    { id: 'branding', label: 'Look & Feel', icon: Palette },
    { id: 'communication', label: 'Communication', icon: Mail },
    { id: 'security', label: 'Sécurité', icon: Lock },
  ];

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-[#0f172a]"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>;

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700 bg-[#0f172a] min-h-screen">
      <header className="px-6 pt-8">
        <div className="flex items-center gap-3 text-primary mb-2">
            <SettingsIcon className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Centre de Contrôle</span>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Configuration Ndara</h1>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 mb-8">
                <TabsList className="bg-slate-900 border-slate-800 p-1 h-14 rounded-2xl flex items-center justify-start gap-1 overflow-x-auto hide-scrollbar">
                {sections.map(s => (
                    <TabsTrigger key={s.id} value={s.id} className="h-full px-6 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-slate-950 transition-all shrink-0">
                        <s.icon size={14} /> <span>{s.label}</span>
                    </TabsTrigger>
                ))}
                </TabsList>
            </div>

            <main className="px-6 max-w-5xl mx-auto space-y-8">
                {/* HUB 1 : GÉNÉRAL */}
                <TabsContent value="general" className="space-y-6 m-0 animate-in fade-in">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-bold uppercase">Identité & Statut</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="siteName" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Nom du site</FormLabel><FormControl><Input {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Email Contact</FormLabel><FormControl><Input {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                            </div>
                            <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                                    <FormLabel className="font-bold text-white text-sm uppercase">Mode Maintenance</FormLabel>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="announcementMessage" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Bandeau d'annonce global</FormLabel><FormControl><Input {...field} placeholder="Ex: Flash Sale : -50% !" className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HUB 2 : ÉCONOMIE */}
                <TabsContent value="economy" className="space-y-6 m-0 animate-in fade-in">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-emerald-500/10 p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-bold uppercase">Finances & Commissions</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <FormField control={form.control} name="platformCommission" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Taxe Ndara (%)</FormLabel><FormControl><Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 text-2xl font-black text-primary" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="withdrawalFee" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Frais de retrait (XOF)</FormLabel><FormControl><Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 text-2xl font-black text-white" /></FormControl></FormItem>
                                )}/>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="mesombEnabled" render={({ field }) => (
                                    <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                                        <FormLabel className="font-bold text-white text-xs uppercase">MeSomb (MoMo/Orange)</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="paymentMode" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Mode Passerelle</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger></FormControl><SelectContent className="bg-slate-900 border-slate-800 text-white"><SelectItem value="test">TEST (Simulé)</SelectItem><SelectItem value="live">LIVE (Réel)</SelectItem></SelectContent></Select>
                                    </FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HUB 3 : PÉDAGOGIE */}
                <TabsContent value="pedagogy" className="space-y-6 m-0 animate-in fade-in">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-blue-500/10 p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-bold uppercase">Règles du Catalogue</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="minCoursePrice" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Prix Min (XOF)</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="maxCoursesPerUser" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Limite cours / Expert</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="allowRegistration" render={({ field }) => (
                                    <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                                        <FormLabel className="font-bold text-white text-xs uppercase">Inscriptions Ndara</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="instructorAutoApproval" render={({ field }) => (
                                    <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                                        <FormLabel className="font-bold text-white text-xs uppercase">Auto-Approbation Experts</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HUB 4 : LOOK & FEEL */}
                <TabsContent value="branding" className="space-y-6 m-0 animate-in fade-in">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-purple-500/10 p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-bold uppercase">Identité Visuelle & Stockage</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="primaryColor" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Couleur Primaire (Hex)</FormLabel><div className="flex gap-2"><FormControl><Input {...field} className="bg-slate-950 border-slate-800" /></FormControl><div className="w-12 h-12 rounded-xl border border-white/10" style={{ backgroundColor: field.value }} /></div></FormItem>
                                )}/>
                                <FormField control={form.control} name="maxFileSizeMb" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Taille Max Fichier (MB)</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                            </div>
                            <FormField control={form.control} name="useBunnyCdn" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                                    <FormLabel className="font-bold text-white text-xs uppercase">Utiliser Bunny CDN</FormLabel>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HUB 5 : COMMUNICATION */}
                <TabsContent value="communication" className="space-y-6 m-0 animate-in fade-in">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-blue-500/10 p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-bold uppercase">E-mailing & Notifications</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="senderName" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Nom de l'expéditeur</FormLabel><FormControl><Input {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="senderEmail" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Email d'envoi</FormLabel><FormControl><Input {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HUB 6 : SÉCURITÉ */}
                <TabsContent value="security" className="space-y-6 m-0 animate-in fade-in">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-red-500/10 p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-bold uppercase">Protection du Réseau</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <FormField control={form.control} name="enable2fa" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                                    <FormLabel className="font-bold text-white text-xs uppercase">Authentification 2FA</FormLabel>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" /></FormControl>
                                </FormItem>
                            )}/>
                            <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl flex items-start gap-4">
                                <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                                    "La gestion fine des permissions par utilisateur s'effectue dans la section dédiée du menu latéral (Rôles & Accès)."
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 z-50 safe-area-pb">
                <Button 
                    type="submit" 
                    disabled={isSaving} 
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-3 border-none"
                >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <CheckCircle2 className="h-5 w-5" />}
                    Déployer la configuration globale
                </Button>
            </div>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
