'use client';

/**
 * @fileOverview Centre de Contrôle Global Ndara Afrique - Version Intégrale Connectée.
 * Gère l'ensemble des configurations de la plateforme (Finances, Pédagogie, Sécurité, etc.)
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
  Zap,
  Server,
  Shield,
  HardDrive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Settings } from '@/lib/types';

// Schéma de validation complet - Alignée sur les besoins réels du backend
const settingsSchema = z.object({
  siteName: z.string().min(2),
  siteDescription: z.string().optional(),
  contactEmail: z.string().email(),
  supportPhone: z.string().optional(),
  defaultLanguage: z.string(),
  defaultCountry: z.string(),
  maintenanceMode: z.boolean(),
  announcementMessage: z.string().optional(),
  facebookUrl: z.string().url().optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  youtubeUrl: z.string().url().optional().or(z.literal('')),
  telegramUrl: z.string().url().optional().or(z.literal('')),
  tiktokUrl: z.string().url().optional().or(z.literal('')),
  platformCommission: z.coerce.number().min(0).max(100),
  instructorShare: z.coerce.number().min(0).max(100),
  minPayoutThreshold: z.coerce.number().min(1000),
  withdrawalFee: z.coerce.number().min(0),
  payoutDelayDays: z.coerce.number().min(0),
  currency: z.string(),
  enableMtn: z.boolean(),
  enableOrange: z.boolean(),
  mesombEnabled: z.boolean(),
  monerooEnabled: z.boolean(),
  paymentMode: z.enum(['test', 'live']),
  courseAutoApproval: z.boolean(),
  minCoursePrice: z.coerce.number(),
  maxCoursePrice: z.coerce.number(),
  allowFreeCourses: z.boolean(),
  maxLessonsPerCourse: z.coerce.number().default(50),
  maxVideoDurationMin: z.coerce.number().default(120),
  instructorVerificationRequired: z.boolean(),
  instructorAutoApproval: z.boolean(),
  allowInstructorSignup: z.boolean(),
  maxCoursesPerUser: z.coerce.number(),
  allowRegistration: z.boolean(),
  emailVerificationRequired: z.boolean(),
  phoneVerificationRequired: z.boolean().default(false),
  dailyDownloadLimit: z.coerce.number().default(5),
  affiliateEnabled: z.boolean(),
  affiliateCommissionRate: z.coerce.number(),
  cookieDurationDays: z.coerce.number(),
  notifyEmail: z.boolean(),
  notifyInApp: z.boolean(),
  notifySales: z.boolean(),
  notifyEnrollments: z.boolean().default(true),
  notifyMessages: z.boolean().default(true),
  enable2fa: z.boolean(),
  primaryColor: z.string(),
  borderRadius: z.enum(['none', 'md', 'lg', 'xl']),
  fontScale: z.enum(['small', 'medium', 'large']),
  googleAnalyticsId: z.string().optional(),
  facebookPixelId: z.string().optional(),
  conversionTracking: z.boolean(),
  useBunnyCdn: z.boolean(),
  maxFileSizeMb: z.coerce.number(),
  termsOfService: z.string(),
  privacyPolicy: z.string(),
  refundPolicy: z.string().optional(),
  legalNotices: z.string().optional(),
  smtpHost: z.string().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().email().optional().or(z.literal('')),
  allowTeacherToTeacherResale: z.boolean().default(false),
  allowCourseBuyout: z.boolean().default(true),
  allowResaleRights: z.boolean().default(true),
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
        fontScale: 'medium',
        maxFileSizeMb: 50,
        allowTeacherToTeacherResale: false,
        allowCourseBuyout: true,
        allowResaleRights: true,
        mesombEnabled: true,
        monerooEnabled: false,
        allowInstructorSignup: true,
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
          facebookUrl: d.social?.facebookUrl || '',
          instagramUrl: d.social?.instagramUrl || '',
          twitterUrl: d.social?.twitterUrl || '',
          linkedinUrl: d.social?.linkedinUrl || '',
          youtubeUrl: d.social?.youtubeUrl || '',
          telegramUrl: d.social?.telegramUrl || '',
          tiktokUrl: d.social?.tiktokUrl || '',
          platformCommission: d.commercial?.platformCommission || 20,
          instructorShare: d.commercial?.instructorShare || 70,
          minPayoutThreshold: d.commercial?.minPayoutThreshold || 5000,
          withdrawalFee: d.commercial?.withdrawalFee || 0,
          payoutDelayDays: d.commercial?.payoutDelayDays || 14,
          currency: d.commercial?.currency || 'XOF',
          enableMtn: d.payments?.enableMtn ?? true,
          enableOrange: d.payments?.enableOrange ?? true,
          mesombEnabled: d.payments?.mesombEnabled ?? true,
          monerooEnabled: d.payments?.monerooEnabled ?? false,
          paymentMode: d.payments?.paymentMode || 'test',
          courseAutoApproval: d.courses?.autoApproval ?? false,
          minCoursePrice: d.courses?.minPrice || 0,
          maxCoursePrice: d.courses?.maxPrice || 500000,
          allowFreeCourses: d.courses?.allowFree ?? true,
          maxLessonsPerCourse: d.courses?.maxLessons || 50,
          maxVideoDurationMin: d.courses?.maxVideoDuration || 120,
          instructorVerificationRequired: d.instructors?.verificationRequired ?? true,
          instructorAutoApproval: d.instructors?.autoApproval ?? false,
          allowInstructorSignup: d.platform?.allowInstructorSignup ?? true,
          maxCoursesPerUser: d.instructors?.maxCoursesPerUser || 20,
          allowRegistration: d.students?.allowRegistration ?? true,
          emailVerificationRequired: d.students?.emailVerification ?? true,
          phoneVerificationRequired: d.students?.phoneVerification ?? false,
          dailyDownloadLimit: d.students?.dailyDownloadLimit || 5,
          affiliateEnabled: d.affiliate?.enabled ?? true,
          affiliateCommissionRate: d.affiliate?.commissionRate || 10,
          cookieDurationDays: d.affiliate?.cookieDurationDays || 30,
          notifyEmail: d.notifications?.enableEmail ?? true,
          notifyInApp: d.notifications?.enableInApp ?? true,
          notifySales: d.notifications?.notifySales ?? true,
          notifyEnrollments: d.notifications?.notifyEnrollments ?? true,
          notifyMessages: d.notifications?.notifyMessages ?? true,
          enable2fa: d.security?.enable2fa ?? false,
          primaryColor: d.appearance?.primaryColor || '#10b981',
          borderRadius: d.appearance?.borderRadius || 'lg',
          fontScale: d.appearance?.fontScale || 'medium',
          googleAnalyticsId: d.analytics?.googleAnalyticsId || '',
          facebookPixelId: d.analytics?.facebookPixelId || '',
          conversionTracking: d.analytics?.conversionTracking ?? true,
          useBunnyCdn: d.storage?.useBunnyCdn ?? true,
          maxFileSizeMb: d.storage?.maxFileSizeMb || 50,
          termsOfService: d.legal?.termsOfService || '',
          privacyPolicy: d.legal?.privacyPolicy || '',
          refundPolicy: d.legal?.refundPolicy || '',
          legalNotices: d.legal?.legalNotices || '',
          smtpHost: d.email?.smtpHost || '',
          senderName: d.email?.senderName || 'Ndara Afrique',
          senderEmail: d.email?.senderEmail || '',
          allowTeacherToTeacherResale: d.platform?.allowTeacherToTeacherResale ?? false,
          allowCourseBuyout: d.platform?.allowCourseBuyout ?? true,
          allowResaleRights: d.platform?.allowResaleRights ?? true,
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
        general: { 
            siteName: values.siteName, 
            siteDescription: values.siteDescription || '',
            contactEmail: values.contactEmail || '',
            supportPhone: values.supportPhone || '',
            defaultLanguage: values.defaultLanguage, 
            defaultCountry: values.defaultCountry, 
        },
        social: {
            facebookUrl: values.facebookUrl,
            instagramUrl: values.instagramUrl,
            twitterUrl: values.twitterUrl,
            linkedinUrl: values.linkedinUrl,
            youtubeUrl: values.youtubeUrl,
            telegramUrl: values.telegramUrl,
            tiktokUrl: values.tiktokUrl,
        },
        platform: {
            maintenanceMode: values.maintenanceMode,
            announcementMessage: values.announcementMessage || '',
            allowTeacherToTeacherResale: values.allowTeacherToTeacherResale,
            allowCourseBuyout: values.allowCourseBuyout,
            allowResaleRights: values.allowResaleRights,
            allowInstructorSignup: values.allowInstructorSignup,
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
            mesombEnabled: values.mesombEnabled,
            monerooEnabled: values.monerooEnabled,
            paymentMode: values.paymentMode
        },
        courses: {
            autoApproval: values.courseAutoApproval,
            minPrice: values.minCoursePrice,
            maxPrice: values.maxCoursePrice,
            allowFree: values.allowFreeCourses,
            maxLessons: values.maxLessonsPerCourse,
            maxVideoDuration: values.maxVideoDurationMin
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
            phoneVerification: values.phoneVerificationRequired,
            dailyDownloadLimit: values.dailyDownloadLimit
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
            notifyEnrollments: values.notifyEnrollments,
            notifyMessages: values.notifyMessages
        },
        security: {
            enable2fa: values.enable2fa,
            accountProtectionRules: ""
        },
        appearance: {
            primaryColor: values.primaryColor,
            borderRadius: values.borderRadius,
            fontScale: values.fontScale
        },
        analytics: {
            googleAnalyticsId: values.googleAnalyticsId,
            facebookPixelId: values.facebookPixelId,
            conversionTracking: values.conversionTracking,
            internalAnalytics: true
        },
        storage: {
            useBunnyCdn: values.useBunnyCdn,
            maxFileSizeMb: values.maxFileSizeMb,
        },
        legal: {
            termsOfService: values.termsOfService,
            privacyPolicy: values.privacyPolicy,
            refundPolicy: values.refundPolicy || '',
            legalNotices: values.legalNotices || ''
        },
        email: {
            smtpHost: values.smtpHost,
            senderName: values.senderName,
            senderEmail: values.senderEmail,
            templates: {}
        }
      };

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
    { id: 'storage', label: 'CDN & Cloud', icon: Cloud },
    { id: 'legal', label: 'Légal', icon: FileText },
    { id: 'email', label: 'E-mailing', icon: Mail },
    { id: 'roles', label: 'Permissions', icon: Wrench },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a]">
        <Loader2 className="h-10 w-10 animate-spin text-primary"/>
      </div>
    );
  }

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
                {sections.map(s => {
                    const Icon = s.icon;
                    return (
                        <TabsTrigger key={s.id} value={s.id} className="h-full px-6 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-slate-950 transition-all shrink-0">
                            <Icon size={14} /> <span>{s.label}</span>
                        </TabsTrigger>
                    );
                })}
                </TabsList>
            </div>

            <main className="px-6 max-w-5xl mx-auto space-y-8">
                <TabsContent value="general" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-bold uppercase">Identité & Contact</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="siteName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nom de la plateforme</FormLabel>
                                        <FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 text-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email Support</FormLabel>
                                        <FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 text-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="supportPhone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Numéro WhatsApp Support</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500"><Smartphone size={16}/></div>
                                                <Input {...field} placeholder="23675000000" className="h-12 pl-10 bg-slate-950 border-slate-800 text-white" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <div className="space-y-4 pt-4">
                                    <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                                        <FormItem className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                                            <FormLabel className="text-sm font-bold text-white uppercase">Mode Maintenance</FormLabel>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormItem>
                                    )}/>
                                </div>
                            </div>

                            <FormField control={form.control} name="announcementMessage" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Bandeau d'alerte global</FormLabel>
                                    <FormControl><Input {...field} placeholder="Ex: Flash Sale : -50% !" className="h-12 bg-slate-950 border-slate-800 text-white" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="financial" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-primary/10 p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-bold uppercase">Économie & Commissions</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <FormField control={form.control} name="platformCommission" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Taxe Ndara (%)</FormLabel>
                                        <FormControl><Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 text-2xl font-black text-primary" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="instructorShare" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Part Expert (%)</FormLabel>
                                        <FormControl><Input type="number" {...field} className="h-14 bg-slate-950 border-slate-800 text-2xl font-black text-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="storage" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-blue-500/10 p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-bold uppercase flex items-center gap-3"><HardDrive className="text-blue-400 h-6 w-6" /> CDN & Stockage Bunny</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <FormField control={form.control} name="useBunnyCdn" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                                    <div>
                                        <FormLabel className="font-bold uppercase text-xs">Utiliser Bunny.net</FormLabel>
                                        <FormDescription className="text-[10px]">Active le streaming vidéo et le stockage asset.</FormDescription>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="maxFileSizeMb" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">Taille Max Fichier (MB)</FormLabel>
                                    <FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800 text-white font-black" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="instructors" className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-primary/5 p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-bold uppercase">Recrutement & Limites</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <FormField control={form.control} name="allowInstructorSignup" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                                    <div>
                                        <FormLabel className="font-bold uppercase text-xs">Inscriptions Ouvertes</FormLabel>
                                        <FormDescription className="text-[10px]">Permettre aux Ndara de postuler comme Experts.</FormDescription>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="instructorAutoApproval" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                                    <div>
                                        <FormLabel className="font-bold uppercase text-xs">Approbation Automatique</FormLabel>
                                        <FormDescription className="text-[10px]">Passage expert sans revue manuelle.</FormDescription>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 z-50 safe-area-pb md:relative md:bg-transparent md:border-none md:p-0 md:max-w-5xl md:mx-auto md:px-6">
                <Button 
                    type="submit" 
                    disabled={isSaving} 
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-3 border-none"
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
