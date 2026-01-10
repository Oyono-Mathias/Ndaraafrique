
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, User as FirebaseUser, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, MapPin, BookOpen, Smartphone, Mail } from 'lucide-react';
import { errorEmitter } from '@/firebase';
import { FirestorePermissionError } from '@/firebase/errors';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { africanCountries } from '@/lib/countries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PhoneInput from 'react-phone-number-input/react-hook-form-input';
import 'react-phone-number-input/style.css';


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

const phoneSchema = z.object({
    phoneNumber: z.string().min(10, { message: "Veuillez entrer un numéro de téléphone valide." }),
});

const otpSchema = z.object({
    otp: z.string().length(6, { message: "Le code doit contenir 6 chiffres." }),
});

type LoginMode = 'email' | 'phone';
type PhoneAuthState = 'enter-number' | 'enter-otp';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.901,36.626,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);

const africanCountryCodes = africanCountries.map(c => c.code as 'CM' | 'CI' | 'SN' | 'GA' | 'CD' | 'TG' | 'BJ' | 'GN' | 'ML' | 'BF' | 'DZ' | 'AO' | 'BW' | 'BI' | 'CV' | 'CF' | 'TD' | 'KM' | 'CG' | 'DJ' | 'EG' | 'GQ' | 'ER' | 'SZ' | 'ET' | 'GM' | 'GH' | 'GW' | 'KE' | 'LS' | 'LR' | 'LY' | 'MG' | 'MW' | 'MR' | 'MU' | 'MA' | 'MZ' | 'NA' | 'NE' | 'NG' | 'RW' | 'ST' | 'SC' | 'SL' | 'SO' | 'ZA' | 'SS' | 'SD' | 'TZ' | 'TN' | 'UG' | 'ZM' | 'ZW');

