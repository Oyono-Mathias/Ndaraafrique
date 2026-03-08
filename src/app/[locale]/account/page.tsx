'use client';

/**
 * @fileOverview Mon Profil - Identification Ndara Afrique.
 * ✅ RÉSOLU : Harmonisation Schéma pour débloquer le bouton Enregistrer.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfileAction } from '@/actions/userActions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, KeyRound, LogOut, Camera, CheckCircle2, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { Card } from '@/components/ui/card';

const accountSchema = z.object({
  username: z.string().min(3, "Min. 3 caractères.").max(20).regex(/^[a-zA-Z0-9_]+$/, "Lettres, chiffres et _ uniquement."),
  fullName: z.string().min(3, "Nom requis."),
  bio: z.string().max(500).optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  interestDomain: z.string().min(2, "Domaine requis."),
  linkedin: z.string().url("URL invalide").or(z.literal('')).optional(),
  twitter: z.string().url("URL invalide").or(z.literal('')).optional(),
  website: z.string().url("URL invalide").or(z.literal('')).optional(),
});

export default function AccountPage() {
  const { currentUser, isUserLoading, secureSignOut, user } = useRole();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
        username: '',
        fullName: '',
        bio: '',
        phoneNumber: '',
        interestDomain: '',
        linkedin: '',
        twitter: '',
        website: '',
    }
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
      toast({ title: "E-mail envoyé !", description: "Suivez les instructions envoyées." });
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible d'envoyer l'e-mail." });
    }
  }, [currentUser, toast]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = async (croppedFile: File) => {
    if (!user) return;
    setSelectedImage(null);
    setIsUploading(true);

    try {
        const formData = new FormData();
        formData.append('file', croppedFile);
        formData.append('userId', user.uid);
        formData.append('folder', 'avatars');

        const response = await fetch('/api/storage/upload', { method: 'POST', body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        await updateUserProfileAction({ userId: user.uid, data: { profilePictureURL: data.url }, requesterId: user.uid });
        toast({ title: "Photo mise à jour !" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Échec", description: error.message });
    } finally {
        setIsUploading(false);
    }
  };

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
    <div className="max-w-2xl mx-auto space-y-8 pb-32 bg-grainy min-h-screen">
      {selectedImage && <ImageCropper image={selectedImage} onCropComplete={onCropComplete} onClose={() => setSelectedImage(null)} />}

      <header className="px-4 pt-12 text-center space-y-6 flex flex-col items-center">
          <div className="relative group">
            <Avatar className="h-32 w-32 border-4 border-slate-900 shadow-2xl relative">
              <AvatarImage src={currentUser.profilePictureURL} className="object-cover" />
              <AvatarFallback className="bg-slate-800 text-4xl font-black text-slate-500">{currentUser.fullName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileSelect} />
            <Button size="icon" className="absolute bottom-1 right-1 h-10 w-10 rounded-full shadow-xl bg-primary hover:bg-primary/90 border-4 border-slate-950" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </Button>
          </div>
          <div><h1 className="text-3xl font-black text-white uppercase tracking-tight">Mon Identité</h1></div>
      </header>

      <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 px-4">
              <div className="grid gap-6">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nom Complet</FormLabel>
                          <FormControl><Input {...field} className="h-12 bg-slate-900 border-slate-800 rounded-xl text-white" /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="username" render={({ field }) => (
                      <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nom d'utilisateur</FormLabel>
                          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl pl-4 overflow-hidden">
                            <span className="text-primary font-bold">@</span>
                            <FormControl><Input {...field} className="border-none bg-transparent focus-visible:ring-0 h-12 text-white" /></FormControl>
                          </div>
                          <FormMessage />
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="interestDomain" render={({ field }) => (
                      <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Domaine d'expertise</FormLabel>
                          <FormControl><Input placeholder="Finance, Agriculture, Code..." {...field} className="h-12 bg-slate-900 border-slate-800 rounded-xl text-white" /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="bio" render={({ field }) => (
                      <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Biographie</FormLabel>
                          <FormControl><Textarea {...field} rows={4} className="bg-slate-900 border-slate-800 rounded-xl text-white resize-none" /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )}/>
              </div>
              <Button type="submit" disabled={isSaving} className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98]">
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Enregistrer les changements</>}
              </Button>
          </form>
      </Form>
    </div>
  );
}
