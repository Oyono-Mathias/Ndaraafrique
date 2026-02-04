
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
import { deleteUserAccount } from '@/actions/userActions';
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

// --- Validation Schema ---
const accountFormSchema = (t: (key: string) => string) => z.object({
  username: z.string().min(3, { message: "Le nom d'utilisateur doit contenir au moins 3 caractères." }).max(20, { message: "Le nom d'utilisateur ne peut pas dépasser 20 caractères." }).regex(/^[a-zA-Z0-9_]+$/, { message: "Caractères non autorisés (lettres, chiffres et underscore uniquement)." }),
  fullName: z.string().min(3, { message: "Le nom doit contenir au moins 3 caractères." }),
  bio: z.string().max(500, "La biographie ne peut pas dépasser 500 caractères.").optional(),
  phoneNumber: z.string().optional(),
  interestDomain: z.string().min(2, "Veuillez choisir votre domaine principal."),
  // Social Links
  linkedin: z.string().url().or(z.literal('')).optional(),
  twitter: z.string().url().or(z.literal('')).optional(),
  website: z.string().url().or(z.literal('')).optional(),
  // Instructor Notifications
  notifyEnrollment: z.boolean().default(true),
  notifyMessage: z.boolean().default(true),
  notifyAssignment: z.boolean().default(true),
  // Pedagogical Preferences
  aiAssistanceEnabled: z.boolean().default(true),
});

type AccountFormValues = z.infer<ReturnType<typeof accountFormSchema>>;

const StatCard = ({ title, icon, value, isLoading }: { title: string, icon: React.ElementType, value: number | string, isLoading: boolean }) => {
    const Icon = icon;
    return (
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2 bg-slate-800" /> : <div className="text-2xl font-black text-white">{value}</div>}
            </CardContent>
        </Card>
    );
};

