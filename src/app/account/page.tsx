
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { getAuth, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, updateDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { deleteUserAccount } from '@/actions/userActions';

import 'react-phone-number-input/style.css'
import PhoneInput from 'react-phone-number-input/react-hook-form-input'

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Edit3, User, BookOpen, Sparkles, AlertTriangle, CheckCircle, Lock, Trash2, Bell, KeyRound, MonitorPlay, Users, Linkedin, Twitter, Globe, Settings, UserCog, Bot } from 'lucide-react';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { useDebounce } from '@/hooks/use-debounce';
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


// --- Validation Schema ---
const accountFormSchema = (t: (key: string) => string) => z.object({
  username: z.string().min(3, { message: t('username_min_char') }).max(20, { message: t('username_max_char') }).regex(/^[a-zA-Z0-9_]+$/, { message: t('username_regex') }),
  fullName: z.string().min(3, { message: t('fullname_min_char') }),
  bio: z.string().max(500, t('bio_max_char')).optional(),
  phoneNumber: z.string().optional(),
  // Social Links
  'socialLinks.linkedin': z.string().url().or(z.literal('')).optional(),
  'socialLinks.twitter': z.string().url().or(z.literal('')).optional(),
  'socialLinks.website': z.string().url().or(z.literal('')).optional(),
  // Instructor Notifications
  'instructorNotificationPreferences.newEnrollment': z.boolean().default(true),
  'instructorNotificationPreferences.newMessage': z.boolean().default(true),
  'instructorNotificationPreferences.newAssignmentSubmission': z.boolean().default(true),
  // Pedagogical Preferences
  'pedagogicalPreferences.aiAssistanceEnabled': z.boolean().default(true),
});

type AccountFormValues = z.infer<ReturnType<typeof accountFormSchema>>;

const StatCard = ({ title, icon, value, isLoading }: { title: string, icon: React.ElementType, value: number | string, isLoading: boolean }) => {
    const Icon = icon;
    return (
        <Card className="glassmorphism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
                <Icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2 bg-slate-700" /> : <div className="text-2xl font-bold text-white">{value}</div>}
            </CardContent>
        </Card>
    );
};

