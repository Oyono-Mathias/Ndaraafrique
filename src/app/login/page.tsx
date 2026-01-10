
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, MapPin } from 'lucide-react';
import { errorEmitter } from '@/firebase';
import { FirestorePermissionError } from '@/firebase/errors';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { africanCountries, Country } from '@/lib/countries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Schemas for form validation
const loginSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide." }),
  password: z.string().min(1, { message: "Le mot de passe est requis." }),
  rememberMe: z.boolean().default(false).optional(),
});

const registerSchema = z.object({
  fullName: z.string().min(2, { message: "Le nom complet est requis." }),
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide." }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
});

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.901,36.626,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);

export default function LoginPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'login';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [siteName, setSiteName] = useState('FormaAfrique');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loginBackground, setLoginBackground] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<{name: string; code: string; flag: string} | null>(null);
  const [countryError, setCountryError] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();
  const db = getFirestore();
  const { user, isUserLoading } = useRole();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
        router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const fetchSettingsAndGeo = async () => {
        // Fetch settings
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
            const settingsData = settingsSnap.data()?.general;
            if (settingsData?.logoUrl) setLogoUrl(settingsData.logoUrl);
            if (settingsData?.siteName) setSiteName(settingsData.siteName);
            if (settingsData?.loginBackgroundImage) setLoginBackground(settingsData.loginBackgroundImage);
        }
        
        // Fetch geo-location
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (!response.ok) throw new Error('Failed to fetch geo data');
            const data = await response.json();
            setDetectedCountry({ name: data.country_name, code: data.country_code, flag: data.country_calling_code });
        } catch (error) {
            console.error("Geolocation failed:", error);
            setCountryError(true);
        }
    };
    fetchSettingsAndGeo();
  }, [db]);
  
  const handleAuthSuccess = async (user: FirebaseUser, isNewUser: boolean = false, registrationData?: z.infer<typeof registerSchema>) => {
    const userDocRef = doc(db, "users", user.uid);
    let userData;

    if (!isNewUser) {
        const userDoc = await getDoc(userDocRef);
        userData = userDoc.data();
    }
    
    if (userData) {
        if (userData.role === 'admin') {
            router.push('/admin');
        } else {
            router.push('/dashboard');
        }
    } else {
      const newUserPayload: Partial<FormaAfriqueUser> = {
        uid: user.uid,
        email: user.email || registrationData?.email || '',
        fullName: user.displayName || registrationData?.fullName || 'Nouvel utilisateur',
        role: 'student',
        isInstructorApproved: false,
        createdAt: serverTimestamp() as any,
        profilePictureURL: user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${user.displayName || registrationData?.fullName}`,
        country: detectedCountry?.name,
        countryCode: detectedCountry?.code.toLowerCase()
      };
      
      setDoc(userDocRef, newUserPayload)
        .catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'create',
                requestResourceData: newUserPayload,
            }));
            toast({
                variant: 'destructive',
                title: t('registerErrorTitle'),
                description: 'Impossible de créer le profil utilisateur dans la base de données.',
            });
        });
       router.push('/dashboard');
    }
    
    toast({ title: t('loginSuccessTitle') });
  };

  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    const auth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      await handleAuthSuccess(userCredential.user);
    } catch (error) {
       let description = 'Une erreur inattendue est survenue.';
       if (error instanceof FirebaseError) {
         switch (error.code) {
           case 'auth/user-not-found':
           case 'auth/wrong-password':
           case 'auth/invalid-credential':
             description = 'Email ou mot de passe incorrect.';
             break;
           case 'auth/invalid-email':
             description = 'Veuillez entrer une adresse e-mail valide.';
             break;
           default:
             description = 'Échec de la connexion. Veuillez vérifier vos identifiants.';
         }
       }
       toast({ variant: 'destructive', title: t('loginErrorTitle'), description });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        await handleAuthSuccess(result.user, true);
    } catch (error) {
         let description = 'Une erreur inattendue est survenue.';
        if (error instanceof FirebaseError) {
            if (error.code !== 'auth/popup-closed-by-user') {
                 description = 'Impossible de se connecter avec Google. Veuillez réessayer.';
            } else {
              setIsGoogleLoading(false);
              return;
            }
        }
       toast({ variant: 'destructive', title: 'Erreur Google', description });
    } finally {
        setIsGoogleLoading(false);
    }
  };

  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    const auth = getAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(userCredential.user, { displayName: values.fullName });
      await handleAuthSuccess(userCredential.user, true, values);
    } catch (error) {
       let description = 'Une erreur inattendue est survenue.';
       if (error instanceof FirebaseError) {
         if (error.code === 'auth/email-already-in-use') {
           description = 'Cet email est déjà utilisé. Veuillez vous connecter.';
         } else {
           description = 'Impossible de créer le compte. ' + error.message;
         }
       }
       toast({ variant: 'destructive', title: t('registerErrorTitle'), description });
    } finally {
      setIsLoading(false);
    }
  };

  const containerStyle = loginBackground
    ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9)), url('${loginBackground}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};
  
  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
     <div className="auth-page-container" style={containerStyle}>
        <div className="min-h-screen w-full flex items-center justify-center p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
            <Card className="auth-card bg-card/80 backdrop-blur-sm border-white/10 text-card-foreground">
                <TabsList className="grid w-full grid-cols-2 bg-white/5 border-white/10 m-2">
                    <TabsTrigger value="login" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-300">{t('loginButton')}</TabsTrigger>
                    <TabsTrigger value="register" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-300">{t('registerButton')}</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="m-0">
                <CardHeader className="items-center pb-4">
                    {logoUrl && <Image src={logoUrl} alt={siteName} width={40} height={40} className="mb-2 rounded-full" />}
                    <CardTitle className="text-2xl font-bold">{t('loginTitle')}</CardTitle>
                    <CardDescription>{t('loginDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pb-4">
                    <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                        <FormField control={loginForm.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel className="form-label-white">{t('emailLabel')}</FormLabel><FormControl><Input placeholder="votre.email@exemple.com" {...field} className="auth-input" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={loginForm.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel className="form-label-white">{t('passwordLabel')}</FormLabel><FormControl><Input type="password" required {...field} className="auth-input" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="flex items-center justify-between">
                            <FormField control={loginForm.control} name="rememberMe" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="rememberMe" /></FormControl>
                                    <FormLabel htmlFor="rememberMe" className="text-sm font-normal">{t('rememberMeLabel')}</FormLabel>
                                </FormItem>
                            )} />
                            <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">{t('forgotPasswordLink')}</Link>
                        </div>

                        <Button type="submit" className="w-full h-10 text-base !mt-5" disabled={isLoading || isGoogleLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('loginButton')}
                        </Button>
                        
                        <Button variant="outline" type="button" className="w-full h-10 bg-white/90 text-slate-800 hover:bg-white" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                            {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-5 w-5" />}
                            Continuer avec Google
                        </Button>
                    </form>
                    </Form>
                </CardContent>
                <CardContent className="p-4 pt-0 text-center text-sm">
                    <p>
                        {t('noAccountPrompt')}{' '}
                        <button onClick={() => setActiveTab('register')} className="font-semibold text-primary hover:underline">{t('registerLink')}</button>
                    </p>
                </CardContent>
                </TabsContent>
                
                <TabsContent value="register" className="m-0">
                <CardHeader className="items-center pb-4">
                    <CardTitle className="text-2xl font-bold">{t('registerTitle')}</CardTitle>
                    <CardDescription>{t('registerDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                    <Form {...registerForm}>
                        <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3">
                        <FormField control={registerForm.control} name="fullName" render={({ field }) => (
                            <FormItem><FormLabel className="form-label-white">{t('fullNameLabel')}</FormLabel><FormControl><Input placeholder="Mathias OYONO" {...field} className="auth-input" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={registerForm.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel className="form-label-white">{t('emailLabel')}</FormLabel><FormControl><Input placeholder="nom@exemple.com" {...field} className="auth-input" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={registerForm.control} name="password" render={({ field }) => (
                            <FormItem><FormLabel className="form-label-white">{t('passwordLabel')}</FormLabel><FormControl><Input type="password" placeholder="********" {...field} className="auth-input" /></FormControl><FormMessage /></FormItem>
                        )} />

                        {countryError ? (
                            <FormItem>
                                <FormLabel className="form-label-white">Pays</FormLabel>
                                <Select onValueChange={(value) => {
                                    const country = africanCountries.find(c => c.code === value);
                                    if(country) setDetectedCountry({name: country.name, code: country.code, flag: country.prefix});
                                }}>
                                    <FormControl>
                                        <SelectTrigger className="auth-input">
                                            <SelectValue placeholder="Sélectionnez votre pays" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {africanCountries.map(c => (
                                            <SelectItem key={c.code} value={c.code}>
                                                <div className="flex items-center gap-2">
                                                    <span>{c.emoji}</span>
                                                    <span>{c.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        ) : detectedCountry ? (
                            <div className="flex items-center gap-2 p-2 rounded-md bg-white/10 text-sm">
                                <MapPin className="h-4 w-4" />
                                <span>Pays détecté : {detectedCountry.name}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 p-2 rounded-md bg-white/10 text-sm">
                               <Loader2 className="h-4 w-4 animate-spin"/>
                               <span>Détection du pays...</span>
                            </div>
                        )}

                        <Button type="submit" className="w-full h-10 text-base !mt-5" disabled={isLoading || isGoogleLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('createAccountButton')}
                        </Button>
                        <Button variant="outline" type="button" className="w-full h-10 bg-white/90 text-slate-800 hover:bg-white" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                            {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-5 w-5" />}
                            Continuer avec Google
                        </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardContent className="p-4 pt-0 text-center text-sm">
                    <p>
                        {t('alreadyAccountPrompt')}{' '}
                        <button onClick={() => setActiveTab('login')} className="font-semibold text-primary hover:underline">{t('loginLink')}</button>
                    </p>
                </CardContent>
                </TabsContent>
            </Card>
            </Tabs>
        </div>
    </div>
  );
}
