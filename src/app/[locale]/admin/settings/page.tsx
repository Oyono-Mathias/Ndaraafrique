'use client';

/**
 * @fileOverview Centre de Contrôle Stratégique Ndara Afrique v4.6
 * ✅ HYBRIDE : Configuration du stockage hybride (Bunny vs Firebase vs R2).
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
  Smartphone,
  ShieldAlert,
  HardDrive,
  Cloud
} from 'lucide-react';
import type { Settings } from '@/lib/types';
import { cn } from '@/lib/utils';

// Schéma de validation flexible
const settingsSchema = z.object({
  general: z.object({
    siteName: z.string().default('Ndara Afrique'),
    defaultLanguage: z.enum(['fr', 'en', 'sg']).default('fr'),
  }).optional(),
  storage: z.object({
    maxFileSizeMb: z.coerce.number().min(1).default(50),
    primaryProvider: z.enum(['bunny', 'firebase', 'r2']).default('r2'),
    userFilesProvider: z.literal('firebase'),
  }).optional(),
  appearance: z.object({
    primaryColor: z.string().default('#10b981'),
    borderRadius: z.enum(['none', 'md', 'lg', 'xl']).default('lg'),
  }).optional()
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
        const d = snap.data() as any;
        form.reset(d);
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
        toast({ title: "Configuration sauvegardée", description: `Le module ${activeTab} a été mis à jour.` });
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Erreur de sauvegarde", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const menuItems = [
    { id: 'general', label: 'Général', icon: Globe },
    { id: 'storage', label: 'Stockage Hybride', icon: HardDrive },
    { id: 'appearance', label: 'Apparence', icon: Zap },
  ];

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-[#0f172a]"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0f172a] text-white -m-6 p-0 font-sans">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col lg:flex-row w-full">
          
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
                <Badge variant="outline" className="border-primary/20 text-primary font-black text-[10px] px-3 py-1">HYBRID v6.0</Badge>
            </header>

            <div className="max-w-4xl space-y-10">
              
              {/* --- STOCKAGE --- */}
              {activeTab === 'storage' && (
                <Card className="bg-slate-900 border-white/5 rounded-3xl p-6 lg:p-8 space-y-8 shadow-2xl">
                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-4">
                        <Cloud className="text-blue-400 h-6 w-6 shrink-0 mt-1" />
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-white uppercase">Cloudflare R2 Integration</p>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium italic">
                                "Le stockage R2 élimine les frais de sortie (egress) et sécurise vos vidéos via des Presigned URLs générées à la volée."
                            </p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="storage.maxFileSizeMb" render={({ field }) => (
                          <FormItem><FormLabel>Taille max. fichier (MB)</FormLabel><FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800" /></FormControl></FormItem>
                      )}/>
                      <FormField control={form.control} name="storage.primaryProvider" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Diffuseur Principal (Contenu)</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger className="h-12 bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                      <SelectItem value="r2">⚡ Cloudflare R2 (Recommandé)</SelectItem>
                                      <SelectItem value="bunny">🐰 Bunny.net (Backup)</SelectItem>
                                      <SelectItem value="firebase">🔥 Firebase Storage</SelectItem>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                      )}/>
                    </div>

                    <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fournisseur Identité (Lock)</p>
                        <div className="flex items-center gap-3 text-emerald-500">
                            <CheckCircle2 size={16} />
                            <span className="text-sm font-bold">Firebase Cloud Storage (Personnel)</span>
                        </div>
                    </div>
                </Card>
              )}

              {/* --- GÉNÉRAL --- */}
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
                                      <SelectItem value="en">English (🇿🇦)</SelectItem>
                                      <SelectItem value="sg">Sango (🇨🇫)</SelectItem>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                      )}/>
                  </div>
                </Card>
              )}

            </div>

            <div className="fixed bottom-20 lg:bottom-0 left-0 lg:left-72 right-0 p-4 lg:p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 z-50">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex-1 lg:flex-none bg-primary hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs px-8 lg:px-12 h-14 rounded-2xl transition-all active:scale-95 shadow-2xl shadow-primary/20"
                >
                  {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 size={16} className="mr-2" />}
                  Valider la Configuration Cloud
                </Button>
              </div>
            </div>
          </main>
        </form>
      </Form>
    </div>
  );
}
