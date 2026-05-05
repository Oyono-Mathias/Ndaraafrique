'use client';

/**
 * @fileOverview Centre de Contrôle Stratégique Ndara Afrique v7.1
 * ✅ FIX : Ajout du seuil de retrait minimal dans le module financier.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { updateGlobalSettings } from '@/actions/settingsActions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Settings as SettingsIcon, 
  Loader2, 
  CheckCircle2, 
  Globe, 
  Zap,
  HardDrive,
  CreditCard,
  Users,
  BookOpen,
  ShoppingCart,
  Bot,
  Bell,
  ShieldCheck,
  Megaphone,
  Palette
} from 'lucide-react';
import type { Settings } from '@/lib/types';
import { cn } from '@/lib/utils';

const settingsSchema = z.object({
  general: z.object({
    siteName: z.string().min(2),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
    defaultLanguage: z.enum(['fr', 'en', 'sg']),
  }),
  storage: z.object({
    maxFileSizeMb: z.coerce.number().min(1),
    videosProvider: z.enum(['r2', 'bunny', 'firebase']),
    documentsProvider: z.enum(['r2', 'bunny', 'firebase']),
    assetsProvider: z.enum(['r2', 'bunny', 'firebase']),
  }),
  payments: z.object({
    currency: z.string(),
    minDeposit: z.coerce.number(),
    minWithdrawal: z.coerce.number().min(100, "Le seuil est trop bas."),
    transactionFeePercent: z.coerce.number(),
    paymentsEnabled: z.boolean(),
  }),
  users: z.object({
    allowRegistration: z.boolean(),
    allowInstructorSignup: z.boolean(),
    autoApproveInstructors: z.boolean(),
  }),
  courses: z.object({
    allowCourseCreation: z.boolean(),
    requireAdminApproval: z.boolean(),
    instructorRevenuePercent: z.coerce.number(),
    certificateEnabled: z.boolean(),
  }),
  marketplace: z.object({
    enableMarketplace: z.boolean(),
    allowCourseBuyout: z.boolean(),
    allowResaleRights: z.boolean(),
    minimumResalePrice: z.coerce.number(),
    resaleCommissionPercent: z.coerce.number(),
  }),
  ai: z.object({
    aiEnabled: z.boolean(),
    autoCorrection: z.boolean(),
    autonomousTutor: z.boolean(),
    fraudDetection: z.boolean(),
  }),
  notifications: z.object({
    emailNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    adminAlerts: z.object({
      newUser: z.boolean(),
      newPayment: z.boolean(),
      systemError: z.boolean(),
    }),
  }),
  security: z.object({
    maintenanceMode: z.boolean(),
    activityLogsEnabled: z.boolean(),
  }),
  marketing: z.object({
    globalAnnouncement: z.string(),
    promoCodesEnabled: z.boolean(),
    referralProgramEnabled: z.boolean(),
  }),
  appearance: z.object({
    primaryColor: z.string(),
    borderRadius: z.enum(['none', 'md', 'lg', 'xl']),
  }),
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
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        form.reset(snap.data() as any);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db, form]);

  const onSubmit = async (values: SettingsValues) => {
    if (!currentUser) return;
    setIsSaving(true);
    
    const result = await updateGlobalSettings({ 
      adminId: currentUser.uid, 
      settings: values as any,
      section: activeTab as keyof Settings 
    });
    
    if (result.success) {
      toast({ title: "Module mis à jour", description: `La section ${activeTab} a été sauvegardée.` });
    } else {
      toast({ variant: 'destructive', title: "Erreur", description: result.error });
    }
    setIsSaving(false);
  };

  const menuItems = [
    { id: 'general', label: 'Général', icon: Globe },
    { id: 'storage', label: 'Stockage', icon: HardDrive },
    { id: 'payments', label: 'Finances', icon: CreditCard },
    { id: 'users', label: 'Membres', icon: Users },
    { id: 'courses', label: 'Pédagogie', icon: BookOpen },
    { id: 'marketplace', label: 'Bourse', icon: ShoppingCart },
    { id: 'ai', label: 'Mathias IA', icon: Bot },
    { id: 'notifications', label: 'Alertes', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: ShieldCheck },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'appearance', label: 'Apparence', icon: Palette },
  ];

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0f172a] text-white -m-6 p-0">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col lg:flex-row w-full">
          
          <aside className="w-full lg:w-64 bg-slate-900 border-r border-white/5 lg:h-screen lg:sticky lg:top-0">
            <div className="p-6 border-b border-white/5">
                <h1 className="font-black uppercase text-xs tracking-widest text-slate-500">Configuration</h1>
            </div>
            <nav className="flex lg:flex-col overflow-x-auto p-2 lg:p-0">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === item.id ? 'bg-primary text-slate-950' : 'text-slate-400 hover:bg-white/5'
                  )}
                >
                  <item.icon size={16} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1 p-6 lg:p-12 pb-32">
            <header className="mb-10 flex justify-between items-end border-b border-white/5 pb-8">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight">{menuItems.find(i => i.id === activeTab)?.label}</h2>
                    <p className="text-slate-500 text-sm italic">Pilotage du module {activeTab}.</p>
                </div>
                <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase text-[10px]">v2.5</Badge>
            </header>

            <div className="max-w-3xl space-y-8">
              
              {activeTab === 'general' && (
                <Card className="bg-slate-900 border-white/5 p-8 space-y-6">
                    <FormField control={form.control} name="general.siteName" render={({ field }) => (
                        <FormItem><FormLabel>Nom du site</FormLabel><FormControl><Input {...field} className="bg-slate-950 border-slate-800" /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <div className="grid grid-cols-2 gap-6">
                        <FormField control={form.control} name="general.contactEmail" render={({ field }) => (
                            <FormItem><FormLabel>Email Support</FormLabel><FormControl><Input {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                        )}/>
                        <FormField control={form.control} name="general.contactPhone" render={({ field }) => (
                            <FormItem><FormLabel>Phone Support</FormLabel><FormControl><Input {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                        )}/>
                    </div>
                </Card>
              )}

              {activeTab === 'storage' && (
                <Card className="bg-slate-900 border-white/5 p-8 space-y-8">
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="storage.videosProvider" render={({ field }) => (
                            <FormItem><FormLabel>Vidéos de Cours</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        <SelectItem value="r2">Cloudflare R2 (Zéro Egress)</SelectItem>
                                        <SelectItem value="bunny">Bunny.net CDN</SelectItem>
                                        <SelectItem value="firebase">Firebase Storage</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="storage.documentsProvider" render={({ field }) => (
                            <FormItem><FormLabel>Documents & PDF</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        <SelectItem value="r2">Cloudflare R2</SelectItem>
                                        <SelectItem value="bunny">Bunny.net CDN</SelectItem>
                                        <SelectItem value="firebase">Firebase Storage</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                    </div>
                    <FormField control={form.control} name="storage.maxFileSizeMb" render={({ field }) => (
                        <FormItem><FormLabel>Taille max. fichier (MB)</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                    )}/>
                </Card>
              )}

              {activeTab === 'payments' && (
                <Card className="bg-slate-900 border-white/5 p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <FormField control={form.control} name="payments.currency" render={({ field }) => (
                            <FormItem><FormLabel>Devise système</FormLabel><FormControl><Input {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                        )}/>
                        <FormField control={form.control} name="payments.minDeposit" render={({ field }) => (
                            <FormItem><FormLabel>Dépôt minimum</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                        )}/>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <FormField control={form.control} name="payments.minWithdrawal" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Seuil de retrait min. (XOF)</FormLabel>
                                <FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="payments.transactionFeePercent" render={({ field }) => (
                            <FormItem><FormLabel>Frais (%)</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-950 border-slate-800" /></FormControl></FormItem>
                        )}/>
                    </div>
                    <FormField control={form.control} name="payments.paymentsEnabled" render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                            <FormLabel>Activer les paiements réels</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                </Card>
              )}

              {activeTab === 'security' && (
                <Card className="bg-slate-900 border-white/5 p-8 space-y-6">
                    <FormField control={form.control} name="security.maintenanceMode" render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                            <div className="space-y-0.5"><FormLabel className="text-red-400">Mode Maintenance</FormLabel><FormDescription>Bloque l'accès aux étudiants.</FormDescription></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                </Card>
              )}

              {activeTab === 'ai' && (
                <Card className="bg-slate-900 border-white/5 p-8 space-y-6">
                    <FormField control={form.control} name="ai.aiEnabled" render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                            <FormLabel>Activer Mathias IA</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="ai.autoCorrection" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                                <FormLabel className="text-xs">Correction Auto</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="ai.fraudDetection" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                                <FormLabel className="text-xs">Audit Fraude</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}/>
                    </div>
                </Card>
              )}

            </div>

            <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 z-50">
              <Button 
                type="submit" 
                disabled={isSaving}
                className="w-full h-14 rounded-2xl bg-primary hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20"
              >
                {isSaving ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 size={16} className="mr-2" />}
                Valider les réglages {activeTab}
              </Button>
            </div>
          </main>
        </form>
      </Form>
    </div>
  );
}
