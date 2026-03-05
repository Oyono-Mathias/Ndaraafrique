'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfileAction } from '@/actions/userActions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Loader2, KeyRound, Sparkles, LogOut, Camera, User, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  const { currentUser, isUserLoading, secureSignOut, user } = useRole();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Cropper State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
    setUploadProgress(0);

    const storage = getStorage();
    const storageRef = ref(storage, `profiles/${user.uid}/avatar.webp`);
    const uploadTask = uploadBytesResumable(storageRef, croppedFile);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        toast({ variant: 'destructive', title: "Échec du téléversement", description: error.message });
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await updateUserProfileAction({
          userId: user.uid,
          data: { profilePictureURL: downloadURL },
          requesterId: user.uid
        });
        setIsUploading(false);
        toast({ title: "Photo mise à jour !" });
      }
    );
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
      {selectedImage && (
        <ImageCropper 
          image={selectedImage} 
          onCropComplete={onCropComplete} 
          onClose={() => setSelectedImage(null)} 
        />
      )}

      <header className="px-4 pt-12 text-center space-y-6 flex flex-col items-center">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-blue-400 rounded-full blur opacity-20" />
            <Avatar className="h-32 w-32 border-4 border-slate-900 shadow-2xl relative">
              <AvatarImage src={currentUser.profilePictureURL} className="object-cover" />
              <AvatarFallback className="bg-slate-800 text-4xl font-black text-slate-500">
                  {currentUser.fullName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={onFileSelect} 
            />
            
            <Button 
              size="icon" 
              className="absolute bottom-1 right-1 h-10 w-10 rounded-full shadow-xl bg-primary hover:bg-primary/90 border-4 border-slate-950"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </Button>

            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <span className="text-white text-xs font-black">{Math.round(uploadProgress)}%</span>
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Mon Identité</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Gérez votre présence sur Ndara Afrique.</p>
          </div>
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
                                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nom Complet</FormLabel>
                                  <FormControl><Input {...field} className="h-12 bg-slate-900 border-slate-800 rounded-2xl" /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}/>
                          <FormField control={form.control} name="username" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nom d'utilisateur</FormLabel>
                                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl pl-4 overflow-hidden">
                                    <span className="text-primary font-bold">@</span>
                                    <FormControl><Input {...field} className="border-none bg-transparent focus-visible:ring-0" /></FormControl>
                                  </div>
                                  <FormMessage />
                              </FormItem>
                          )}/>
                          <FormField control={form.control} name="interestDomain" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Votre domaine d'expertise</FormLabel>
                                  <FormControl><Input placeholder="Ex: Finance, Agriculture, Code..." {...field} className="h-12 bg-slate-900 border-slate-800 rounded-2xl" /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}/>
                          <FormField control={form.control} name="bio" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Biographie</FormLabel>
                                  <FormControl><Textarea {...field} rows={4} placeholder="Dites-en un peu plus sur vous..." className="bg-slate-900 border-slate-800 rounded-2xl resize-none" /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}/>
                      </div>
                      <Button type="submit" disabled={isSaving} className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-[0.98]">
                          {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Enregistrer les changements</>}
                      </Button>
                  </form>
              </Form>
          </TabsContent>

          <TabsContent value="security" className="mt-8 px-4 space-y-6">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-800 rounded-2xl text-slate-400"><KeyRound className="h-6 w-6"/></div>
                          <div>
                            <p className="text-sm font-bold text-white">Mot de passe</p>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Réinitialisation via email</p>
                          </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={handlePasswordReset} className="rounded-xl border-slate-700 h-10 px-4 font-bold text-xs uppercase tracking-widest">Modifier</Button>
                  </div>
              </Card>
              
              <Button variant="destructive" className="w-full h-16 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all" onClick={secureSignOut}>
                  <LogOut className="mr-3 h-5 w-5" /> Se déconnecter
              </Button>
          </TabsContent>
      </Tabs>
    </div>
  );
}
