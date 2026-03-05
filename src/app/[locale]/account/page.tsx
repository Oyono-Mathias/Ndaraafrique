
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfileAction } from '@/actions/userActions';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, KeyRound, Sparkles, LogOut } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const accountSchema = z.object({
  username: z.string().min(3, "Min. 3 caractères.").max(20).regex(/^[a-zA-Z0-9_]+$/),
  fullName: z.string().min(3, "Nom requis."),
  bio: z.string().max(500).optional(),
  phoneNumber: z.string().optional(),
  interestDomain: z.string().min(2, "Domaine requis."),
  linkedin: z.string().url("URL invalide").or(z.literal('')).optional(),
  twitter: z.string().url("URL invalide").or(z.literal('')).optional(),
  website: z.string().url("URL invalide").or(z.literal('')).optional(),
});

export default function AccountPage() {
  const { currentUser, isUserLoading, secureSignOut } = useRole();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
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
        twitter: currentUser.socialLinks?.twitter || '',
        website: currentUser.socialLinks?.website || '',
      });
    }
  }, [currentUser, form]);

  const handlePasswordReset = useCallback(async () => {
    if (!currentUser?.email) return;
    const auth = getAuth();
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      toast({ title: "E-mail envoyé !", description: "Suivez les instructions envoyées à votre adresse." });
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible d'envoyer l'e-mail." });
    }
  }, [currentUser, toast]);

  const onSubmit = async (values: z.infer<typeof accountSchema>) => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
        const result = await updateUserProfileAction({
            userId: currentUser.uid,
            data: {
                username: values.username,
                fullName: values.fullName,
                bio: values.bio,
                phoneNumber: values.phoneNumber,
                'careerGoals.interestDomain': values.interestDomain,
                'socialLinks.linkedin': values.linkedin,
                'socialLinks.twitter': values.twitter,
                'socialLinks.website': values.website,
                isProfileComplete: true
            },
            requesterId: currentUser.uid
        });
        if (result.success) toast({ title: "Profil mis à jour !" });
        else throw new Error(result.error);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading || !currentUser) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-24 bg-grainy min-h-screen">
      <header className="px-4 pt-8 text-center space-y-2">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Mon Identité</h1>
          <p className="text-slate-500 text-sm font-medium">Gérez votre présence sur Ndara Afrique.</p>
      </header>

      <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-900 border-b border-slate-800 p-0 rounded-none h-14">
              <TabsTrigger value="profile" className="font-bold uppercase text-[10px] tracking-widest">Profil Public</TabsTrigger>
              <TabsTrigger value="security" className="font-bold uppercase text-[10px] tracking-widest">Sécurité</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-8 px-4 animate-in fade-in slide-in-from-bottom-2">
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                      <div className="grid gap-6">
                          <FormField control={form.control} name="fullName" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-slate-500">Nom Complet</FormLabel>
                                  <FormControl><Input {...field} className="h-12 bg-slate-900 border-slate-800 rounded-2xl" /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}/>
                          <FormField control={form.control} name="bio" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-slate-500">Biographie</FormLabel>
                                  <FormControl><Textarea {...field} rows={4} className="bg-slate-900 border-slate-800 rounded-2xl" /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}/>
                      </div>
                      <Button type="submit" disabled={isSaving} className="w-full h-16 rounded-2xl bg-primary font-black uppercase text-xs tracking-widest shadow-2xl">
                          {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <><Sparkles className="mr-2 h-4 w-4" /> Enregistrer</>}
                      </Button>
                  </form>
              </Form>
          </TabsContent>

          <TabsContent value="security" className="mt-8 px-4 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-800 rounded-2xl text-slate-400"><KeyRound className="h-6 w-6"/></div>
                          <div><p className="text-sm font-bold text-white">Mot de passe</p><p className="text-[10px] text-slate-500 uppercase">Sécurité standard</p></div>
                      </div>
                      <Button variant="outline" size="sm" onClick={handlePasswordReset} className="rounded-xl border-slate-700 h-10 px-4 font-bold">Modifier</Button>
                  </div>
              </div>
              <Button variant="destructive" className="w-full h-16 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl" onClick={secureSignOut}>
                  <LogOut className="mr-3 h-5 w-5" /> Se déconnecter
              </Button>
          </TabsContent>
      </Tabs>
    </div>
  );
}
