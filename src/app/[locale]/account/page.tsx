'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { getAuth, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, updateDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { deleteUserAccount, updateUserProfileAction } from '@/actions/userActions';
import { useRouter } from 'next/navigation';

import 'react-phone-number-input/style.css'
import PhoneInput from 'react-phone-number-input/react-hook-form-input'

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, AlertTriangle, Bell, KeyRound, MonitorPlay, Users, Linkedin, Twitter, Globe, Settings, UserCog, Bot } from 'lucide-react';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const domains = [
    "Développement Web",
    "Intelligence Artificielle",
    "Design UI/UX",
    "Marketing Digital",
    "Entrepreneuriat",
    "Data Science",
    "Cybersécurité",
    "Bureautique",
    "Autre"
];

const accountFormSchema = z.object({
  username: z.string().min(3, "Min. 3 caractères.").max(20).regex(/^[a-zA-Z0-9_]+$/),
  fullName: z.string().min(3, "Nom requis."),
  bio: z.string().max(500).optional(),
  phoneNumber: z.string().optional(),
  interestDomain: z.string().min(2, "Domaine requis."),
  linkedin: z.string().url().or(z.literal('')).optional(),
  twitter: z.string().url().or(z.literal('')).optional(),
  website: z.string().url().or(z.literal('')).optional(),
  notifyEnrollment: z.boolean().default(true),
  notifyMessage: z.boolean().default(true),
  notifyAssignment: z.boolean().default(true),
  aiAssistanceEnabled: z.boolean().default(true),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export default function AccountPage() {
  const { user, currentUser, isUserLoading } = useRole();
  const { toast } = useToast();
  const router = useRouter();
  const db = getFirestore();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(currentUser?.profilePictureURL || null);
  
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    mode: 'onChange'
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
        notifyEnrollment: currentUser.instructorNotificationPreferences?.newEnrollment ?? true,
        notifyMessage: currentUser.instructorNotificationPreferences?.newMessage ?? true,
        notifyAssignment: currentUser.instructorNotificationPreferences?.newAssignmentSubmission ?? true,
        aiAssistanceEnabled: currentUser.pedagogicalPreferences?.aiAssistanceEnabled ?? true,
      });
      setImagePreview(currentUser.profilePictureURL || null);
    }
  }, [currentUser, form]);

  const onProfileSubmit = async (values: AccountFormValues) => {
    if (!currentUser) return;
    setIsSaving(true);
    
    try {
        // Préparation du payload structuré pour la Server Action
        const payload = {
            username: values.username,
            fullName: values.fullName,
            bio: values.bio,
            phoneNumber: values.phoneNumber,
            careerGoals: { interestDomain: values.interestDomain },
            socialLinks: { 
                linkedin: values.linkedin, 
                twitter: values.twitter, 
                website: values.website 
            },
            instructorNotificationPreferences: {
                newEnrollment: values.notifyEnrollment,
                newMessage: values.notifyMessage,
                newAssignmentSubmission: values.notifyAssignment
            },
            pedagogicalPreferences: {
                aiAssistanceEnabled: values.aiAssistanceEnabled
            }
        };

        const result = await updateUserProfileAction({
            userId: currentUser.uid,
            data: payload as any,
            requesterId: currentUser.uid
        });

        if (result.success) {
            toast({ title: "Profil sécurisé", description: "Vos modifications ont été enregistrées." });
            router.refresh();
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur de sécurité', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (croppedImage: File) => {
    if (!currentUser) return;
    setImageToCrop(null);
    setIsUploading(true);

    const storage = getStorage();
    const filePath = `avatars/${currentUser.uid}/profile_${Date.now()}.webp`;
    const storageRef = ref(storage, filePath);

    try {
      const snapshot = await uploadBytes(storageRef, croppedImage);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // On utilise la Server Action pour mettre à jour l'URL de l'avatar
      await updateUserProfileAction({
          userId: currentUser.uid,
          data: { profilePictureURL: downloadURL },
          requesterId: currentUser.uid
      });

      toast({ title: "Avatar mis à jour" });
      setImagePreview(downloadURL);
      router.refresh();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur d\'upload', description: "Impossible de mettre à jour l'avatar." });
    } finally {
      setIsUploading(false);
    }
  };

  if (isUserLoading || !currentUser) {
    return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <ImageCropper image={imageToCrop} onCropComplete={handleAvatarUpload} onClose={() => setImageToCrop(null)} />
      
      <header className="text-center pt-4">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Mon Compte</h1>
          <p className="text-slate-500 text-sm mt-1">Gérez vos informations de manière sécurisée.</p>
      </header>

      <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-[#111827] border-slate-800 p-1 h-auto">
              <TabsTrigger value="profile" className="py-2.5 text-xs uppercase font-black tracking-widest">Profil</TabsTrigger>
              <TabsTrigger value="security" className="py-2.5 text-xs uppercase font-black tracking-widest">Sécurité</TabsTrigger>
              <TabsTrigger value="notifications" className="py-2.5 text-xs uppercase font-black tracking-widest">Alertes</TabsTrigger>
              <TabsTrigger value="settings" className="py-2.5 text-xs uppercase font-black tracking-widest">Réglages</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onProfileSubmit)}>
            <TabsContent value="profile" className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                <Card className="bg-[#111827] border-slate-800 shadow-2xl rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-white/5">
                        <CardTitle className="text-lg font-bold text-white">Informations Publiques</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6">
                         <FormItem>
                            <FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Photo de profil</FormLabel>
                            <div className="flex items-center gap-6">
                                <label htmlFor="avatar-upload" className="cursor-pointer group relative">
                                    <Avatar className="h-24 w-24 border-4 border-slate-800 shadow-2xl transition-transform active:scale-95">
                                        <AvatarImage src={imagePreview || ''} className="object-cover" />
                                        <AvatarFallback className="text-3xl bg-slate-800 text-slate-500 font-black">{currentUser.fullName?.charAt(0)}</AvatarFallback>
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full"><Bot className="h-6 w-6 text-white"/></div>
                                    </Avatar>
                                </label>
                                <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setImageToCrop(URL.createObjectURL(e.target.files[0]))} disabled={isUploading}/>
                                {isUploading && <Loader2 className="h-6 w-6 animate-spin text-primary"/>}
                            </div>
                          </FormItem>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Nom Complet</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem>)}/>
                            <FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Email (Lecture seule)</FormLabel><Input value={currentUser.email} readOnly disabled className="h-12 bg-slate-900 border-slate-800 text-slate-600 rounded-xl cursor-not-allowed" /></FormItem>
                            <FormField control={form.control} name="username" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Identifiant (@)</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="interestDomain" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Domaine d'intérêt</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="h-12 bg-slate-800/50 border-slate-700 rounded-xl"><SelectValue placeholder="Choisir un domaine..." /></SelectTrigger></FormControl>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">{domains.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <Controller control={form.control} name="phoneNumber" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">N° de téléphone</FormLabel><FormControl><PhoneInput {...field} defaultCountry="CM" international withCountryCallingCode className="flex h-12 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white" /></FormControl><FormMessage/></FormItem>
                        )}/>

                        <FormField control={form.control} name="bio" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Ma Biographie</FormLabel><FormControl><Textarea {...field} rows={4} className="bg-slate-800/50 border-slate-700 rounded-xl resize-none" /></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                    <CardFooter className="bg-[#111827]/50 border-t border-white/5 px-6 py-6 flex justify-end">
                        <Button type="submit" disabled={isSaving} className="h-12 px-10 rounded-xl font-black uppercase tracking-widest bg-primary shadow-xl shadow-primary/20">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Mettre à jour mon profil
                        </Button>
                    </CardFooter>
                </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
                 <Card className="bg-[#111827] border-slate-800 rounded-3xl">
                    <CardHeader><CardTitle className="text-lg">Sécurité</CardTitle></CardHeader>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-2xl">
                           <div>
                               <p className="text-sm font-bold text-white">Mot de passe</p>
                               <p className="text-xs text-slate-500">Réinitialisation par email sécurisé.</p>
                           </div>
                           <Button variant="secondary" onClick={() => sendPasswordResetEmail(getAuth(), currentUser.email)} className="rounded-xl font-bold">Réinitialiser</Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            </form>
          </Form>
      </Tabs>
    </div>
  );
}