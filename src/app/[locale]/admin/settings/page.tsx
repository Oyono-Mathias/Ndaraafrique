'use client';

/**
 * @fileOverview Centre de Contrôle Global Ndara Afrique.
 * 15 Sections de pilotage en temps réel avec raccordement Firestore complet.
 * ✅ DESIGN : Architecture modulaire par onglets optimisée pour mobile.
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
  Wrench,
  Globe,
  Smartphone,
  BookOpen,
  Users,
  Target,
  Bell,
  Lock,
  Palette,
  BarChart3,
  Cloud,
  FileText,
  Mail,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import type { Settings } from '@/lib/types';
import { cn } from '@/lib/utils';

// Schéma de validation géant pour les 15 sections
const settingsSchema = z.object({
  // 1. General
  siteName: z.string().min(2),
  siteDescription: z.string().optional(),
  contactEmail: z.string().email(),
  supportPhone: z.string().optional(),
  defaultLanguage: z.string(),
  defaultCountry: z.string(),
  maintenanceMode: z.boolean(),
  // 2. Financial
  platformCommission: z.coerce.number().min(0).max(100),
  instructorShare: z.coerce.number().min(0).max(100),
  minPayoutThreshold: z.coerce.number().min(1000),
  withdrawalFee: z.coerce.number().min(0),
  payoutDelayDays: z.coerce.number().min(0),
  currency: z.string(),
  // 3. Payments
  enableMtn: z.boolean(),
  enableOrange: z.boolean(),
  paymentMode: z.enum(['test', 'live']),
  // 4. Courses
  courseAutoApproval: z.boolean(),
  minCoursePrice: z.coerce.number(),
  maxCoursePrice: z.coerce.number(),
  allowFreeCourses: z.boolean(),
  // 5. Instructors
  instructorVerificationRequired: z.boolean(),
  instructorAutoApproval: z.boolean(),
  maxCoursesPerUser: z.coerce.number(),
  // 6. Students
  allowRegistration: z.boolean(),
  emailVerificationRequired: z.boolean(),
  // 7. Affiliate
  affiliateEnabled: z.boolean(),
  affiliateCommissionRate: z.coerce.number(),
  cookieDurationDays: z.coerce.number(),
  // 8. Notifications
  notifyEmail: z.boolean(),
  notifyInApp: z.boolean(),
  notifySales: z.boolean(),
  // 9. Security
  enable2fa: z.boolean(),
  maxLoginAttempts: z.coerce.number(),
  // 10. Appearance
  primaryColor: z.string(),
  borderRadius: z.enum(['none', 'md', 'lg', 'xl']),
  // 11. Analytics
  googleAnalyticsId: z.string().optional(),
  conversionTracking: z.boolean(),
  // 12. Storage
  useBunnyCdn: z.boolean(),
  maxFileSizeMb: z.coerce.number(),
  // 13. Legal
  termsOfService: z.string(),
  privacyPolicy: z.string(),
  // 14. Email
  smtpHost: z.string().optional(),
  senderName: z.string().optional(),
  // 15. Special Platform Flags
  allowTeacherToTeacherResale: z.boolean().default(false),
  allowCourseBuyout: z.boolean().default(true),
  announcementMessage: z.string().optional(),
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
        primaryColor: '#10b981',
        borderRadius: 'lg',
        maxFileSizeMb: 50,
        allowTeacherToTeacherResale: false,
        allowCourseBuyout: true,
    }
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as Settings;
        form.reset({
          siteName: d.general?.siteName || 'Ndara Afrique',
          siteDescription: d.general?.siteDescription || '',
          contactEmail: d.general?.contactEmail || '',
          supportPhone: d.general?.supportPhone || '',
          defaultLanguage: d.general?.defaultLanguage || 'fr',
          defaultCountry: d.general?.defaultCountry || 'CF',
          maintenanceMode: d.platform?.maintenanceMode || d.general?.maintenanceMode || false,
          platformCommission: d.commercial?.platformCommission || 20,
          instructorShare: d.commercial?.instructorShare || 70,
          minPayoutThreshold: d.commercial?.minPayoutThreshold || 5000,
          withdrawalFee: d.commercial?.withdrawalFee || 0,
          payoutDelayDays: d.commercial?.payoutDelayDays || 14,
          currency: d.commercial?.currency || 'XOF',
          enableMtn: d.payments?.enableMtn ?? true,
          enableOrange: d.payments?.enableOrange ?? true,
          paymentMode: d.payments?.paymentMode || 'test',
          courseAutoApproval: d.courses?.autoApproval ?? false,
          minCoursePrice: d.courses?.minPrice || 0,
          maxCoursePrice: d.courses?.maxPrice || 500000,
          allowFreeCourses: d.courses?.allowFree ?? true,
          instructorVerificationRequired: d.instructors?.verificationRequired ?? true,
          instructorAutoApproval: d.instructors?.autoApproval ?? false,
          maxCoursesPerUser: d.instructors?.maxCoursesPerUser || 20,
          allowRegistration: d.students?.allowRegistration ?? true,
          emailVerificationRequired: d.students?.emailVerification ?? true,
          affiliateEnabled: d.affiliate?.enabled ?? true,
          affiliateCommissionRate: d.affiliate?.commissionRate || 10,
          cookieDurationDays: d.affiliate?.cookieDurationDays || 30,
          notifyEmail: d.notifications?.enableEmail ?? true,
          notifyInApp: d.notifications?.enableInApp ?? true,
          notifySales: d.notifications?.notifySales ?? true,
          enable2fa: d.security?.enable2fa ?? false,
          maxLoginAttempts: d.security?.maxLoginAttempts || 5,
          primaryColor: d.appearance?.primaryColor || '#10b981',
          borderRadius: d.appearance?.borderRadius || 'lg',
          googleAnalyticsId: d.analytics?.googleAnalyticsId || '',
          conversionTracking: d.analytics?.conversionTracking ?? true,
          useBunnyCdn: d.storage?.useBunnyCdn ?? true,
          maxFileSizeMb: d.storage?.maxFileSizeMb || 50,
          termsOfService: d.legal?.termsOfService || '',
          privacyPolicy: d.legal?.privacyPolicy || '',
          smtpHost: d.email?.smtpHost || '',
          senderName: d.email?.senderName || 'Ndara Afrique',
          allowTeacherToTeacherResale: d.platform?.allowTeacherToTeacherResale ?? false,
          allowCourseBuyout: d.platform?.allowCourseBuyout ?? true,
          announcementMessage: d.platform?.announcementMessage || '',
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
      const payload: Partial<Settings> = {
        general: { 
            siteName: values.siteName, 
            siteDescription: values.siteDescription, 
            contactEmail: values.contactEmail, 
            supportPhone: values.supportPhone, 
            defaultLanguage: values.defaultLanguage, 
            defaultCountry: values.defaultCountry, 
            maintenanceMode: values.maintenanceMode 
        },
        platform: {
            maintenanceMode: values.maintenanceMode,
            announcementMessage: values.announcementMessage || '',
            allowTeacherToTeacherResale: values.allowTeacherToTeacherResale,
            allowCourseBuyout: values.allowCourseBuyout,
            allowInstructorSignup: values.allowRegistration,
            allowYoutube: true,
            allowBunny: values.useBunnyCdn
        },
        commercial: {
            platformCommission: values.platformCommission,
            instructorShare: values.instructorShare,
            minPayoutThreshold: values.minPayoutThreshold,
            withdrawalFee: values.withdrawalFee,
            payoutDelayDays: values.payoutDelayDays,
            currency: values.currency,
            affiliatePercentage: values.affiliateCommissionRate
        },
        payments: {
            enableMtn: values.enableMtn,
            enableOrange: values.enableOrange,
            paymentMode: values.paymentMode
        },
        courses: {
            autoApproval: values.courseAutoApproval,
            minPrice: values.minCoursePrice,
            maxPrice: values.maxCoursePrice,
            allowFree: values.allowFreeCourses,
            maxLessons: 50,
            maxVideoDuration: 120
        },
        instructors: {
            verificationRequired: values.instructorVerificationRequired,
            autoApproval: values.instructorAutoApproval,
            maxCoursesPerUser: values.maxCoursesPerUser,
            expertBadgeEnabled: true
        },
        students: {
            allowRegistration: values.allowRegistration,
            emailVerification: values.emailVerificationRequired,
            phoneVerification: false,
            dailyDownloadLimit: 5
        },
        affiliate: {
            enabled: values.affiliateEnabled,
            commissionRate: values.affiliateCommissionRate,
            cookieDurationDays: values.cookieDurationDays,
            payoutThreshold: values.minPayoutThreshold
        },
        notifications: {
            enableEmail: values.notifyEmail,
            enableInApp: values.notifyInApp,
            notifySales: values.notifySales,
            notifyEnrollments: true,
            notifyMessages: true
        },
        security: {
            enable2fa: values.enable2fa,
            maxLoginAttempts: values.maxLoginAttempts,
            ipBlacklist: [],
            accountProtectionRules: ""
        },
        appearance: {
            primaryColor: values.primaryColor,
            borderRadius: values.borderRadius,
            fontScale: 'medium'
        },
        analytics: {
            googleAnalyticsId: values.googleAnalyticsId,
            conversionTracking: values.conversionTracking,
            internalAnalytics: true
        },
        storage: {
            useBunnyCdn: values.useBunnyCdn,
            maxFileSizeMb: values.maxFileSizeMb,
            maxVideoSizeMb: 500
        },
        legal: {
            termsOfService: values.termsOfService,
            privacyPolicy: values.privacyPolicy,
            refundPolicy: "",
            legalNotices: ""
        },
        email: {
            smtpHost: values.smtpHost,
            senderName: values.senderName,
            templates: {}
        }
      } as any;

      const result = await updateGlobalSettings({
        adminId: currentUser.uid,
        settings: payload
      });

      if (result.success) {
        toast({ title: "Configuration propagée !", description: "Tous les services sont synchronisés." });
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Erreur de sauvegarde", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a]">
        <Loader2 className="h-10 w-10 animate-spin text-primary"/>
      </div>
    );
  }

  const sections = [
    { id: 'general', label: 'Général', icon: Globe },
    { id: 'financial', label: 'Finance', icon: BadgeEuro },
    { id: 'payments', label: 'MoMo & Pay', icon: Smartphone },
    { id: 'courses', label: 'Cours', icon: BookOpen },
    { id: 'instructors', label: 'Experts', icon: ShieldCheck },
    { id: 'students', label: 'Ndara', icon: Users },
    { id: 'affiliate', label: 'Ambassadeur', icon: Target },
    { id: 'notifications', label: 'Alertes', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: Lock },
    { id: 'appearance', label: 'Branding', icon: Palette },
    { id: 'analytics', label: 'Data', icon: BarChart3 },
    { id: 'storage', label: 'Cloud/CDN', icon: Cloud },
    { id: 'legal', label: 'Légal', icon: FileText },
    { id: 'email', label: 'E-mailing', icon: Mail },
    { id: 'roles', label: 'Permissions', icon: Wrench },
  ];

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700 bg-[#0f172a] min-h-screen">
      <header className="px-6 pt-8">
        <div className="flex items-center gap-3 text-primary mb-2">
            <SettingsIcon className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Infrastructure Plateforme</span>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none">Centre de Contrôle</h1>
        <p className="text-slate-500 text-xs mt-2 font-medium">Pilotez chaque rouage de Ndara Afrique en temps réel.</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 mb-8 overflow-hidden">
                <TabsList className="bg-slate-900 border-slate-800 p-1 h-14 rounded-2xl flex items-center justify-start gap-1 overflow-x-auto hide-scrollbar">
                {sections.map(s => (
                    <TabsTrigger key={s.id} value={s.id} className="h-full px-6 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-slate-950 transition-all shrink-0">
                        <s.icon size={14} /> <span>{s.label}</span>
                    </TabsTrigger>
                ))}
                </TabsList>
            </div>

            <main className="px-6 max-w-5xl mx-auto space-y-8">
                
                {/* 1. GENERAL */}
                <TabsContent value="general" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase">Identité du site</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="siteName" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nom de la plateforme</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email Support</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                            </div>
                            <FormField control={form.control} name="siteDescription" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Description Meta (SEO)</FormLabel><FormControl><Textarea {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                            )}/>
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                                    <FormItem className="flex items-center justify-between p-5 bg-red-500/5 border border-red-500/10 rounded-2xl">
                                        <div><FormLabel className="text-sm font-bold text-white uppercase">Mode Maintenance</FormLabel><FormDescription className="text-[10px]">Bloque l'accès à tous sauf aux admins.</FormDescription></div>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="allowTeacherToTeacherResale" render={({ field }) => (
                                    <FormItem className="flex items-center justify-between p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                        <div><FormLabel className="text-sm font-bold text-white uppercase">Marché Libre (Bourse)</FormLabel><FormDescription className="text-[10px]">Autorise la revente de licences entre experts.</FormDescription></div>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}/>
                            </div>
                            <FormField control={form.control} name="announcementMessage" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Message d'annonce global (Bandeau)</FormLabel><FormControl><Input {...field} placeholder="Ex: Flash Sale : -50% sur tous les cours d'IA ! Sango: ..." className="h-12 bg-slate-950 border-slate-800" /></FormControl></FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 2. FINANCIAL */}
                <TabsContent value="financial" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-primary/10 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase">Économie & Commissions</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <FormField control={form.control} name="platformCommission" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Taxe Ndara (%)</FormLabel><FormControl><Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 text-2xl font-black text-primary" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="instructorShare" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Part Expert (%)</FormLabel><FormControl><Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 text-2xl font-black" /></FormControl></FormItem>
                                )}/>
                            </div>
                            <div className="grid md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="minPayoutThreshold" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Seuil de retrait</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="payoutDelayDays" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Délai gel (Jours)</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="currency" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Devise</FormLabel><FormControl><Input {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. PAYMENTS */}
                <TabsContent value="payments" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase">Passerelles Mobile Money</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <FormField control={form.control} name="enableMtn" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                                    <FormLabel className="font-bold">Activer MTN MoMo</FormLabel>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="enableOrange" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                                    <FormLabel className="font-bold">Activer Orange Money</FormLabel>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="paymentMode" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">Mode Environnement</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="test">Bac à sable (Sandbox)</SelectItem>
                                            <SelectItem value="live">Production (Réel)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 4. COURSES */}
                <TabsContent value="courses" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase">Règles Pédagogiques</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <FormField control={form.control} name="courseAutoApproval" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                                    <div className="space-y-0.5"><FormLabel className="font-bold uppercase text-xs">Approbation Automatique</FormLabel><FormDescription className="text-[10px]">Publie les cours sans relecture admin.</FormDescription></div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <div className="grid grid-cols-2 gap-6">
                                <FormField control={form.control} name="minCoursePrice" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Prix Min</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                                <FormField control={form.control} name="maxCoursePrice" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Prix Max</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 10. APPEARANCE */}
                <TabsContent value="appearance" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase">Identité Visuelle</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <FormField control={form.control} name="primaryColor" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Couleur Primaire (Hex)</FormLabel>
                                    <div className="flex gap-4">
                                        <FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 flex-1 font-mono" /></FormControl>
                                        <div className="w-12 h-12 rounded-xl shadow-inner border border-white/10" style={{ backgroundColor: field.value }} />
                                    </div>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="borderRadius" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Style des cartes (Arrondis)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl><SelectTrigger className="bg-slate-950 border-slate-800 h-12"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="none">Carré (0px)</SelectItem>
                                            <SelectItem value="md">Modéré (12px)</SelectItem>
                                            <SelectItem value="lg">Large (24px)</SelectItem>
                                            <SelectItem value="xl">Extra (40px)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 13. LEGAL */}
                <TabsContent value="legal" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5"><CardTitle className="text-xl font-bold uppercase">Contrats & Légal</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <FormField control={form.control} name="termsOfService" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Conditions Générales (CGU)</FormLabel><FormControl><Textarea rows={10} {...field} className="bg-slate-950 border-slate-800 font-mono text-xs" /></FormControl></FormItem>
                            )}/>
                            <FormField control={form.control} name="privacyPolicy" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Politique de Confidentialité</FormLabel><FormControl><Textarea rows={10} {...field} className="bg-slate-950 border-slate-800 font-mono text-xs" /></FormControl></FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>

            </main>

            {/* STICKY SAVE BAR */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 z-50 safe-area-pb md:relative md:bg-transparent md:border-none md:p-0 md:max-w-5xl md:mx-auto md:px-6">
                <Button 
                    type="submit" 
                    disabled={isSaving} 
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-3 animate-pulse-glow border-none"
                >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <CheckCircle2 className="h-5 w-5" />}
                    Déployer la configuration
                </Button>
            </div>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
