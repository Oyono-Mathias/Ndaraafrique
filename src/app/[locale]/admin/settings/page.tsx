'use client';

/**
 * @fileOverview Centre de Contrôle Stratégique Ndara Afrique v3.6
 * ✅ RÉSOLU : Validation Zod assouplie pour permettre la sauvegarde.
 * ✅ RÉSOLU : Feedback visuel sur les erreurs de validation.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { updateGlobalSettings } from '@/actions/settingsActions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Settings as SettingsIcon, 
  Loader2, 
  CheckCircle2, 
  Globe, 
  CreditCard, 
  Users, 
  BookOpen, 
  ShoppingBag, 
  Cpu, 
  Bell, 
  Shield, 
  MapPin, 
  TrendingUp, 
  Landmark, 
  Zap,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import type { Settings } from '@/lib/types';
import { cn } from '@/lib/utils';

// Schéma de validation plus flexible pour éviter les blocages
const settingsSchema = z.object({
  general: z.object({
    siteName: z.string().min(2, "Nom requis"),
    logoUrl: z.string().optional().nullable(),
    faviconUrl: z.string().optional().nullable(),
    contactEmail: z.string().email("Email invalide").optional().or(z.literal('')),
    contactPhone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    defaultLanguage: z.enum(['fr', 'en', 'sg']).default('fr'),
    timezone: z.string().default('Africa/Douala')
  }),
  payments: z.object({
    paymentsEnabled: z.boolean().default(true),
    currency: z.string().default('XOF'),
    paymentMethods: z.array(z.string()).default(['mesomb']),
    transactionFeePercent: z.coerce.number().min(0).max(100).default(10),
    minDeposit: z.coerce.number().min(0).default(500),
    maxDeposit: z.coerce.number().min(0).default(500000),
    walletEnabled: z.boolean().default(true),
    operatorCommission: z.coerce.number().min(0).default(3),
    paymentMode: z.enum(['test', 'live']).default('test')
  }),
  users: z.object({
    allowRegistration: z.boolean().default(true),
    allowInstructorSignup: z.boolean().default(true),
    requireEmailVerification: z.boolean().default(false),
    autoApproveInstructors: z.boolean().default(false),
    defaultRole: z.string().default('student'),
    maxAccountsPerUser: z.coerce.number().min(1).default(1)
  }),
  courses: z.object({
    allowCourseCreation: z.boolean().default(true),
    requireAdminApproval: z.boolean().default(true),
    minimumCoursePrice: z.coerce.number().min(0).default(0),
    instructorRevenuePercent: z.coerce.number().min(0).max(100).default(70),
    allowDownload: z.boolean().default(false),
    certificateEnabled: z.boolean().default(true)
  }),
  marketplace: z.object({
    enableMarketplace: z.boolean().default(false),
    minimumResalePrice: z.coerce.number().min(0).default(10000),
    resaleCommissionPercent: z.coerce.number().min(0).max(100).default(20),
    allowLicenseResale: z.boolean().default(false),
  }),
  ai: z.object({
    aiEnabled: z.boolean().default(true),
    modelName: z.string().default('gemini-1.5-flash'),
    maxRequestsPerUser: z.coerce.number().min(0).default(50),
    contentGenerationEnabled: z.boolean().default(true),
    autoCorrection: z.boolean().default(true),
    autonomousTutor: z.boolean().default(true),
    fraudDetection: z.boolean().default(true)
  }),
  notifications: z.object({
    emailNotifications: z.boolean().default(true),
    pushNotifications: z.boolean().default(true),
    smsNotifications: z.boolean().default(false),
    adminAlerts: z.object({
      newUser: z.boolean().default(true),
      newPayment: z.boolean().default(true),
      systemError: z.boolean().default(true)
    })
  }),
  security: z.object({
    maintenanceMode: z.boolean().default(false),
    enable2fa: z.boolean().default(false),
    maxLoginAttempts: z.coerce.number().min(1).default(5),
    blockedUsers: z.array(z.string()).default([]),
    activityLogsEnabled: z.boolean().default(true)
  }),
  localization: z.object({
    supportedLanguages: z.array(z.string()).default(['fr', 'en', 'sg']),
    defaultLanguage: z.string().default('fr'),
    autoDetectLanguage: z.boolean().default(true)
  }),
  marketing: z.object({
    globalAnnouncement: z.string().default(''),
    promoCodesEnabled: z.boolean().default(true),
    referralProgramEnabled: z.boolean().default(true),
    seo: z.object({
      title: z.string().default('Ndara Afrique'),
      description: z.string().default('Plateforme d\'excellence')
    })
  }),
  finance: z.object({
    platformRevenuePercent: z.coerce.number().min(0).max(100).default(20),
    minWithdrawal: z.coerce.number().min(0).default(5000),
    withdrawalDelayDays: z.coerce.number().min(0).default(14),
    autoPayoutEnabled: z.boolean().default(false)
  }),
  advanced: z.object({
    apiKeys: z.record(z.string()).default({}),
    firebaseConfig: z.record(z.any()).default({}),
    webhookUrls: z.array(z.string()).default([]),
    debugMode: z.boolean().default(false)
  })
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
        general: { siteName: 'Ndara Afrique', defaultLanguage: 'fr', timezone: 'Africa/Douala' },
        payments: { paymentsEnabled: true, currency: 'XOF', transactionFeePercent: 10, paymentMode: 'test' },
        ai: { aiEnabled: true, modelName: 'gemini-1.5-flash', maxRequestsPerUser: 50 }
    }
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as Settings;
        // On fusionne les données reçues avec les valeurs par défaut pour éviter les champs vides
        form.reset(sanitizeForForm(d));
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db, form]);

  const sanitizeForForm = (data: any) => {
      // S'assure que les objets imbriqués existent pour éviter les erreurs React Hook Form
      const sections = ['general', 'payments', 'users', 'courses', 'marketplace', 'ai', 'notifications', 'security', 'localization', 'marketing', 'finance', 'advanced'];
      const sanitized = { ...data };
      sections.forEach(s => {
          if (!sanitized[s]) sanitized[s] = {};
      });
      return sanitized;
  };

  const onSubmit = async (values: SettingsValues) => {
    if (!currentUser) return;
    setIsSaving(true);
    
    try {
      const result = await updateGlobalSettings({ 
        adminId: currentUser.uid, 
        settings: values as any,
        section: activeTab as keyof Settings 
      });
      
      if (result.success) {
        toast({ title: "Modifications enregistrées", description: `Le module ${activeTab} a été mis à jour.` });
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Erreur de sauvegarde", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const onValidationError = (errors: any) => {
      console.error("Validation Errors:", errors);
      toast({ 
          variant: 'destructive', 
          title: "Formulaire invalide", 
          description: "Vérifiez les champs en rouge. Certains formats ne sont pas respectés." 
      });
  };

  const menuItems = [
    { id: 'general', label: 'Général', icon: Globe },
    { id: 'payments', label: 'Paiements', icon: CreditCard },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'courses', label: 'Cours', icon: BookOpen },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'ai', label: 'IA Mathias', icon: Cpu },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'localization', label: 'Localisation', icon: MapPin },
    { id: 'marketing', label: 'Marketing', icon: TrendingUp },
    { id: 'finance', label: 'Finance', icon: Landmark },
    { id: 'advanced', label: 'Avancé', icon: Zap },
  ];

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-[#0f172a]"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0f172a] text-white -m-6 p-0">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onValidationError)} className="flex flex-col lg:flex-row w-full">
          
          <aside className="w-full lg:w-72 bg-slate-900 border-b lg:border-b-0 lg:border-r border-white/5 lg:h-screen lg:sticky lg:top-0 z-20">
            <div className="p-6 lg:pb-10 hidden lg:flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <SettingsIcon className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="font-black uppercase text-sm tracking-tighter">Réglages</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pilotage Central</p>
                </div>
            </div>
            
            <nav className="flex lg:flex-col overflow-x-auto lg:overflow-y-auto hide-scrollbar p-4 lg:p-0 lg:space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex-shrink-0 lg:flex-shrink-1 flex items-center gap-3 px-5 py-3 lg:px-6 lg:py-3.5 rounded-2xl lg:rounded-none lg:mx-0 text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === item.id 
                        ? 'bg-primary text-slate-950 shadow-lg lg:shadow-none' 
                        : 'text-slate-500 hover:text-slate-200'
                  )}
                >
                  <item.icon size={16} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1 p-6 lg:p-12 pb-48 lg:pb-32 overflow-y-auto relative bg-[#0f172a]">
            <header className="mb-10 lg:mb-12 flex items-end justify-between border-b border-white/5 pb-6 lg:pb-8">
                <div>
                    <h2 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter mb-1">
                        {menuItems.find(i => i.id === activeTab)?.label}
                    </h2>
                    <p className="text-slate-500 text-[10px] lg:text-sm font-medium italic">
                        Configuration du module <span className="text-primary font-bold">{activeTab}</span>.
                    </p>
                </div>
                <Badge variant="outline" className="border-primary/20 text-primary font-black text-[10px] px-3 py-1">SECURED</Badge>
            </header>

            <div className="max-w-4xl space-y-10">
              
              {activeTab === 'general' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-8 shadow-2xl">
                  <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="general.siteName" render={({ field }) => (
                          <FormItem><FormLabel>Nom de la plateforme</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800" /></FormControl><FormMessage /></FormItem>
                      )}/>
                      <FormField control={form.control} name="general.defaultLanguage" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Langue système</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger className="h-12 bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                      <SelectItem value="fr">Français (🇨🇲)</SelectItem>
                                      <SelectItem value="en">English (🇺🇸)</SelectItem>
                                      <SelectItem value="sg">Sango (🇨🇫)</SelectItem>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                      )}/>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="general.contactPhone" render={({ field }) => (
                          <FormItem><FormLabel>Téléphone Support</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                      <FormField control={form.control} name="general.contactEmail" render={({ field }) => (
                          <FormItem><FormLabel>Email Administratif</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                  </div>
                </Card>
              )}

              {activeTab === 'payments' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-8">
                  <FormField control={form.control} name="payments.paymentsEnabled" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-6 bg-slate-950 rounded-2xl border border-white/5">
                          <div className="space-y-1">
                              <FormLabel className="text-base">Accepter les paiements</FormLabel>
                              <FormDescription className="text-[10px]">Active ou désactive tout le tunnel d'achat.</FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" /></FormControl>
                      </FormItem>
                  )}/>
                  <div className="grid md:grid-cols-3 gap-6">
                      <FormField control={form.control} name="payments.currency" render={({ field }) => (
                          <FormItem><FormLabel>Devise</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 font-bold" /></FormControl></FormItem>
                      )}/>
                      <FormField control={form.control} name="payments.transactionFeePercent" render={({ field }) => (
                          <FormItem><FormLabel>Frais Platforme (%)</FormLabel><FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800 font-bold text-primary" /></FormControl></FormItem>
                      )}/>
                      <FormField control={form.control} name="payments.paymentMode" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Mode de Passerelle</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger className="h-12 bg-slate-950 border-slate-800 font-black"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                      <SelectItem value="test">🧪 SIMULATION (TEST)</SelectItem>
                                      <SelectItem value="live">⚡ PRODUCTION (RÉEL)</SelectItem>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                      )}/>
                  </div>
                </Card>
              )}

              {activeTab === 'users' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-6">
                  <FormField control={form.control} name="users.allowRegistration" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                          <FormLabel>Inscriptions ouvertes</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="users.allowInstructorSignup" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                          <FormLabel>Recrutement Experts</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="users.autoApproveInstructors" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                          <FormLabel>Validation automatique</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                </Card>
              )}

              {activeTab === 'ai' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-8 shadow-2xl">
                  <FormField control={form.control} name="ai.aiEnabled" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-6 bg-slate-950 rounded-2xl border border-primary/10">
                          <FormLabel className="text-lg font-black text-primary uppercase">Moteurs MATHIAS</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" /></FormControl>
                      </FormItem>
                  )}/>
                  <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="ai.modelName" render={({ field }) => (
                          <FormItem><FormLabel>Modèle IA (LLM)</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 font-mono" /></FormControl></FormItem>
                      )}/>
                      <FormField control={form.control} name="ai.maxRequestsPerUser" render={({ field }) => (
                          <FormItem><FormLabel>Limite Requêtes / Jour</FormLabel><FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                  </div>
                </Card>
              )}

              {activeTab === 'security' && (
                <Card className="bg-slate-900 border-red-500/20 rounded-3xl p-6 lg:p-8 space-y-8">
                  <FormField control={form.control} name="security.maintenanceMode" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-6 bg-red-500/5 rounded-2xl border border-red-500/20">
                          <div className="flex items-center gap-3">
                              <ShieldAlert className="text-red-500 h-6 w-6"/>
                              <FormLabel className="text-lg font-black text-red-500 uppercase">Mode Maintenance</FormLabel>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-red-500" /></FormControl>
                      </FormItem>
                  )}/>
                </Card>
              )}

              {/* Les autres onglets affichent un message de disponibilité */}
              {!['general', 'payments', 'users', 'ai', 'security'].includes(activeTab) && (
                  <div className="py-20 text-center space-y-4 opacity-40">
                      <AlertCircle className="h-12 w-12 mx-auto" />
                      <p className="text-sm font-black uppercase tracking-widest">Configuration disponible prochainement</p>
                  </div>
              )}

            </div>

            <div className="fixed bottom-20 lg:bottom-0 left-0 lg:left-72 right-0 p-4 lg:p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                <div className="hidden sm:flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                    <Shield className="h-3 w-3" /> SECURED BY NDARA-OS
                </div>
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex-1 lg:flex-none bg-primary hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs px-8 lg:px-12 h-14 rounded-2xl transition-all active:scale-95 shadow-2xl shadow-primary/20"
                >
                  {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 size={16} className="mr-2" />}
                  Sauvegarder {activeTab}
                </Button>
              </div>
            </div>
          </main>
        </form>
      </Form>
    </div>
  );
}
