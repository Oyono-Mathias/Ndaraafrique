
'use client';

/**
 * @fileOverview Page "Mon Compte" - Pivot central de l'identité Ndara.
 * Gère le profil, la sécurité et l'apparence. Optimisé Android-First.
 */

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfileAction } from '@/actions/userActions';
import { useRouter } from 'next/navigation';

import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input/react-hook-form-input';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, ShieldCheck, Bell, KeyRound, Globe, Camera, CheckCircle2, ChevronRight, LogOut } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { cn } from '@/lib/utils';

const domains = [
    "Développement Web",
    "Intelligence Artificielle",
    "Design UI/UX",
    "Marketing Digital",
    "Entrepreneuriat",
    "AgriTech",
    "Autre"
];

const accountSchema = z.object({
  username: z.string().min(3, "Min. 3 caractères.").max(20).regex(/^[a-zA-Z0-9_]+$/),
  fullName: z.string().min(3, "Nom requis."),
  bio: z.string().max(500).optional(),
  phoneNumber: z.string().optional(),
  interestDomain: z.string().min(2, "Domaine requis."),
  linkedin: z.string().url().or(z.literal('')).optional(),
  website: z.string().url().or(z.literal('')).optional(),
});

export default function AccountPage() {
  const { currentUser, isUserLoading, secureSignOut } = useRole();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isSaving, setIsSaving] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({
        username: currentUser.username || '',
        fullName: currentUser.fullName || '',
        bio: currentUser.bio || '',
        phoneNumber: currentUser.phoneNumber || '',
        interestDomain: currentUser.careerGoals?.interestDomain || '',
        linkedin: currentUser.socialLinks?.linkedin || '',
        website: currentUser.socialLinks?.website || '',
      });
    }
  }, [currentUser, form]);

  const onProfileSubmit = async (values: z.infer<typeof accountSchema>) => {
    if (!currentUser) return;
    setIsSaving(true);
    
    try {
        const payload = {
            username: values.username,
            fullName: values.fullName,
            bio: values.bio,
            phoneNumber: values.phoneNumber,
            'careerGoals.interestDomain': values.interestDomain,
            'socialLinks.linkedin': values.linkedin,
            'socialLinks.website': values.website,
            isProfileComplete: !!(values.username && values.interestDomain)
        };

        const result = await updateUserProfileAction({
            userId: currentUser.uid,
            data: payload,
            requesterId: currentUser.uid
        });

        if (result.success) {
            toast({ title: "Profil mis à jour", description: "Vos informations ont été enregistrées." });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;
    try {
        await sendPasswordResetEmail(getAuth(), currentUser.email);
        toast({ title: "Email envoyé", description: "Vérifiez votre boîte de réception." });
    } catch (e) {
        toast({ variant: 'destructive', title: "Erreur" });
    }
  };

  if (isUserLoading || !currentUser) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-24">
      <ImageCropper image={imageToCrop} onCropComplete={() => {}} onClose={() => setImageToCrop(null)} />
      
      <header className="px-4 text-center space-y-2">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Paramètres</h1>
          <p className="text-slate-500 text-sm font-medium">Gérez votre identité et votre sécurité.</p>
      </header>

      <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-900 border-b border-slate-800 p-0 rounded-none h-14">
              <TabsTrigger value="profile" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none font-bold uppercase text-[10px] tracking-widest">Identité</TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none font-bold uppercase text-[10px] tracking-widest">Sécurité</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-8 px-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-8">
                      <div className="flex flex-col items-center gap-4">
                          <div className="relative group">
                              <Avatar className="h-28 w-28 border-4 border-slate-800 shadow-2xl">
                                  <AvatarImage src={currentUser.profilePictureURL} className="object-cover" />
                                  <AvatarFallback className="text-3xl bg-slate-800 text-slate-500 font-black">{currentUser.fullName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <Button size="icon" className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary shadow-xl border-4 border-slate-950" type="button">
                                  <Camera className="h-4 w-4" />
                              </Button>
                          </div>
                          <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Photo de profil</p>
                      </div>

                      <div className="grid gap-6">
                          <FormField control={form.control} name="fullName" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 ml-1">Nom Complet</FormLabel>
                                  <FormControl><Input {...field} className="h-14 bg-slate-900 border-slate-800 rounded-2xl" /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}/>

                          <div className="grid grid-cols-2 gap-4">
                              <FormField control={form.control} name="username" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 ml-1">Pseudo</FormLabel>
                                      <FormControl><Input {...field} className="h-14 bg-slate-900 border-slate-800 rounded-2xl" /></FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}/>
                              <FormField control={form.control} name="interestDomain" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 ml-1">Domaine</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl><SelectTrigger className="h-14 bg-slate-900 border-slate-800 rounded-2xl"><SelectValue /></SelectTrigger></FormControl>
                                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                              {domains.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                      <FormMessage />
                                  </FormItem>
                              )}/>
                          </div>

                          <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-slate-500 ml-1">Email (Privé)</FormLabel>
                              <Input value={currentUser.email} readOnly disabled className="h-14 bg-slate-950 border-slate-900 text-slate-600 rounded-2xl cursor-not-allowed" />
                          </FormItem>

                          <Controller control={form.control} name="phoneNumber" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 ml-1">Téléphone</FormLabel>
                                  <FormControl><PhoneInput {...field} defaultCountry="CM" international className="flex h-14 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-white" /></FormControl>
                                  <FormMessage/>
                              </FormItem>
                          )}/>

                          <FormField control={form.control} name="bio" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 ml-1">Ma Biographie</FormLabel>
                                  <FormControl><Textarea {...field} rows={4} className="bg-slate-900 border-slate-800 rounded-2xl resize-none p-4" /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}/>
                      </div>

                      <Button type="submit" disabled={isSaving} className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-[0.98]">
                          {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : "Sauvegarder mon profil"}
                      </Button>
                  </form>
              </Form>
          </TabsContent>

          <TabsContent value="security" className="mt-8 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <section className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Accès & Sécurité</h3>
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-800 rounded-2xl text-slate-400"><KeyRound className="h-6 w-6"/></div>
                              <div><p className="text-sm font-bold text-white">Mot de passe</p><p className="text-[10px] text-slate-500 uppercase font-medium">Dernière modif : Inconnue</p></div>
                          </div>
                          <Button variant="outline" size="sm" onClick={handlePasswordReset} className="rounded-xl border-slate-700 h-10 px-4 font-bold">Modifier</Button>
                      </div>
                      
                      <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><ShieldCheck className="h-6 w-6"/></div>
                              <div><p className="text-sm font-bold text-white">Validation 2FA</p><p className="text-[10px] text-emerald-500/60 uppercase font-black tracking-tighter">Bientôt disponible</p></div>
                          </div>
                      </div>
                  </div>
              </section>

              <section className="pt-8">
                  <Button variant="destructive" className="w-full h-16 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all" onClick={secureSignOut}>
                      <LogOut className="mr-3 h-5 w-5" /> Se déconnecter
                  </Button>
                  <p className="text-center text-[9px] text-slate-600 font-black uppercase tracking-[0.3em] mt-6">Ndara Afrique Version 1.0.4</p>
              </section>
          </TabsContent>
      </Tabs>
    </div>
  );
}
