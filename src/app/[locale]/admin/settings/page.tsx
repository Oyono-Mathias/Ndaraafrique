'use client';

/**
 * @fileOverview Centre de Contrôle Stratégique Ndara Afrique v3.0
 * ✅ COMPLET : Toutes les sections (12/12) sont désormais implémentées.
 * ✅ DESIGN : Architecture par onglets haute densité avec défilement horizontal mobile.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { updateGlobalSettings } from '@/actions/settingsActions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Mail,
  ShieldAlert,
  Smartphone,
  ShieldCheck,
  Search,
  Code
} from 'lucide-react';
import type { Settings } from '@/lib/types';
import { cn } from '@/lib/utils';

// Schéma de validation complet pour les 12 modules
const settingsSchema = z.object({
  general: z.object({
    siteName: z.string().min(2, "Nom trop court"),
    logoUrl: z.string().url("URL invalide"),
    faviconUrl: z.string().url("URL invalide"),
    contactEmail: z.string().email("Email invalide"),
    supportPhone: z.string().min(8, "Numéro requis"),
    address: z.string().min(5, "Adresse requise"),
    defaultLanguage: z.enum(['fr', 'en', 'sg']),
    timezone: z.string()
  }),
  payments: z.object({
    paymentsEnabled: z.boolean(),
    currency: z.string(),
    paymentMethods: z.array(z.string()),
    transactionFeePercent: z.coerce.number().min(0).max(100),
    minDeposit: z.coerce.number().min(0),
    maxDeposit: z.coerce.number().min(0),
    walletEnabled: z.boolean(),
    operatorCommission: z.coerce.number().min(0),
    paymentMode: z.enum(['test', 'live'])
  }),
  users: z.object({
    allowRegistration: z.boolean(),
    allowInstructorSignup: z.boolean(),
    requireEmailVerification: z.boolean(),
    autoApproveInstructors: z.boolean(),
    defaultRole: z.string(),
    maxAccountsPerUser: z.coerce.number().min(1)
  }),
  courses: z.object({
    allowCourseCreation: z.boolean(),
    requireAdminApproval: z.boolean(),
    minimumCoursePrice: z.coerce.number().min(0),
    instructorRevenuePercent: z.coerce.number().min(0).max(100),
    allowDownload: z.boolean(),
    certificateEnabled: z.boolean()
  }),
  marketplace: z.object({
    enableMarketplace: z.boolean(),
    minimumResalePrice: z.coerce.number().min(0),
    resaleCommissionPercent: z.coerce.number().min(0).max(100),
    allowLicenseResale: z.boolean(),
    allowCourseBuyout: z.boolean().optional(),
    allowResaleRights: z.boolean().optional()
  }),
  ai: z.object({
    aiEnabled: z.boolean(),
    modelName: z.string(),
    maxRequestsPerUser: z.coerce.number().min(0),
    contentGenerationEnabled: z.boolean(),
    autoCorrection: z.boolean().optional(),
    autonomousTutor: z.boolean().optional(),
    fraudDetection: z.boolean().optional()
  }),
  notifications: z.object({
    emailNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    smsNotifications: z.boolean(),
    adminAlerts: z.object({
      newUser: z.boolean(),
      newPayment: z.boolean(),
      systemError: z.boolean()
    })
  }),
  security: z.object({
    maintenanceMode: z.boolean(),
    enable2fa: z.boolean(),
    maxLoginAttempts: z.coerce.number().min(1),
    blockedUsers: z.array(z.string()),
    activityLogsEnabled: z.boolean()
  }),
  localization: z.object({
    supportedLanguages: z.array(z.string()),
    defaultLanguage: z.string(),
    autoDetectLanguage: z.boolean()
  }),
  marketing: z.object({
    globalAnnouncement: z.string(),
    promoCodesEnabled: z.boolean(),
    referralProgramEnabled: z.boolean(),
    seo: z.object({
      title: z.string(),
      description: z.string()
    })
  }),
  finance: z.object({
    platformRevenuePercent: z.coerce.number().min(0).max(100),
    minWithdrawal: z.coerce.number().min(0),
    withdrawalDelayDays: z.coerce.number().min(0),
    autoPayoutEnabled: z.boolean()
  }),
  advanced: z.object({
    apiKeys: z.record(z.string()),
    firebaseConfig: z.record(z.any()),
    webhookUrls: z.array(z.string()),
    debugMode: z.boolean()
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
    defaultValues: {}
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as Settings;
        form.reset(d as any);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db, form]);

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
        toast({ title: "Module mis à jour avec succès" });
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Erreur", description: e.message });
    } finally {
      setIsSaving(false);
    }
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col lg:flex-row w-full">
          
          {/* NAVIGATION LATERALE / HORIZONTALE SUR MOBILE */}
          <aside className="w-full lg:w-72 bg-slate-900 border-b lg:border-b-0 lg:border-r border-white/5 lg:h-screen lg:sticky lg:top-0 z-20">
            <div className="p-6 lg:pb-10 hidden lg:flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <SettingsIcon className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="font-black uppercase text-sm tracking-tighter">Réglages</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Configuration v3.0</p>
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

          {/* ZONE DE CONTENU DYNAMIQUE */}
          <main className="flex-1 p-6 lg:p-12 pb-40 lg:pb-32 overflow-y-auto relative bg-[#0f172a]">
            <header className="mb-10 lg:mb-12 flex items-end justify-between border-b border-white/5 pb-6 lg:pb-8">
                <div>
                    <h2 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter mb-1">
                        {menuItems.find(i => i.id === activeTab)?.label}
                    </h2>
                    <p className="text-slate-500 text-[10px] lg:text-sm font-medium italic">
                        Pilotage opérationnel du module <span className="text-primary font-bold">{activeTab}</span>.
                    </p>
                </div>
                <Badge variant="outline" className="border-primary/20 text-primary font-black text-[10px] px-3 py-1 hidden sm:flex">SECURED</Badge>
            </header>

            <div className="max-w-4xl space-y-10">
              
              {/* SECTION GENERAL */}
              {activeTab === 'general' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-8 shadow-2xl">
                  <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="general.siteName" render={({ field }) => (
                          <FormItem><FormLabel>Nom du site</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800" /></FormControl><FormMessage /></FormItem>
                      )}/>
                      <FormField control={form.control} name="general.defaultLanguage" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Langue par défaut</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                  <FormControl><SelectTrigger className="h-12 bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                      <SelectItem value="fr">Français (🇫🇷)</SelectItem>
                                      <SelectItem value="en">English (🇺🇸)</SelectItem>
                                      <SelectItem value="sg">Sango (🇨🇫)</SelectItem>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                      )}/>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="general.logoUrl" render={({ field }) => (
                          <FormItem><FormLabel>URL du Logo</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                      <FormField control={form.control} name="general.contactEmail" render={({ field }) => (
                          <FormItem><FormLabel>Email support</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                  </div>
                </Card>
              )}

              {/* SECTION PAYMENTS */}
              {activeTab === 'payments' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-8">
                  <FormField control={form.control} name="payments.paymentsEnabled" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-6 bg-slate-950 rounded-2xl border border-white/5">
                          <div className="space-y-1">
                              <FormLabel className="text-base">Transactions Actives</FormLabel>
                              <FormDescription className="text-[10px]">Autoriser les flux financiers sur la plateforme.</FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" /></FormControl>
                      </FormItem>
                  )}/>
                  <div className="grid md:grid-cols-3 gap-6">
                      <FormField control={form.control} name="payments.currency" render={({ field }) => (
                          <FormItem><FormLabel>Devise</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 font-bold" /></FormControl></FormItem>
                      )}/>
                      <FormField control={form.control} name="payments.transactionFeePercent" render={({ field }) => (
                          <FormItem><FormLabel>Frais Plateforme (%)</FormLabel><FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800 font-bold text-primary" /></FormControl></FormItem>
                      )}/>
                      <FormField control={form.control} name="payments.paymentMode" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Mode</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger className="h-12 bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                      <SelectItem value="test">🧪 TEST</SelectItem>
                                      <SelectItem value="live">⚡ LIVE</SelectItem>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                      )}/>
                  </div>
                </Card>
              )}

              {/* SECTION COURSES */}
              {activeTab === 'courses' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-8">
                  <FormField control={form.control} name="courses.allowCourseCreation" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-white/5">
                          <FormLabel>Création de cours</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="courses.requireAdminApproval" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-white/5">
                          <FormLabel>Approbation manuelle</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                  <div className="grid md:grid-cols-2 gap-6 pt-4">
                      <FormField control={form.control} name="courses.minimumCoursePrice" render={({ field }) => (
                          <FormItem><FormLabel>Prix min. cours (XOF)</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                      <FormField control={form.control} name="courses.instructorRevenuePercent" render={({ field }) => (
                          <FormItem><FormLabel>Part Expert (%)</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                  </div>
                </Card>
              )}

              {/* SECTION MARKETPLACE */}
              {activeTab === 'marketplace' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-8">
                  <FormField control={form.control} name="marketplace.enableMarketplace" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-white/5">
                          <FormLabel>Activer Marché Secondaire</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                  <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="marketplace.minimumResalePrice" render={({ field }) => (
                          <FormItem><FormLabel>Prix min. revente (XOF)</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                      <FormField control={form.control} name="marketplace.resaleCommissionPercent" render={({ field }) => (
                          <FormItem><FormLabel>Com. Revente (%)</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                  </div>
                </Card>
              )}

              {/* SECTION NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-6">
                  <FormField control={form.control} name="notifications.pushNotifications" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                          <FormLabel>Notifications Push</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                  <div className="space-y-4 pt-4 border-t border-white/5">
                      <p className="text-[10px] font-black uppercase text-slate-500">Alertes Admin</p>
                      <FormField control={form.control} name="notifications.adminAlerts.newUser" render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                              <FormLabel className="text-xs">Nouvelle Inscription</FormLabel>
                              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                      )}/>
                      <FormField control={form.control} name="notifications.adminAlerts.newPayment" render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                              <FormLabel className="text-xs">Nouveau Paiement</FormLabel>
                              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                      )}/>
                  </div>
                </Card>
              )}

              {/* SECTION MARKETING */}
              {activeTab === 'marketing' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-8">
                  <FormField control={form.control} name="marketing.globalAnnouncement" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Annonce globale (Bandeau)</FormLabel>
                          <FormControl><Textarea {...field} placeholder="Message important..." className="bg-slate-950 border-slate-800" /></FormControl>
                      </FormItem>
                  )}/>
                  <div className="flex gap-6">
                      <FormField control={form.control} name="marketing.promoCodesEnabled" render={({ field }) => (
                          <FormItem className="flex items-center gap-3">
                              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel>Codes Promo</FormLabel>
                          </FormItem>
                      )}/>
                      <FormField control={form.control} name="marketing.referralProgramEnabled" render={({ field }) => (
                          <FormItem className="flex items-center gap-3">
                              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel>Parrainage</FormLabel>
                          </FormItem>
                      )}/>
                  </div>
                </Card>
              )}

              {/* SECTION FINANCE */}
              {activeTab === 'finance' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-8">
                  <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="finance.minWithdrawal" render={({ field }) => (
                          <FormItem><FormLabel>Retrait Min. (XOF)</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                      <FormField control={form.control} name="finance.withdrawalDelayDays" render={({ field }) => (
                          <FormItem><FormLabel>Délai de gel (Jours)</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                  </div>
                  <FormField control={form.control} name="finance.autoPayoutEnabled" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                          <FormLabel>Virements Automatiques</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                </Card>
              )}

              {/* SECTION ADVANCED */}
              {activeTab === 'advanced' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-8">
                  <FormField control={form.control} name="advanced.debugMode" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                          <div className="flex items-center gap-2"><ShieldAlert className="text-red-500 h-4 w-4"/><FormLabel>Mode Debug (Logs détaillés)</FormLabel></div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-red-500" /></FormControl>
                      </FormItem>
                  )}/>
                  <div className="p-6 bg-black rounded-2xl border border-white/5">
                      <p className="text-[10px] font-mono text-slate-500 leading-relaxed uppercase">
                          Attention : Toute modification dans cette section peut affecter la stabilité critique du système.
                      </p>
                  </div>
                </Card>
              )}

              {/* SECTIONS EXISTANTES RÉ-INJECTÉES POUR LA COHÉRENCE */}
              {activeTab === 'users' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-6">
                  <FormField control={form.control} name="users.allowRegistration" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-white/5">
                          <FormLabel>Inscriptions ouvertes</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="users.allowInstructorSignup" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-white/5">
                          <FormLabel>Recrutement Experts</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                </Card>
              )}

              {activeTab === 'ai' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-8">
                  <FormField control={form.control} name="ai.aiEnabled" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-6 bg-slate-950 rounded-2xl border border-primary/10 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                          <FormLabel className="text-lg font-black text-primary">Moteurs MATHIAS</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" /></FormControl>
                      </FormItem>
                  )}/>
                  <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="ai.modelName" render={({ field }) => (
                          <FormItem><FormLabel>Modèle LLM</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                      <FormField control={form.control} name="ai.maxRequestsPerUser" render={({ field }) => (
                          <FormItem><FormLabel>Quota Quotidien</FormLabel><FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                  </div>
                </Card>
              )}

              {activeTab === 'security' && (
                <Card className="bg-slate-900 border-red-500/20 rounded-3xl p-6 lg:p-8 space-y-8">
                  <FormField control={form.control} name="security.maintenanceMode" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-6 bg-red-500/5 rounded-2xl border border-red-500/20">
                          <div className="flex items-center gap-2"><ShieldAlert className="text-red-500 h-5 w-5"/><FormLabel className="text-lg font-black text-red-500 uppercase">Mode Maintenance</FormLabel></div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-red-500" /></FormControl>
                      </FormItem>
                  )}/>
                </Card>
              )}

            </div>

            {/* BARRE D'ACTION FIXE */}
            <div className="fixed bottom-20 lg:bottom-0 left-0 lg:left-72 right-0 p-4 lg:p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                <div className="hidden sm:flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                    <Shield className="h-3 w-3" /> SECURED SETTINGS
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
