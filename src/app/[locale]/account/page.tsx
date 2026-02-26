'use client';

/**
 * @fileOverview Page "Mon Compte" - Pivot central de l'identité Ndara.
 * Gère le profil public, la bio, les liens sociaux et la photo de profil (Upload + Galerie Avatars).
 */

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfileAction } from '@/actions/userActions';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, KeyRound, Globe, Camera, LogOut, Linkedin, Link as LinkIcon, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const domains = [
    "Développement Web",
    "Intelligence Artificielle",
    "Design UI/UX",
    "Marketing Digital",
    "Entrepreneuriat",
    "AgriTech",
    "Autre"
];

const PRESET_AVATARS = [
    { id: 'av1', url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Felix' },
    { id: 'av2', url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Aneka' },
    { id: 'av3', url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Buddy' },
    { id: 'av4', url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Molly' },
    { id: 'av5', url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Jasper' },
    { id: 'av6', url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Luna' },
    { id: 'av7', url: 'https://api.dicebear.com/8.x/bottts/svg?seed=NdaraBot1' },
    { id: 'av8', url: 'https://api.dicebear.com/8.x/bottts/svg?seed=NdaraBot2' },
    { id: 'av9', url: 'https://api.dicebear.com/8.x/adventurer/svg?seed=Adventure1' },
    { id: 'av10', url: 'https://api.dicebear.com/8.x/adventurer/svg?seed=Adventure2' },
    { id: 'av11', url: 'https://api.dicebear.com/8.x/notionists/svg?seed=Ndara1' },
    { id: 'av12', url: 'https://api.dicebear.com/8.x/notionists/svg?seed=Ndara2' },
];

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
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleImageClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleAvatarSelect = async (url: string) => {
    if (!currentUser || isUploading) return;
    setIsUploading(true);
    setIsAvatarModalOpen(false);

    try {
        const result = await updateUserProfileAction({
            userId: currentUser.uid,
            data: { profilePictureURL: url },
            requesterId: currentUser.uid
        });

        if (result.success) {
            toast({ title: "Avatar mis à jour !" });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Échec de la mise à jour" });
    } finally {
        setIsUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !firebaseApp) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: "Fichier invalide", description: "Veuillez sélectionner une image." });
        return;
    }

    setIsUploading(true);
    const storage = getStorage(firebaseApp);
    const fileName = `avatars/${currentUser.uid}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const storageRef = ref(storage, fileName);
    
    try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        const result = await updateUserProfileAction({
            userId: currentUser.uid,
            data: { profilePictureURL: downloadURL },
            requesterId: currentUser.uid
        });

        if (result.success) {
            toast({ title: "Photo mise à jour" });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        console.error("Upload Error:", error);
        toast({ variant: 'destructive', title: "Échec du téléchargement" });
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (values: z.infer<typeof accountSchema>) => {
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
            'socialLinks.twitter': values.twitter,
            'socialLinks.website': values.website,
            isProfileComplete: !!(values.username && values.interestDomain)
        };

        const result = await updateUserProfileAction({
            userId: currentUser.uid,
            data: payload,
            requesterId: currentUser.uid
        });

        if (result.success) {
            toast({ title: "Profil mis à jour !" });
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
        toast({ variant: 'destructive', title: "Erreur technique" });
    }
  };

  if (isUserLoading || !currentUser) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-24 bg-grainy min-h-screen">
      <header className="px-4 pt-8 text-center space-y-2">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Mon Identité</h1>
          <p className="text-slate-500 text-sm font-medium">Gérez votre présence sur la plateforme Ndara.</p>
      </header>

      <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-900 border-b border-slate-800 p-0 rounded-none h-14">
              <TabsTrigger value="profile" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none font-bold uppercase text-[10px] tracking-widest">Profil Public</TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none font-bold uppercase text-[10px] tracking-widest">Sécurité</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-8 px-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                      <div className="flex flex-col items-center gap-6">
                          <div className="relative group cursor-pointer" onClick={handleImageClick}>
                              <Avatar className="h-32 w-32 border-4 border-slate-800 shadow-2xl transition-transform group-hover:scale-105">
                                  <AvatarImage src={currentUser.profilePictureURL} className="object-cover" />
                                  <AvatarFallback className="text-3xl bg-slate-800 text-slate-500 font-black">{currentUser.fullName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              {isUploading && (
                                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center z-20">
                                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                                  </div>
                              )}
                              <div className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-primary shadow-xl border-4 border-slate-950 flex items-center justify-center text-white">
                                  <Camera className="h-5 w-5" />
                              </div>
                              <input 
                                  type="file" 
                                  ref={fileInputRef} 
                                  className="hidden" 
                                  accept="image/*" 
                                  onChange={handleImageUpload} 
                                  disabled={isUploading}
                              />
                          </div>
                          
                          <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
                              <DialogTrigger asChild>
                                  <Button variant="outline" className="rounded-xl border-slate-800 h-10 px-6 font-bold uppercase text-[10px] tracking-widest gap-2">
                                      <ImageIcon className="h-4 w-4" />
                                      Choisir un avatar Ndara
                                  </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-slate-900 border-slate-800 max-w-md rounded-[2rem]">
                                  <DialogHeader>
                                      <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">Galerie d'Avatars</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 py-6">
                                      {PRESET_AVATARS.map((av) => (
                                          <button
                                              key={av.id}
                                              onClick={() => handleAvatarSelect(av.url)}
                                              className="relative aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-primary transition-all active:scale-90"
                                          >
                                              <img src={av.url} alt="Avatar" className="w-full h-full object-cover" />
                                          </button>
                                      ))}
                                  </div>
                              </DialogContent>
                          </Dialog>
                      </div>

                      <div className="grid gap-6">
                          <FormField control={form.control} name="fullName" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 ml-1">Nom Complet</FormLabel>
                                  <FormControl><Input {...field} className="h-12 bg-slate-900 border-slate-800 rounded-2xl" /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}/>

                          <div className="grid grid-cols-2 gap-4">
                              <FormField control={form.control} name="username" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 ml-1">Pseudo unique</FormLabel>
                                      <FormControl><Input {...field} className="h-12 bg-slate-900 border-slate-800 rounded-2xl" /></FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}/>
                              <FormField control={form.control} name="interestDomain" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 ml-1">Spécialité</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl><SelectTrigger className="h-12 bg-slate-900 border-slate-800 rounded-2xl"><SelectValue /></SelectTrigger></FormControl>
                                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                              {domains.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                      <FormMessage />
                                  </FormItem>
                              )}/>
                          </div>

                          <FormField control={form.control} name="bio" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 ml-1">Ma Biographie</FormLabel>
                                  <FormControl><Textarea {...field} rows={4} placeholder="Parlez-nous de vous..." className="bg-slate-900 border-slate-800 rounded-2xl resize-none p-4" /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}/>

                          <div className="space-y-4">
                              <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] ml-1 flex items-center gap-2">
                                  <Globe className="h-3 w-3" /> Réseaux Sociaux
                              </h3>
                              <div className="grid gap-3">
                                  <FormField control={form.control} name="linkedin" render={({ field }) => (
                                      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-1 pr-4">
                                          <div className="p-3 bg-blue-600/10 rounded-xl text-blue-400"><Linkedin className="h-4 w-4"/></div>
                                          <FormControl><Input {...field} placeholder="Lien LinkedIn" className="border-none bg-transparent focus-visible:ring-0 h-10" /></FormControl>
                                      </div>
                                  )}/>
                                  <FormField control={form.control} name="website" render={({ field }) => (
                                      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-1 pr-4">
                                          <div className="p-3 bg-primary/10 rounded-xl text-primary"><LinkIcon className="h-4 w-4"/></div>
                                          <FormControl><Input {...field} placeholder="Mon Site Web" className="border-none bg-transparent focus-visible:ring-0 h-10" /></FormControl>
                                      </div>
                                  )}/>
                              </div>
                          </div>
                      </div>

                      <Button type="submit" disabled={isSaving || isUploading} className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-[0.98]">
                          {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <><Sparkles className="mr-2 h-4 w-4" /> Mettre à jour mon profil</>}
                      </Button>
                  </form>
              </Form>
          </TabsContent>

          <TabsContent value="security" className="mt-8 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <section className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Compte & Accès</h3>
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-800 rounded-2xl text-slate-400"><KeyRound className="h-6 w-6"/></div>
                              <div><p className="text-sm font-bold text-white">Mot de passe</p><p className="text-[10px] text-slate-500 uppercase font-medium">Sécurité standard</p></div>
                          </div>
                          <Button variant="outline" size="sm" onClick={handlePasswordReset} className="rounded-xl border-slate-700 h-10 px-4 font-bold">Modifier</Button>
                      </div>
                      
                      <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><ShieldCheck className="h-6 w-6"/></div>
                              <div><p className="text-sm font-bold text-white">État du compte</p><Badge variant="success" className="text-[9px] uppercase">Vérifié</Badge></div>
                          </div>
                      </div>
                  </div>
              </section>

              <section className="pt-8">
                  <Button variant="destructive" className="w-full h-16 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all" onClick={secureSignOut}>
                      <LogOut className="mr-3 h-5 w-5" /> Se déconnecter
                  </Button>
                  <p className="text-center text-[9px] text-slate-600 font-black uppercase tracking-[0.3em] mt-6">Ndara Afrique Version 1.0.5</p>
              </section>
          </TabsContent>
      </Tabs>
    </div>
  );
}