export default function LoginPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'login';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [siteName, setSiteName] = useState('FormaAfrique');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loginBackground, setLoginBackground] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<{name: string; code: string; flag: string} | null>(null);
  const [countryError, setCountryError] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('email');
  const [phoneAuthState, setPhoneAuthState] = useState<PhoneAuthState>('enter-number');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const db = getFirestore();
  const { user, isUserLoading } = useRole();

  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  const loginForm = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '', rememberMe: false } });
  const registerForm = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema), defaultValues: { fullName: '', email: '', password: '' } });
  const phoneForm = useForm<z.infer<typeof phoneSchema>>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<z.infer<typeof otpSchema>>({ resolver: zodResolver(otpSchema) });

  useEffect(() => { if (!isUserLoading && user) router.push('/dashboard'); }, [user, isUserLoading, router]);

  useEffect(() => {
    const fetchSettingsAndGeo = async () => {
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
            const settingsData = settingsSnap.data()?.general;
            if (settingsData?.logoUrl) setLogoUrl(settingsData.logoUrl);
            if (settingsData?.siteName) setSiteName(settingsData.siteName);
            if (settingsData?.loginBackgroundImage) setLoginBackground(settingsData.loginBackgroundImage);
        }
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (!response.ok) throw new Error('Failed to fetch geo data');
            const data = await response.json();
            setDetectedCountry({ name: data.country_name, code: data.country_code, flag: data.country_calling_code });
        } catch (error) { console.error("Geolocation failed:", error); setCountryError(true); }
    };
    fetchSettingsAndGeo();
  }, [db]);
  
  const setupRecaptcha = () => {
    if (recaptchaVerifier.current) return;
    const auth = getAuth();
    recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible'
    });
  };

  const handleAuthSuccess = async (firebaseUser: FirebaseUser, isNewUser: boolean = false, registrationData?: z.infer<typeof registerSchema> | { fullName: string }) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    let userData;

    if (!isNewUser) { const userDoc = await getDoc(userDocRef); userData = userDoc.data(); }
    
    if (!userData) {
      const newUserPayload: Partial<FormaAfriqueUser> = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || (registrationData && 'email' in registrationData ? registrationData.email : '') || '',
        fullName: firebaseUser.displayName || registrationData?.fullName || firebaseUser.phoneNumber || 'Nouvel utilisateur',
        role: 'student', isInstructorApproved: false, createdAt: serverTimestamp() as any,
        profilePictureURL: firebaseUser.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(firebaseUser.displayName || registrationData?.fullName || firebaseUser.phoneNumber || 'A')}`,
        country: detectedCountry?.name, countryCode: detectedCountry?.code?.toLowerCase()
      };
      try { await setDoc(userDocRef, newUserPayload); } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'create', requestResourceData: newUserPayload, }));
        toast({ variant: 'destructive', title: t('registerErrorTitle'), description: 'Impossible de créer le profil utilisateur.' });
        return;
      }
    }
    toast({ title: t('loginSuccessTitle') });
    router.push('/dashboard');
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
             description = 'Email ou mot de passe incorrect.'; break;
           case 'auth/invalid-email':
             description = 'Veuillez entrer une adresse e-mail valide.'; break;
           default: description = 'Échec de la connexion.';
         }
       }
       toast({ variant: 'destructive', title: t('loginErrorTitle'), description });
    } finally { setIsLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setIsSocialLoading(true);
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const isNewUser = !result.user.metadata.lastSignInTime;
        await handleAuthSuccess(result.user, isNewUser);
    } catch (error) {
         let description = 'Une erreur inattendue est survenue.';
        if (error instanceof FirebaseError) {
            if (error.code !== 'auth/popup-closed-by-user') { description = 'Impossible de se connecter avec Google.'; } else { setIsSocialLoading(false); return; }
        }
       toast({ variant: 'destructive', title: 'Erreur Google', description });
    } finally { setIsSocialLoading(false); }
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
         if (error.code === 'auth/email-already-in-use') { description = 'Cet email est déjà utilisé.'; } else { description = 'Impossible de créer le compte. ' + error.message; }
       }
       toast({ variant: 'destructive', title: t('registerErrorTitle'), description });
    } finally { setIsLoading(false); }
  };

  const onPhoneSubmit = async (values: z.infer<typeof phoneSchema>) => {
    setIsLoading(true);
    setupRecaptcha();
    const auth = getAuth();
    if (!recaptchaVerifier.current) {
        toast({ variant: "destructive", title: "Erreur", description: "Recaptcha non initialisé." });
        setIsLoading(false);
        return;
    }
    try {
        const confirmation = await signInWithPhoneNumber(auth, values.phoneNumber, recaptchaVerifier.current);
        setConfirmationResult(confirmation);
        setPhoneAuthState('enter-otp');
        toast({ title: "Code envoyé !", description: "Veuillez entrer le code reçu par SMS." });
    } catch (error) {
        console.error("SMS sending error:", error);
        toast({ variant: "destructive", title: "Erreur d'envoi", description: "Impossible d'envoyer le code SMS. Vérifiez le numéro." });
    } finally {
        setIsLoading(false);
    }
  };

  const onOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    if (!confirmationResult) return;
    setIsLoading(true);
    try {
        const result = await confirmationResult.confirm(values.otp);
        const isNewUser = !result.user.metadata.lastSignInTime;
        await handleAuthSuccess(result.user, isNewUser, { fullName: "Utilisateur" });
    } catch (error) {
        toast({ variant: "destructive", title: "Code incorrect", description: "Le code que vous avez entré est invalide." });
    } finally {
        setIsLoading(false);
    }
  };
  
  if (isUserLoading || user) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div id="recaptcha-container" />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-sm">
            <div className="flex flex-col items-center justify-center mb-6 text-center">
              {logoUrl ? <Image src={logoUrl} alt={siteName} width={48} height={48} className="rounded-full" /> : 
                <div className="flex items-center gap-2 text-2xl font-bold text-secondary"><BookOpen className="h-8 w-8" /><span>FormaAfrique</span></div>}
              <h1 className="text-2xl font-bold text-foreground mt-4">Content de vous revoir !</h1>
            </div>
            
           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">{t('loginButton')}</TabsTrigger>
                    <TabsTrigger value="register">{t('registerButton')}</TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="m-0 pt-6">
                <div className="space-y-4 pb-4 p-0">
                    {loginMode === 'email' && (
                        <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                            <FormField control={loginForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>{t('emailLabel')}</FormLabel><FormControl><Input placeholder="votre.email@exemple.com" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={loginForm.control} name="password" render={({ field }) => ( <FormItem><FormLabel>{t('passwordLabel')}</FormLabel><FormControl><Input type="password" required {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                            <div className="flex items-center justify-between"><FormField control={loginForm.control} name="rememberMe" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="rememberMe" /></FormControl><FormLabel htmlFor="rememberMe" className="text-sm font-normal">{t('rememberMeLabel')}</FormLabel></FormItem> )} /> <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">{t('forgotPasswordLink')}</Link></div>
                            <Button type="submit" className="w-full h-11 text-base !mt-5 btn" disabled={isLoading || isSocialLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('loginButton')}</Button>
                        </form>
                        </Form>
                    )}
                    {loginMode === 'phone' && (
                         phoneAuthState === 'enter-number' ? (
                            <Form {...phoneForm}>
                                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                                     <Controller control={phoneForm.control} name="phoneNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Numéro de téléphone</FormLabel>
                                            <FormControl>
                                                <PhoneInput {...field} defaultCountry="CM" international withCountryCallingCode className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" countries={africanCountryCodes} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                     )}/>
                                      <p className="text-xs text-center text-muted-foreground">Option disponible uniquement pour nos utilisateurs en Afrique.</p>
                                    <Button type="submit" className="w-full h-11 text-base !mt-5 btn" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Envoyer le code</Button>
                                </form>
                            </Form>
                         ) : (
                            <Form {...otpForm}>
                                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                                    <FormField control={otpForm.control} name="otp" render={({ field }) => (
                                        <FormItem><FormLabel>Code de vérification</FormLabel><FormControl><Input placeholder="123456" {...field} className="h-11 text-center tracking-[1em]" maxLength={6} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button type="submit" className="w-full h-11 text-base !mt-5 btn" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmer</Button>
                                </form>
                            </Form>
                         )
                    )}
                    <div className="relative my-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OU</span></div></div>
                    <div className='flex gap-4 justify-center'>
                      <Button variant="outline" className="h-14 w-14 rounded-lg" onClick={() => setLoginMode('email')}><Mail className="h-6 w-6"/></Button>
                      <Button variant="outline" className="h-14 w-14 rounded-lg" onClick={handleGoogleSignIn} disabled={isLoading || isSocialLoading}>{isSocialLoading ? <Loader2 className="animate-spin" /> : <GoogleIcon />}</Button>
                      <Button variant="outline" className="h-14 w-14 rounded-lg" onClick={() => setLoginMode('phone')}><Smartphone className="h-6 w-6"/></Button>
                    </div>
                </div>
                </TabsContent>
                <TabsContent value="register" className="m-0 pt-6">
                <div className="space-y-3 pb-4 p-0">
                    <Form {...registerForm}>
                        <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3">
                        <FormField control={registerForm.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel>{t('fullNameLabel')}</FormLabel><FormControl><Input placeholder="Mathias OYONO" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={registerForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>{t('emailLabel')}</FormLabel><FormControl><Input placeholder="nom@exemple.com" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={registerForm.control} name="password" render={({ field }) => ( <FormItem><FormLabel>{t('passwordLabel')}</FormLabel><FormControl><Input type="password" placeholder="********" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                        {countryError ? ( <FormItem> <FormLabel>Pays</FormLabel> <Select onValueChange={(value) => { const country = africanCountries.find(c => c.code === value); if(country) setDetectedCountry({name: country.name, code: country.code, flag: country.prefix}); }}> <FormControl> <SelectTrigger className="h-11"> <SelectValue placeholder="Sélectionnez votre pays" /> </SelectTrigger> </FormControl> <SelectContent> {africanCountries.map(c => ( <SelectItem key={c.code} value={c.code}> <div className="flex items-center gap-2"> <span>{c.emoji}</span> <span>{c.name}</span> </div> </SelectItem> ))} </SelectContent> </FormItem> ) : detectedCountry ? ( <div className="flex items-center gap-2 p-2 rounded-md bg-slate-100 text-sm"> <MapPin className="h-4 w-4 text-muted-foreground" /> <span className="text-muted-foreground">Pays détecté : {detectedCountry.name}</span> </div> ) : ( <div className="flex items-center gap-2 p-2 rounded-md bg-slate-100 text-sm"> <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/> <span className="text-muted-foreground">Détection du pays...</span> </div> )}
                        <p className="text-center text-xs text-muted-foreground pt-2">En vous inscrivant, vous acceptez nos <Link href="/cgu" className="underline hover:text-primary">Conditions d'utilisation</Link>.</p>
                        <Button type="submit" className="w-full h-11 text-base !mt-5 btn" disabled={isLoading || isSocialLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('createAccountButton')}</Button>
                        </form>
                    </Form>
                </div>
                </TabsContent>
            </Tabs>
        </div>
      </div>
      <div className="hidden lg:block">
        <Image src={loginBackground || "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2073&auto=format&fit=crop"} alt="Image" width="1200" height="1800" className="h-full w-full object-cover" data-ai-hint="learning students" />
      </div>
    </div>
  );
}