export default function AccountPage() {
  const { user, currentUser, role, isUserLoading } = useRole();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({ courses: 0, students: 0, certificates: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const db = getFirestore();
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema(t)),
    mode: 'onChange'
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({
        username: currentUser.username || '',
        fullName: currentUser.fullName || '',
        bio: currentUser.bio || '',
        phoneNumber: currentUser.phoneNumber || '',
        'socialLinks.linkedin': currentUser.socialLinks?.linkedin || '',
        'socialLinks.twitter': currentUser.socialLinks?.twitter || '',
        'socialLinks.website': currentUser.socialLinks?.website || '',
        'instructorNotificationPreferences.newEnrollment': currentUser.instructorNotificationPreferences?.newEnrollment ?? true,
        'instructorNotificationPreferences.newMessage': currentUser.instructorNotificationPreferences?.newMessage ?? true,
        'instructorNotificationPreferences.newAssignmentSubmission': currentUser.instructorNotificationPreferences?.newAssignmentSubmission ?? true,
        'pedagogicalPreferences.aiAssistanceEnabled': currentUser.pedagogicalPreferences?.aiAssistanceEnabled ?? true,
      });
      setImagePreview(currentUser.profilePictureURL || null);
    }
  }, [currentUser, form]);

  useEffect(() => {
    if (!user || isUserLoading || role !== 'instructor') {
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
            // Note: Counting unique students would require more complex logic (e.g. cloud function)
            // For now, we count total enrollments as a proxy for student reach.
            const enrollmentsSnap = await getCountFromServer(qEnrollments);

            setStats(prev => ({ ...prev, courses: coursesSnap.data().count, students: enrollmentsSnap.data().count }));
        } catch (e) {
            console.error("Could not fetch instructor stats", e);
        } finally {
            setStatsLoading(false);
        }
    };
    fetchInstructorStats();
  }, [user, isUserLoading, db, role]);

  const onProfileSubmit = async (data: AccountFormValues) => {
    if (!currentUser) return;
    setIsSaving(true);
    
    let finalImageURL = currentUser.profilePictureURL || '';
    if (imageToCrop) {
        // Upload logic...
    }

    const auth = getAuth();
    const userDocRef = doc(db, 'users', currentUser.uid);

    try {
        await updateDoc(userDocRef, {
            username: data.username,
            fullName: data.fullName,
            bio: data.bio,
            phoneNumber: data.phoneNumber,
            'socialLinks.linkedin': data['socialLinks.linkedin'],
            'socialLinks.twitter': data['socialLinks.twitter'],
            'socialLinks.website': data['socialLinks.website'],
        });
        
        if (auth.currentUser && auth.currentUser.displayName !== data.fullName) {
          await updateProfile(auth.currentUser, { displayName: data.fullName });
        }

        toast({ title: t('profile_updated_title') });
    } catch (error) {
      toast({ variant: 'destructive', title: t('error_title'), description: t('profile_update_error') });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSettingsUpdate = async (data: any) => {
      if (!currentUser) return;
      setIsSaving(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await updateDoc(userDocRef, data);
        toast({ title: "Préférences sauvegardées" });
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
    const filePath = `avatars/${currentUser.uid}/profile.webp`;
    const storageRef = ref(storage, filePath);

    try {
      const snapshot = await uploadBytes(storageRef, croppedImage);
      const downloadURL = await getDownloadURL(snapshot.ref);
      await updateDoc(doc(db, 'users', currentUser.uid), { profilePictureURL: downloadURL });
      toast({ title: t('avatar_updated_title') });
      setImagePreview(downloadURL);
    } catch (error) {
      toast({ variant: 'destructive', title: t('error_upload_title'), description: t('avatar_update_error') });
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
    const idToken = await user.getIdToken(true);
    await deleteUserAccount({ userId: user.uid, idToken });
    // On success, user is signed out and redirected by auth listener.
    setIsDeleting(false);
  };
  
  if (isUserLoading || !currentUser) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  }

  return (
    <>
      <ImageCropper 
        image={imageToCrop}
        onCropComplete={handleAvatarUpload}
        onClose={() => setImageToCrop(null)}
      />
      <div className="space-y-8 max-w-5xl mx-auto">
        
        <header className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">{t('navAccount')}</h1>
            <p className="text-lg text-slate-400">{t('account_description')}</p>
        </header>

        {role === 'instructor' && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <StatCard title="Cours Publiés" icon={MonitorPlay} value={stats.courses} isLoading={statsLoading} />
                 <StatCard title="Total d'étudiants" icon={Users} value={stats.students.toLocaleString('fr-FR')} isLoading={statsLoading} />
                 <StatCard title="Certificats délivrés" icon={Sparkles} value={stats.certificates} isLoading={statsLoading} />
            </div>
        )}

        <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 dark:bg-slate-800">
                <TabsTrigger value="profile"><UserCog className="w-4 h-4 mr-2"/>Profil</TabsTrigger>
                <TabsTrigger value="security"><KeyRound className="w-4 h-4 mr-2"/>Sécurité</TabsTrigger>
                <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-2"/>Notifications</TabsTrigger>
                <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2"/>Préférences</TabsTrigger>
            </TabsList>
            
            <Form {...form}>
            <TabsContent value="profile" className="mt-6">
                <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                <form onSubmit={form.handleSubmit(onProfileSubmit)}>
                    <CardHeader><CardTitle>Informations Personnelles</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                         <FormField control={form.control} name="username" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Photo de profil</FormLabel>
                            <div className="flex items-center gap-4">
                                <label htmlFor="avatar-upload" className="cursor-pointer">
                                <Avatar className="h-20 w-20 border-4 border-slate-700 shadow-lg group relative">
                                    <AvatarImage src={imagePreview || ''} />
                                    <AvatarFallback className="text-3xl bg-slate-800 text-white">{currentUser.fullName?.charAt(0)}</AvatarFallback>
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Edit3 className="h-6 w-6 text-white"/></div>
                                </Avatar>
                                </label>
                                <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setImageToCrop(URL.createObjectURL(e.target.files[0]))} disabled={isUploading}/>
                                {isUploading && <Loader2 className="h-6 w-6 animate-spin text-white"/>}
                            </div>
                          </FormItem>
                        )} />
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Nom Complet</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormItem><FormLabel>Adresse E-mail</FormLabel><Input value={currentUser.email} readOnly disabled className="text-slate-400 cursor-not-allowed" /></FormItem>
                            <FormField control={form.control} name="username" render={({ field }) => (<FormItem><FormLabel>Nom d'utilisateur</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <Controller control={form.control} name="phoneNumber" render={({ field }) => (
                                <FormItem><FormLabel>N° de téléphone</FormLabel><FormControl><PhoneInput {...field} defaultCountry="CM" international withCountryCallingCode className="flex h-10 w-full rounded-md border border-input dark:bg-background px-3 py-2 text-sm shadow-sm" /></FormControl><FormMessage/></FormItem>
                            )}/>
                        </div>
                        <FormField control={form.control} name="bio" render={({ field }) => (<FormItem><FormLabel>Biographie</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem>)} />
                        
                        <div>
                            <h4 className="font-semibold mb-4">Réseaux sociaux</h4>
                            <div className="space-y-4">
                                <FormField control={form.control} name="socialLinks.linkedin" render={({ field }) => (<FormItem><div className="flex items-center gap-2"><Linkedin className="h-5 w-5 text-slate-400"/><Input placeholder="URL de votre profil LinkedIn" {...field}/></div><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="socialLinks.twitter" render={({ field }) => (<FormItem><div className="flex items-center gap-2"><Twitter className="h-5 w-5 text-slate-400"/><Input placeholder="URL de votre profil Twitter/X" {...field}/></div><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="socialLinks.website" render={({ field }) => (<FormItem><div className="flex items-center gap-2"><Globe className="h-5 w-5 text-slate-400"/><Input placeholder="URL de votre site web" {...field}/></div><FormMessage /></FormItem>)}/>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="justify-end"><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Enregistrer</Button></CardFooter>
                 </form>
                </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
                 <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                    <CardHeader><CardTitle>Sécurité du Compte</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                           <p>Mot de passe</p>
                           <Button variant="secondary" onClick={handlePasswordReset}>Modifier</Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="notifications" className="mt-6">
                <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                    <CardHeader><CardTitle>Notifications Formateur</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <FormField control={form.control} name="instructorNotificationPreferences.newEnrollment" render={({ field }) => (
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel>Nouvelle inscription à un cours</FormLabel>
                                <Switch checked={field.value} onCheckedChange={(val) => { field.onChange(val); handleSettingsUpdate({'instructorNotificationPreferences.newEnrollment': val})}}/>
                            </div>
                        )}/>
                        <FormField control={form.control} name="instructorNotificationPreferences.newMessage" render={({ field }) => (
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel>Nouveau message d'un étudiant</FormLabel>
                                <Switch checked={field.value} onCheckedChange={(val) => { field.onChange(val); handleSettingsUpdate({'instructorNotificationPreferences.newMessage': val})}}/>
                            </div>
                        )}/>
                         <FormField control={form.control} name="instructorNotificationPreferences.newAssignmentSubmission" render={({ field }) => (
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel>Nouveau devoir soumis</FormLabel>
                                <Switch checked={field.value} onCheckedChange={(val) => { field.onChange(val); handleSettingsUpdate({'instructorNotificationPreferences.newAssignmentSubmission': val})}}/>
                            </div>
                        )}/>
                    </CardContent>
                </Card>
            </TabsContent>
            
             <TabsContent value="settings" className="mt-6">
                <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                    <CardHeader><CardTitle>Préférences Pédagogiques</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <FormField control={form.control} name="pedagogicalPreferences.aiAssistanceEnabled" render={({ field }) => (
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <FormLabel className="flex items-center gap-2"><Bot className="h-4 w-4"/>Activer l'assistance IA (MATHIAS)</FormLabel>
                                    <p className="text-xs text-slate-400">Pour la correction des devoirs, la génération de contenu, etc.</p>
                                </div>
                                <Switch checked={field.value} onCheckedChange={(val) => { field.onChange(val); handleSettingsUpdate({'pedagogicalPreferences.aiAssistanceEnabled': val})}}/>
                            </div>
                        )}/>
                    </CardContent>
                </Card>
            </TabsContent>
            </Form>
        </Tabs>
        
        <div className="mt-12">
             <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-xl text-destructive/90">Zone de Danger</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                    <p className="text-sm text-slate-400">La suppression de votre compte est une action définitive et irréversible.</p>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer mon compte</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible. Toutes vos données seront définitivement supprimées.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Oui, supprimer</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
             </Card>
        </div>

      </div>
    </>
  );
}
