
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, User as FirebaseUser, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

// --- SCHÉMAS DE VALIDATION ---
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

const africanCountryCodes = africanCountries.map(c => c.code as any);
const prioritizedCountries = ['CM', 'CI', 'SN', 'CD', 'GA', 'BJ', 'TG', 'GN', 'ML', 'BF'];

export default function LoginPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'login';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [siteName, setSiteName] = useState('FormaAfrique');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loginImageUrl, setLoginImageUrl] = useState<string | null>(null);
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
            if (settingsData?.loginBackgroundImage) setLoginImageUrl(settingsData.loginBackgroundImage);
        }
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            setDetectedCountry({ name: data.country_name, code: data.country_code, flag: data.country_calling_code });
        } catch (error) { setCountryError(true); }
    };
    fetchSettingsAndGeo();
  }, [db]);
  
  const setupRecaptcha = () => {
    if (recaptchaVerifier.current) return;
    const auth = getAuth();
    recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
  };

  const handleAuthSuccess = async (firebaseUser: FirebaseUser) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        // User exists, only update last login to prevent overwriting roles.
        await updateDoc(userDocRef, {
            lastLogin: serverTimestamp(),
        });
    } else {
        // New user, create the document with default student role
        const newUserPayload: Partial<FormaAfriqueUser> = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            fullName: firebaseUser.displayName || firebaseUser.phoneNumber || 'Utilisateur',
            role: 'student',
            isInstructorApproved: false,
            createdAt: serverTimestamp() as any,
            profilePictureURL: firebaseUser.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(firebaseUser.displayName || 'A')}`,
            country: detectedCountry?.name,
            countryCode: detectedCountry?.code?.toLowerCase()
        };
        await setDoc(userDocRef, newUserPayload);
    }
    toast({ title: t('loginSuccessTitle') });
    router.push('/dashboard');
  };

  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(getAuth(), values.email, values.password);
      await handleAuthSuccess(userCredential.user);
    } catch (error) { toast({ variant: 'destructive', title: "Erreur", description: "Email ou mot de passe incorrect." }); }
    finally { setIsLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setIsSocialLoading(true);
    try {
        const result = await signInWithPopup(getAuth(), new GoogleAuthProvider());
        await handleAuthSuccess(result.user);
    } catch (error) { toast({ variant: 'destructive', title: 'Erreur Google' }); }
    finally { setIsSocialLoading(false); }
  };

  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(getAuth(), values.email, values.password);
      await updateProfile(userCredential.user, { displayName: values.fullName });
      await handleAuthSuccess(userCredential.user);
    } catch (error) { toast({ variant: 'destructive', title: "Erreur d'inscription" }); }
    finally { setIsLoading(false); }
  };

  const onPhoneSubmit = async (values: z.infer<typeof phoneSchema>) => {
    setIsLoading(true); setupRecaptcha();
    try {
        const confirmation = await signInWithPhoneNumber(getAuth(), values.phoneNumber, recaptchaVerifier.current!);
        setConfirmationResult(confirmation);
        setPhoneAuthState('enter-otp');
    } catch (error) { toast({ variant: "destructive", title: "Erreur SMS" }); }
    finally { setIsLoading(false); }
  };

  const onOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    if (!confirmationResult) return;
    setIsLoading(true);
    try {
        const result = await confirmationResult.confirm(values.otp);
        await handleAuthSuccess(result.user);
    } catch (error) { toast({ variant: "destructive", title: "Code incorrect" }); }
    finally { setIsLoading(false); }
  };
  
  if (isUserLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div id="recaptcha-container" />

      {/* --- COLONNE GAUCHE : IMAGE --- */}
       <div className="hidden bg-muted lg:block relative">
        <Image 
          src={loginImageUrl || "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2073&auto=format&fit=crop"} 
          alt="Illustration" 
          fill
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* --- COLONNE DROITE : FORMULAIRE --- */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto w-full max-w-sm">
            <div className="flex flex-col items-center text-center mb-8">
              {logoUrl ? <Image src={logoUrl} alt={siteName} width={60} height={60} className="mb-4" /> : 
                <div className="flex items-center gap-2 text-3xl font-bold text-primary mb-4"><BookOpen className="h-10 w-10" /><span>FormaAfrique</span></div>}
              <h1 className="text-2xl font-bold text-slate-900">Content de vous revoir !</h1>
            </div>
            
           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="login">{t('loginButton')}</TabsTrigger>
                    <TabsTrigger value="register">{t('registerButton')}</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-6">
                    {loginMode === 'email' ? (
                        <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                            <FormField control={loginForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>{t('emailLabel')}</FormLabel><FormControl><Input placeholder="email@exemple.com" {...field} className="h-12" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={loginForm.control} name="password" render={({ field }) => ( <FormItem><FormLabel>{t('passwordLabel')}</FormLabel><FormControl><Input type="password" {...field} className="h-12" /></FormControl><FormMessage /></FormItem> )} />
                            <div className="flex items-center justify-between">
                              <FormField control={loginForm.control} name="rememberMe" render={({ field }) => ( <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="text-sm font-normal">Se souvenir de moi</FormLabel></FormItem> )} />
                              <Link href="/forgot-password" style={{color: '#2563EB'}} className="text-sm font-semibold hover:underline">Oublié ?</Link>
                            </div>
                            <Button style={{backgroundColor: '#2563EB'}} type="submit" className="w-full h-12 text-lg font-semibold" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('loginButton')}</Button>
                        </form>
                        </Form>
                    ) : (
                        phoneAuthState === 'enter-number' ? (
                            <Form {...phoneForm}>
                                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                                     <Controller control={phoneForm.control} name="phoneNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Numéro de téléphone</FormLabel>
                                            <FormControl>
                                                <PhoneInput {...field} defaultCountry="CM" international withCountryCallingCode className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" countries={africanCountryCodes} countryOptionsOrder={prioritizedCountries} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                     )}/>
                                    <Button style={{backgroundColor: '#2563EB'}} type="submit" className="w-full h-12 text-lg font-semibold" disabled={isLoading}>Envoyer le code</Button>
                                    <p className="text-xs text-center text-slate-500">Uniquement pour nos utilisateurs en Afrique.</p>
                                </form>
                            </Form>
                         ) : (
                            <Form {...otpForm}>
                                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                                    <FormField control={otpForm.control} name="otp" render={({ field }) => (
                                        <FormItem><FormLabel>Code SMS</FormLabel><FormControl><Input placeholder="000000" {...field} className="h-12 text-center text-xl tracking-widest" maxLength={6} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button style={{backgroundColor: '#2563EB'}} type="submit" className="w-full h-12 text-lg font-semibold" disabled={isLoading}>Confirmer</Button>
                                </form>
                            </Form>
                         )
                    )}

                    <div className="relative my-6"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">Ou continuer avec</span></div></div>
                    
                    <div className='flex gap-4 justify-center'>
                      <Button variant="outline" className="h-14 w-14 shadow-sm" onClick={() => setLoginMode('email')} title="Email"><Mail className="h-6 w-6 text-slate-600"/></Button>
                      <Button variant="outline" className="h-14 w-14 shadow-sm" onClick={handleGoogleSignIn} disabled={isSocialLoading} title="Google">{isSocialLoading ? <Loader2 className="animate-spin" /> : <GoogleIcon />}</Button>
                      <Button variant="outline" className="h-14 w-14 shadow-sm" onClick={() => setLoginMode('phone')} title="Téléphone"><Smartphone className="h-6 w-6 text-slate-600"/></Button>
                    </div>
                </TabsContent>

                <TabsContent value="register">
                    <Form {...registerForm}>
                        <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4 pt-4">
                        <FormField control={registerForm.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel>Nom complet</FormLabel><FormControl><Input placeholder="Mathias OYONO" {...field} className="h-12" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={registerForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="nom@exemple.com" {...field} className="h-12" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={registerForm.control} name="password" render={({ field }) => ( <FormItem><FormLabel>Mot de passe</FormLabel><FormControl><Input type="password" {...field} className="h-12" /></FormControl><FormMessage /></FormItem> )} />
                        <Button style={{backgroundColor: '#2563EB'}} type="submit" className="w-full h-12 text-lg font-semibold" disabled={isLoading}>Créer mon compte</Button>
                        </form>
                    </Form>
                </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
}

