
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { getAuth, updateProfile } from 'firebase/auth';
import { getFirestore, doc, updateDoc, collection, query, where, getDocs, setDoc, deleteDoc, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';
import { deleteUserAccount } from '@/actions/userActions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Edit3, User, BookOpen, Sparkles, AlertTriangle, CheckCircle, Lock, Trash2, Bell } from 'lucide-react';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { useDebounce } from '@/hooks/use-debounce';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
const profileFormSchema = (t: (key: string) => string) => z.object({
  username: z.string()
    .min(3, { message: t('username_min_char') })
    .max(20, { message: t('username_max_char') })
    .regex(/^[a-zA-Z0-9_]+$/, { message: t('username_regex') }),
  fullName: z.string().min(3, { message: t('fullname_min_char') }),
  bio: z.string().max(300, t('bio_max_char')).optional(),
  interestDomain: z.string().min(3, { message: t('interest_domain_required') })
});

type ProfileFormValues = z.infer<ReturnType<typeof profileFormSchema>>;

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

// --- NOTIFICATION PREFERENCES COMPONENT ---
const NotificationPreferences = () => {
    const { user } = useRole();
    const { toast } = useToast();
    const [isEnabled, setIsEnabled] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
            setIsEnabled(Notification.permission === 'granted');
        } else {
            setIsSupported(false);
        }
    }, []);

    const handleToggleNotifications = async (checked: boolean) => {
        if (!user || !isSupported) return;

        setIsSubscribing(true);

        try {
            const { initializeFirebase } = await import('@/firebase');
            const { firebaseApp } = initializeFirebase();
            const { getMessaging, getToken, deleteToken } = await import('firebase/messaging');
            const messaging = getMessaging(firebaseApp);
            
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                throw new Error("Clé VAPID manquante. Impossible de s'inscrire aux notifications.");
            }

            if (checked) {
                // Request permission and get token
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const currentToken = await getToken(messaging, { vapidKey });
                    if (currentToken) {
                        const tokenRef = doc(getFirestore(), `users/${user.uid}/fcmTokens`, currentToken);
                        await setDoc(tokenRef, { createdAt: serverTimestamp(), uid: user.uid });
                        setIsEnabled(true);
                        toast({ title: 'Notifications activées', description: 'Vous recevrez désormais nos actualités.' });
                    } else {
                       throw new Error('Impossible de récupérer le jeton de notification.');
                    }
                } else {
                    throw new Error('La permission de notification a été refusée.');
                }
            } else {
                // Get current token and delete it
                const currentToken = await getToken(messaging, { vapidKey });
                if (currentToken) {
                    await deleteToken(messaging);
                    const tokenRef = doc(getFirestore(), `users/${user.uid}/fcmTokens`, currentToken);
                    await deleteDoc(tokenRef);
                }
                setIsEnabled(false);
                toast({ title: 'Notifications désactivées' });
            }
        } catch (error: any) {
            console.error("Error managing notifications:", error);
            toast({ variant: 'destructive', title: 'Erreur de notification', description: error.message });
            setIsEnabled(false); // Revert UI state on error
        } finally {
            setIsSubscribing(false);
        }
    };

    if (!isSupported) return null;

    return (
         <Card className="glassmorphism-card">
            <CardHeader>
                <CardTitle className="text-xl text-white">Notifications</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-4 rounded-md border p-4 dark:border-slate-700">
                    <Bell />
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none text-slate-200">Notifications Push</p>
                        <p className="text-sm text-slate-400">Recevez les annonces importantes directement sur votre appareil.</p>
                    </div>
                    <Switch
                        checked={isEnabled}
                        onCheckedChange={handleToggleNotifications}
                        disabled={isSubscribing}
                    />
                </div>
            </CardContent>
        </Card>
    );
};


const domains = ["Développement Web", "Marketing Digital", "Data Science", "Design UI/UX", "Entrepreneuriat", "Agriculture"];

