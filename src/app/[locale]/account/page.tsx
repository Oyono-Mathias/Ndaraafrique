'use client';

/**
 * @fileOverview Mon Profil - Identification & Bio Ndara Afrique.
 * ✅ DESIGN : Forest & Wealth (Android-First).
 * ✅ FONCTIONNEL : ImageCropper & Firestore Sync.
 */

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfileAction } from '@/actions/userActions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Camera, CheckCircle2, ShieldCheck, User, AtSign, Smartphone, Briefcase, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { useRouter } from 'next/navigation';

const accountSchema = z.object({
  username: z.string().min(3, "Min. 3 caractères.").max(20).regex(/^[a-zA-Z0-9_]+$/, "Lettres, chiffres et _ uniquement."),
  fullName: z.string().min(3, "Nom requis."),
  bio: z.string().max(500).optional().nullable().or(z.literal('')),
  phoneNumber: z.string().optional().nullable().or(z.literal('')),
  interestDomain: z.string().min(2, "Domaine requis."),
});

export default function AccountPage() {
  const { currentUser, isUserLoading, user } = useRole();
  const { toast } = useToast();
  const router = useRouter();
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
      });
    }
  }, [currentUser, form]);

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
                bio: values.bio || '',
                phoneNumber: values.phoneNumber || '',
                'careerGoals.interestDomain': values.interestDomain,
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
    return <div className="flex h-screen items-center justify-center bg-ndara-bg"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-ndara-bg relative flex flex-col font-sans">
      <div className="grain-overlay" />
      
      {selectedImage && <ImageCropper image={selectedImage} onCropComplete={onCropComplete} onClose={() => setSelectedImage(null)} />}

      <header className="fixed top-0 w-full max-w-md z-50 bg-ndara-bg/95 backdrop-blur-md safe-area-pt border-b border-white/5">
        <div className="px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-ndara-surface flex items-center justify-center text-gray-400 active:scale-90 transition">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="font-black text-xl text-white uppercase tracking-tight">Mon Identité</h1>
            </div>
            {currentUser.isInstructorApproved && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">Expert</span>
                </div>
            )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pt-32 pb-40">
        <div className="px-6 space-y-10 animate-in fade-in duration-700">
            
            {/* --- AVATAR ZONE --- */}
            <div className="flex flex-col items-center">
                <div className="relative group">
                    <div className="p-1 rounded-full bg-gradient-to-tr from-primary to-blue-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse-glow">
                        <Avatar className="h-32 w-32 border-4 border-ndara-bg shadow-2xl overflow-hidden">
                            <AvatarImage src={currentUser.profilePictureURL} className="object-cover" />
                            <AvatarFallback className="bg-slate-800 text-4xl font-black text-slate-500">{currentUser.fullName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileSelect} />
                    <Button 
                        size="icon" 
                        className="absolute bottom-1 right-1 h-10 w-10 rounded-full shadow-2xl bg-primary hover:bg-primary/90 border-4 border-ndara-bg active:scale-90 transition-all" 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isUploading}
                    >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4 text-ndara-bg" />}
                    </Button>
                </div>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mt-4">Tap pour modifier la photo</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
                    <div className="bg-ndara-surface rounded-4xl p-6 border border-white/5 shadow-xl space-y-6">
                        <h3 className="font-black text-white text-xs uppercase tracking-widest flex items-center gap-3 mb-2">
                            <User className="text-primary h-4 w-4" /> INFORMATIONS GÉNÉRALES
                        </h3>

                        <FormField control={form.control} name="fullName" render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nom Complet</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value ?? ''} className="h-14 bg-ndara-bg border-white/5 rounded-2xl text-white font-bold" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="username" render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nom d'utilisateur</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50"><AtSign size={18}/></div>
                                        <Input {...field} value={field.value ?? ''} className="h-14 pl-12 bg-ndara-bg border-white/5 rounded-2xl text-white font-black" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">N° WhatsApp</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50"><Smartphone size={18}/></div>
                                        <Input placeholder="+236..." {...field} value={field.value ?? ''} className="h-14 pl-12 bg-ndara-bg border-white/5 rounded-2xl text-white font-mono" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                    <div className="bg-ndara-surface rounded-4xl p-6 border border-white/5 shadow-xl space-y-6">
                        <h3 className="font-black text-white text-xs uppercase tracking-widest flex items-center gap-3 mb-2">
                            <Briefcase className="text-primary h-4 w-4" /> EXPERTISE & BIO
                        </h3>

                        <FormField control={form.control} name="interestDomain" render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Spécialité principale</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Finance, AgriTech, Code..." {...field} value={field.value ?? ''} className="h-14 bg-ndara-bg border-white/5 rounded-2xl text-white font-bold" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="bio" render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Biographie inspirante</FormLabel>
                                <FormControl>
                                    <Textarea 
                                        {...field} 
                                        value={field.value ?? ''} 
                                        rows={6} 
                                        className="bg-ndara-bg border-white/5 rounded-2xl text-white resize-none p-4 leading-relaxed italic" 
                                        placeholder="Racontez votre histoire..."
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                    {/* --- STICKY ACTION BAR --- */}
                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-ndara-bg via-ndara-bg to-transparent z-40 safe-area-pb">
                        <Button 
                            type="submit" 
                            disabled={isSaving} 
                            className="w-full h-16 rounded-[2.5rem] bg-gradient-to-r from-primary to-emerald-600 text-ndara-bg font-black uppercase text-xs tracking-[0.2em] shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all active:scale-95 animate-pulse-glow border-none"
                        >
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Enregistrer mon héritage</>}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
      </main>
    </div>
  );
}