export default function AccountPage() {
  const { user, currentUser, isUserLoading } = useRole();
  const t = useTranslations();
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({ courses: 0, students: 0, certificates: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const db = getFirestore();
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema(t as any)),
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

  useEffect(() => {
    if (!user || isUserLoading || currentUser?.role === 'student') {
      if(!isUserLoading) setStatsLoading(false);
      return;
    };
    
    const fetchInstructorStats = async () => {
        setStatsLoading(true);
        const coursesRef = collection(db, 'courses');
        const enrollmentsRef = collection(db, 'enrollments');

        try {
            const qCourses = query(coursesRef, where('instructorId', '==', user.uid));
            const coursesSnap = await getCountFromServer(qCourses);
            
            const qEnrollments = query(enrollmentsRef, where('instructorId', '==', user.uid));
            const enrollmentsSnap = await getCountFromServer(qEnrollments);

            setStats(prev => ({ ...prev, courses: coursesSnap.data().count, students: enrollmentsSnap.data().count }));
        } catch (e) {
            console.error("Could not fetch instructor stats", e);
        } finally {
            setStatsLoading(false);
        }
    };
    fetchInstructorStats();
  }, [user, isUserLoading, db, currentUser?.role]);

  const onProfileSubmit = async (data: AccountFormValues) => {
    if (!currentUser) return;
    setIsSaving(true);
    
    const auth = getAuth();
    const userDocRef = doc(db, 'users', currentUser.uid);

    try {
        // Logique de complétion strictement alignée sur le RoleContext
        const isComplete = !!(data.username && data.interestDomain && data.fullName);

        const updatePayload: any = {
            username: data.username,
            fullName: data.fullName,
            bio: data.bio || '',
            phoneNumber: data.phoneNumber || '',
            'careerGoals.interestDomain': data.interestDomain,
            isProfileComplete: isComplete,
        };

        // On ne sauvegarde les liens sociaux que si l'utilisateur n'est pas un simple étudiant
        if (currentUser.role !== 'student') {
            updatePayload['socialLinks.linkedin'] = data.linkedin || '';
            updatePayload['socialLinks.twitter'] = data.twitter || '';
            updatePayload['socialLinks.website'] = data.website || '';
        }

        await updateDoc(userDocRef, updatePayload);
        
        if (auth.currentUser && auth.currentUser.displayName !== data.fullName) {
          await updateProfile(auth.currentUser, { displayName: data.fullName });
        }

        toast({ title: "Profil mis à jour", description: isComplete ? "Votre profil est complet ! Bienvenue dans la communauté." : "Modifications enregistrées." });
        
        // Rafraîchissement forcé pour synchroniser le cache Next.js avec Firestore
        router.refresh();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de mettre à jour le profil. Vérifiez votre connexion." });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSettingsUpdate = async (updateData: any) => {
      if (!currentUser) return;
      setIsSaving(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await updateDoc(userDocRef, updateData);
        toast({ title: "Préférences sauvegardées" });
        router.refresh();
      } catch(e) {
         toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder les préférences.' });
      } finally {
         setIsSaving(false);
      }
  }

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
      await updateDoc(doc(db, 'users', currentUser.uid), { profilePictureURL: downloadURL });
      toast({ title: "Avatar mis à jour" });
      setImagePreview(downloadURL);
      router.refresh();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur d\'upload', description: "Impossible de mettre à jour l'avatar." });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;
    try {
      await sendPasswordResetEmail(getAuth(), currentUser.email);
      toast({ title: "E-mail envoyé", description: "Vérifiez votre boîte de réception pour réinitialiser votre mot de passe." });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'envoyer l'e-mail de réinitialisation." });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
        const idToken = await user.getIdToken(true);
        const result = await deleteUserAccount({ userId: user.uid, idToken });
        
        if (!result.success) {
            toast({ variant: "destructive", title: "Erreur", description: result.error || "Une erreur est survenue." });
            setIsDeleting(false);
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur", description: error.message });
        setIsDeleting(false);
    }
  };
  
  if (isUserLoading || !currentUser) {
    return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  }

  return (
    <>
      <ImageCropper 
        image={imageToCrop}
        onCropComplete={handleAvatarUpload}
        onClose={() => setImageToCrop(null)}
      />
      <div className="space-y-8 max-w-4xl mx-auto pb-20">
        
        <header className="text-center pt-4">
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Mon Compte</h1>
            <p className="text-slate-500 text-sm mt-1">Gérez vos informations et votre visibilité sur Ndara.</p>
        </header>

        {currentUser.role !== 'student' && (
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                 <StatCard title="Cours" icon={MonitorPlay} value={stats.courses} isLoading={statsLoading} />
                 <StatCard title="Étudiants" icon={Users} value={stats.students} isLoading={statsLoading} />
                 <StatCard title="Diplômes" icon={Bot} value={stats.certificates} isLoading={statsLoading} />
            </div>
        )}

        <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-slate-900 border-slate-800 p-1 h-auto">
                <TabsTrigger value="profile" className="py-2.5 text-xs uppercase font-black tracking-widest"><UserCog className="w-4 h-4 mr-2 hidden sm:block"/>Profil</TabsTrigger>
                <TabsTrigger value="security" className="py-2.5 text-xs uppercase font-black tracking-widest"><KeyRound className="w-4 h-4 mr-2 hidden sm:block"/>Sécurité</TabsTrigger>
                <TabsTrigger value="notifications" className="py-2.5 text-xs uppercase font-black tracking-widest"><Bell className="w-4 h-4 mr-2 hidden sm:block"/>Alertes</TabsTrigger>
                <TabsTrigger value="settings" className="py-2.5 text-xs uppercase font-black tracking-widest"><Settings className="w-4 h-4 mr-2 hidden sm:block"/>Réglages</TabsTrigger>
            </TabsList>
            
            <Form {...form}>
            <TabsContent value="profile" className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                <Card className="bg-slate-900 border-slate-800 shadow-2xl rounded-3xl overflow-hidden">
                <form onSubmit={form.handleSubmit(onProfileSubmit)}>
                    <CardHeader className="border-b border-white/5">
                        <CardTitle className="text-lg font-bold text-white">Informations Publiques</CardTitle>
                        <CardDescription>Ces données sont visibles par la communauté Ndara.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6">
                         <FormField control={form.control} name="username" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Photo de profil</FormLabel>
                            <div className="flex items-center gap-6">
                                <label htmlFor="avatar-upload" className="cursor-pointer group relative">
                                    <Avatar className="h-24 w-24 border-4 border-slate-800 shadow-2xl transition-transform active:scale-95">
                                        <AvatarImage src={imagePreview || ''} className="object-cover" />
                                        <AvatarFallback className="text-3xl bg-slate-800 text-slate-500 font-black">{currentUser.fullName?.charAt(0)}</AvatarFallback>
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                                            <CameraIcon className="h-6 w-6 text-white"/>
                                        </div>
                                    </Avatar>
                                </label>
                                <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setImageToCrop(URL.createObjectURL(e.target.files[0]))} disabled={isUploading}/>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-white">Votre avatar</p>
                                    <p className="text-xs text-slate-500">Format WebP ou PNG recommandé.</p>
                                </div>
                                {isUploading && <Loader2 className="h-6 w-6 animate-spin text-primary"/>}
                            </div>
                          </FormItem>
                        )} />
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Nom Complet</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem>)}/>
                            <FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Adresse E-mail</FormLabel><Input value={currentUser.email} readOnly disabled className="h-12 bg-slate-900 border-slate-800 text-slate-600 rounded-xl cursor-not-allowed" /></FormItem>
                            <FormField control={form.control} name="username" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Identifiant (@)</FormLabel>
                                    <FormControl><Input {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                                    <FormDescription className="text-[10px]">Utilisé pour la messagerie et l'annuaire.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="interestDomain" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Domaine d'intérêt</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-12 bg-slate-800/50 border-slate-700 rounded-xl">
                                                <SelectValue placeholder="Choisir un domaine..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            {domains.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription className="text-[10px]">Indispensable pour débloquer la messagerie.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <Controller control={form.control} name="phoneNumber" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">N° de téléphone</FormLabel><FormControl><PhoneInput {...field} defaultCountry="CM" international withCountryCallingCode className="flex h-12 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus-visible:ring-primary/30" /></FormControl><FormMessage/></FormItem>
                        )}/>

                        <FormField control={form.control} name="bio" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Ma Biographie</FormLabel><FormControl><Textarea {...field} rows={4} placeholder="Dites-en un peu plus sur votre parcours..." className="bg-slate-800/50 border-slate-700 rounded-xl resize-none" /></FormControl><FormMessage /></FormItem>)} />
                        
                        {/* --- LIENS SOCIAUX : RÉSERVÉS AUX FORMATEURS & ADMINS --- */}
                        {currentUser.role !== 'student' && (
                            <div className="space-y-6 pt-6 border-t border-white/5">
                                <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Réseaux Professionnels</h4>
                                <div className="space-y-4">
                                    <FormField control={form.control} name="linkedin" render={({ field }) => (<FormItem><div className="flex items-center gap-3 bg-slate-800/30 p-1 rounded-xl border border-slate-700"><div className="p-2 bg-blue-600/10 rounded-lg"><Linkedin className="h-5 w-5 text-blue-400"/></div><Input placeholder="URL LinkedIn" {...field} className="bg-transparent border-none focus-visible:ring-0 h-10"/></div><FormMessage /></FormItem>)}/>
                                    <FormField control={form.control} name="twitter" render={({ field }) => (<FormItem><div className="flex items-center gap-3 bg-slate-800/30 p-1 rounded-xl border border-slate-700"><div className="p-2 bg-slate-700/50 rounded-lg"><Twitter className="h-5 w-5 text-white"/></div><Input placeholder="URL Twitter/X" {...field} className="bg-transparent border-none focus-visible:ring-0 h-10"/></div><FormMessage /></FormItem>)}/>
                                    <FormField control={form.control} name="website" render={({ field }) => (<FormItem><div className="flex items-center gap-3 bg-slate-800/30 p-1 rounded-xl border border-slate-700"><div className="p-2 bg-emerald-600/10 rounded-lg"><Globe className="h-5 w-5 text-emerald-400"/></div><Input placeholder="Votre site web" {...field} className="bg-transparent border-none focus-visible:ring-0 h-10"/></div><FormMessage /></FormItem>)}/>
                                </div>
                            </div>
                        )}

                    </CardContent>
                    <CardFooter className="bg-slate-900/50 border-t border-white/5 px-6 py-6 flex justify-end">
                        <Button type="submit" disabled={isSaving} className="h-12 px-10 rounded-xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Sauvegarder mon profil
                        </Button>
                    </CardFooter>
                 </form>
                </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                 <Card className="bg-slate-900 border-slate-800 rounded-3xl">
                    <CardHeader><CardTitle className="text-lg">Sécurité du Compte</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-2xl">
                           <div>
                               <p className="text-sm font-bold text-white">Mot de passe</p>
                               <p className="text-xs text-slate-500">Réinitialisez votre accès par e-mail.</p>
                           </div>
                           <Button variant="secondary" onClick={handlePasswordReset} className="rounded-xl font-bold">Réinitialiser</Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="notifications" className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                <Card className="bg-slate-900 border-slate-800 rounded-3xl">
                    <CardHeader>
                        <CardTitle className="text-lg">Préférences d'Alerte</CardTitle>
                        <CardDescription>Choisissez comment Ndara communique avec vous.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {currentUser.role !== 'student' ? (
                            <>
                                <FormField control={form.control} name="notifyEnrollment" render={({ field }) => (
                                    <div className="flex items-center justify-between p-4 border border-slate-800 rounded-2xl">
                                        <FormLabel className="cursor-pointer font-bold">Nouvelle inscription</FormLabel>
                                        <Switch checked={field.value} onCheckedChange={(val) => { field.onChange(val); handleSettingsUpdate({'instructorNotificationPreferences.newEnrollment': val})}}/>
                                    </div>
                                )}/>
                                <FormField control={form.control} name="notifyMessage" render={({ field }) => (
                                    <div className="flex items-center justify-between p-4 border border-slate-800 rounded-2xl">
                                        <FormLabel className="cursor-pointer font-bold">Nouveau message</FormLabel>
                                        <Switch checked={field.value} onCheckedChange={(val) => { field.onChange(val); handleSettingsUpdate({'instructorNotificationPreferences.newMessage': val})}}/>
                                    </div>
                                )}/>
                            </>
                        ) : (
                            <div className="p-8 text-center opacity-40">
                                <Bell className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                                <p className="text-sm">Les paramètres de notification détaillés arrivent bientôt pour les étudiants.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            
             <TabsContent value="settings" className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-white/5">
                        <CardTitle className="text-lg">Outils & IA</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <FormField control={form.control} name="aiAssistanceEnabled" render={({ field }) => (
                            <div className="flex items-center justify-between p-5 bg-primary/5 border border-primary/10 rounded-2xl">
                                <div className="space-y-1">
                                    <FormLabel className="flex items-center gap-2 font-black uppercase text-[10px] text-primary tracking-widest"><Bot className="h-4 w-4"/>Copilote MATHIAS</FormLabel>
                                    <p className="text-xs text-slate-400">Activer les suggestions personnalisées et l'aide à l'apprentissage.</p>
                                </div>
                                <Switch checked={field.value} onCheckedChange={(val) => { field.onChange(val); handleSettingsUpdate({'pedagogicalPreferences.aiAssistanceEnabled': val})}}/>
                            </div>
                        )}/>
                    </CardContent>
                </Card>
            </TabsContent>
            </Form>
        </Tabs>
        
        {/* --- ZONE DE DANGER --- */}
        <div className="mt-12">
             <Card className="bg-red-500/5 border-red-500/20 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="text-center sm:text-left">
                    <h3 className="text-red-400 font-black uppercase text-xs tracking-widest flex items-center justify-center sm:justify-start gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Zone de Danger
                    </h3>
                    <p className="text-xs text-red-400/60 mt-1">La suppression est définitive et efface toutes vos progressions.</p>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="rounded-xl font-bold h-12 px-6">Supprimer mon compte</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-900 border-slate-800 text-white rounded-3xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black uppercase">Supprimer tout ?</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                                Cette action est irréversible. Vos certificats, messages et accès aux cours seront perdus à jamais.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="pt-4">
                            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white rounded-xl">Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold">
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirmer la suppression
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
             </Card>
        </div>

      </div>
    </>
  );
}

function CameraIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}