export default function AccountPage() {
  const { user, formaAfriqueUser, isUserLoading, setFormaAfriqueUser } = useRole();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({ enrolled: 0, completed: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const db = getFirestore();
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema(t)),
    defaultValues: { username: '', fullName: '', bio: '', interestDomain: '' },
    mode: 'onChange'
  });

  const debouncedUsername = useDebounce(form.watch('username'), 500);

  const profileProgress = useMemo(() => {
    let progress = 0;
    if (form.getValues('username')) progress += 33;
    if (form.getValues('fullName')) progress += 33;
    if (form.getValues('interestDomain')) progress += 34;
    return progress;
  }, [form.watch('username'), form.watch('fullName'), form.watch('interestDomain')]);

  useEffect(() => {
    if (formaAfriqueUser) {
      form.reset({
        username: formaAfriqueUser.username || '',
        fullName: formaAfriqueUser.fullName || '',
        bio: formaAfriqueUser.bio || '',
        interestDomain: formaAfriqueUser.careerGoals?.interestDomain || '',
      });
      setImagePreview(formaAfriqueUser.profilePictureURL || null);
    }
  }, [formaAfriqueUser, form]);

  useEffect(() => {
    if(user && !isUserLoading){
        const fetchStats = async () => {
            setStatsLoading(true);
            const enrollmentsRef = collection(db, 'enrollments');
            const q = query(enrollmentsRef, where('studentId', '==', user.uid));
            const completedQuery = query(q, where('progress', '==', 100));

            try {
                const [totalSnapshot, completedSnapshot] = await Promise.all([
                    getCountFromServer(q),
                    getCountFromServer(completedQuery)
                ]);
                setStats({
                    enrolled: totalSnapshot.data().count,
                    completed: completedSnapshot.data().count
                });
            } catch (e) {
                console.error("Could not fetch user stats", e);
            } finally {
                setStatsLoading(false);
            }
        };
        fetchStats();
    }
  }, [user, isUserLoading, db]);

  useEffect(() => {
      const checkUsername = async () => {
          if (debouncedUsername.length < 3) {
              setUsernameAvailable(null);
              return;
          }
          if (debouncedUsername === formaAfriqueUser?.username) {
              setUsernameAvailable(true);
              return;
          }

          setIsCheckingUsername(true);
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('username', '==', debouncedUsername));
          const querySnapshot = await getDocs(q);
          setUsernameAvailable(querySnapshot.empty);
          setIsCheckingUsername(false);
      }
      checkUsername();
  }, [debouncedUsername, db, formaAfriqueUser?.username]);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!formaAfriqueUser || usernameAvailable === false) {
        toast({ title: t('invalid_username_title'), description: t('invalid_username_desc'), variant: 'destructive'});
        return;
    }
    setIsSaving(true);
    const auth = getAuth();
    const userDocRef = doc(db, 'users', formaAfriqueUser.uid);

    try {
        const wasIncomplete = !formaAfriqueUser.isProfileComplete;
        const isNowComplete = !!(data.username && data.interestDomain);

        await updateDoc(userDocRef, {
            username: data.username,
            fullName: data.fullName,
            bio: data.bio,
            careerGoals: {
                ...formaAfriqueUser.careerGoals,
                interestDomain: data.interestDomain,
            },
            isProfileComplete: isNowComplete
        });
        
        if (auth.currentUser && auth.currentUser.displayName !== data.fullName) {
          await updateProfile(auth.currentUser, { displayName: data.fullName });
        }

        toast({ title: t('profile_updated_title') });

        if (wasIncomplete && isNowComplete) {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            toast({
                title: t('congrats_title'),
                description: t('congrats_profile_complete_desc', { category: data.interestDomain }),
                className: "bg-green-600 text-white"
            });
             setFormaAfriqueUser(prev => prev ? ({...prev, isProfileComplete: true, careerGoals: { ...prev.careerGoals, interestDomain: data.interestDomain }}) : null);
        }

    } catch (error) {
      toast({ variant: 'destructive', title: t('error_title'), description: t('profile_update_error') });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => setImageToCrop(reader.result as string);
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const handleAvatarUpload = async (croppedImage: File) => {
    if (!formaAfriqueUser) return;
    setImageToCrop(null);
    setIsUploading(true);

    const storage = getStorage();
    const auth = getAuth();
    const filePath = `avatars/${formaAfriqueUser.uid}/profile.webp`;
    const storageRef = ref(storage, filePath);

    try {
      const snapshot = await uploadBytes(storageRef, croppedImage);
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: downloadURL });
      }
      const userDocRef = doc(db, 'users', formaAfriqueUser.uid);
      await updateDoc(userDocRef, { profilePictureURL: downloadURL });

      toast({ title: t('avatar_updated_title') });
      setImagePreview(downloadURL); // Update preview immediately

    } catch (error) {
      toast({ variant: 'destructive', title: t('error_upload_title'), description: t('avatar_update_error') });
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    const idToken = await user.getIdToken(true);
    const result = await deleteUserAccount({ userId: user.uid, idToken });
    if (!result.success) {
        toast({
            variant: 'destructive',
            title: 'Erreur de suppression',
            description: result.error || 'Une erreur est survenue.',
        });
        setIsDeleting(false);
    }
    // On success, the user will be signed out and the app will re-render,
    // usually redirecting to the login page.
  };

  if (isUserLoading || !formaAfriqueUser) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <header className="text-center"><Skeleton className="h-10 w-64 mx-auto" /><Skeleton className="h-5 w-80 mx-auto mt-2" /></header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="h-96 w-full" />
            <div className="space-y-8">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ImageCropper 
        image={imageToCrop}
        onCropComplete={handleAvatarUpload}
        onClose={() => setImageToCrop(null)}
      />
      <div className="space-y-8 max-w-4xl mx-auto">
        
        <header className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">{t('navAccount')}</h1>
            <p className="text-lg text-slate-400">{t('account_description')}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
             {/* Left Column - Profile Form */}
            <Card className="glassmorphism-card">
              <CardHeader>
                <CardTitle className="text-xl text-white">{t('public_profile_title')}</CardTitle>
                <CardDescription className="text-slate-400">{t('public_profile_desc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative w-28 h-28 mx-auto group">
                    <Avatar className="h-full w-full border-4 border-slate-700 shadow-lg">
                        <AvatarImage src={imagePreview || formaAfriqueUser.profilePictureURL} />
                        <AvatarFallback className="text-3xl bg-slate-800 text-white">{formaAfriqueUser.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                     <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Edit3 className="h-6 w-6" />
                    </label>
                    <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarFileSelect} disabled={isUploading}/>
                     {isUploading && <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white"/></div>}
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-6">
                     <FormField control={form.control} name="username" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">{t('username_label')}</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input placeholder="mathias_oyono" {...field} className="pl-8 dark:bg-slate-800 dark:border-slate-700" />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                            </div>
                        </FormControl>
                        <FormDescription className="text-slate-500 text-xs">{t('username_desc')}</FormDescription>
                        {isCheckingUsername ? (
                            <p className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin"/> {t('checking_availability')}</p>
                        ) : usernameAvailable === true ? (
                             <p className="text-xs text-green-400 flex items-center gap-1.5"><CheckCircle className="h-3 w-3"/> {t('username_available')}</p>
                        ) : usernameAvailable === false ? (
                            <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3"/> {t('username_taken')}</p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                     <FormField control={form.control} name="interestDomain" render={({ field }) => (
                         <FormItem>
                            <FormLabel className="text-slate-300">{t('interest_domain_label')}</FormLabel>
                            <select {...field} className="w-full h-10 px-3 rounded-md border border-slate-700 bg-slate-800 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                <option value="" disabled>{t('interest_domain_placeholder')}</option>
                                {domains.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <FormMessage />
                         </FormItem>
                     )} />
                    
                    <FormField control={form.control} name="bio" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">{t('bio_label')}</FormLabel>
                        <FormControl><Textarea placeholder={t('bio_placeholder')} {...field} rows={3} className="dark:bg-slate-800 dark:border-slate-700" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="border-t border-slate-700 pt-6">
                        <h4 className="font-semibold mb-4 text-slate-200">{t('private_info_title')}</h4>
                        <FormField control={form.control} name="fullName" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">{t('fullNameLabel')}</FormLabel>
                            <FormControl><Input {...field} className="dark:bg-slate-800 dark:border-slate-700" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                    </div>

                    <Button type="submit" className="w-full h-11" disabled={isSaving || isUploading || usernameAvailable === false}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('save_button_alt')}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Right Column - Stats and Progress */}
            <div className="space-y-8">
                <Card className="glassmorphism-card">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">{t('profile_progress_title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Progress value={profileProgress} />
                        <div className="text-center">
                            {profileProgress < 100 ? (
                                 <div className="flex items-center justify-center gap-2 text-orange-400 font-semibold">
                                    <Lock className="h-4 w-4"/>
                                    <span>{t('messaging_locked')}</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 text-green-400 font-semibold">
                                    <CheckCircle className="h-4 w-4"/>
                                    <span>{t('profile_complete_access_unlocked')}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="glassmorphism-card">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">{t('your_stats_title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                         <StatCard title={t('enrolled_courses')} icon={BookOpen} value={stats.enrolled} isLoading={statsLoading} />
                         <StatCard title={t('certificates_earned')} icon={Sparkles} value={stats.completed} isLoading={statsLoading} />
                    </CardContent>
                </Card>

                <NotificationPreferences />

                 <Card className="border-destructive/50 glassmorphism-card">
                    <CardHeader>
                        <CardTitle className="text-xl text-destructive/90">Zone de Danger</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-400 mb-4">La suppression de votre compte est une action définitive et irréversible.</p>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="w-full">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer mon compte
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Cette action est irréversible. Toutes vos données, y compris votre progression, vos cours et vos certificats seront définitivement supprimés.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                         {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Oui, supprimer mon compte
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                 </Card>
            </div>

        </div>
      </div>
    </>
  );
}
