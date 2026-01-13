
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { LanguageSelector } from '@/components/layout/language-selector';

const loginSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide." }),
  password: z.string().min(1, { message: "Le mot de passe est requis." }),
  rememberMe: z.boolean().default(false).optional(),
});

const registerSchema = z.object({
  fullName: z.string().min(2, { message: "Le nom complet est requis." }),
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide." }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
  terms: z.boolean().refine(val => val === true, {
    message: "Vous devez accepter les conditions d'utilisation.",
  }),
});

const PasswordInput = ({ field }: { field: any }) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
      <div className="relative">
          <Input type={showPassword ? "text" : "password"} {...field} className="h-12 pr-10 bg-slate-800/50 border-slate-700 text-white" />
          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-slate-400 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
          </Button>
      </div>
  );
};


export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'login';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [loginBackground, setLoginBackground] = useState<string | null>(null);
  
  const [detectedCountry, setDetectedCountry] = useState<{name: string; code: string; flag: string} | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const db = getFirestore();
  const { user, isUserLoading } = useRole();
  const recaptchaVerifier = useRef<any>(null);

  const loginForm = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '', rememberMe: false } });
  const registerForm = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema), defaultValues: { fullName: '', email: '', password: '', terms: false } });
  
  useEffect(() => { if (!isUserLoading && user) router.push('/dashboard'); }, [user, isUserLoading, router]);

  useEffect(() => {
    const fetchGeo = async () => {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            setDetectedCountry({ name: data.country_name, code: data.country_code, flag: data.country_calling_code });
        } catch (error) { console.error("Could not fetch geo location"); }
    };
    fetchGeo();

    const fetchSettings = async () => {
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
            const settingsData = settingsSnap.data()?.general;
            if (settingsData?.loginBackgroundImage) {
                setLoginBackground(settingsData.loginBackgroundImage);
            }
        }
    };
    fetchSettings();
  }, [db]);
  

  const handleAuthSuccess = async (firebaseUser: FirebaseUser) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    let targetRoute = '/dashboard';

    if (!userDocSnap.exists()) {
        const finalUserData: Partial<FormaAfriqueUser> = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            fullName: firebaseUser.displayName || 'Utilisateur Ndara',
            role: 'student',
            isInstructorApproved: false,
            createdAt: serverTimestamp() as any,
            lastLogin: serverTimestamp() as any,
            termsAcceptedAt: serverTimestamp() as any,
            profilePictureURL: firebaseUser.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(firebaseUser.displayName || 'A')}`,
            country: detectedCountry?.name,
            countryCode: detectedCountry?.code?.toLowerCase(),
            preferredLanguage: i18n.language,
        };
        await setDoc(userDocRef, finalUserData, { merge: true });
    } else {
        const existingData = userDocSnap.data() as FormaAfriqueUser;
        if (existingData.role === 'admin') {
            targetRoute = '/admin';
        }
        await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
    }
    
    toast({ title: t('loginSuccessTitle') });
    router.push(targetRoute);
  };

  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(getAuth(), values.email, values.password);
      await handleAuthSuccess(userCredential.user);
    } catch (error) { toast({ variant: 'destructive', title: "Erreur", description: "Email ou mot de passe incorrect." }); }
    finally { setIsLoading(false); }
  };

  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(getAuth(), values.email, values.password);
      await updateProfile(userCredential.user, { displayName: values.fullName });
      await handleAuthSuccess(userCredential.user);
    } catch (error) { 
        if (error instanceof FirebaseError && error.code === 'auth/email-already-in-use') {
            toast({ variant: 'destructive', title: "Erreur d'inscription", description: "Cet email est déjà utilisé." });
        } else {
            toast({ variant: 'destructive', title: "Erreur d'inscription" });
        }
    }
    finally { setIsLoading(false); }
  };
  
  if (isUserLoading) return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const containerStyle = loginBackground ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.95)), url('${loginBackground}')` } : {};


  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 auth-page-container" style={containerStyle}>
        <div className="absolute top-4 right-4 z-10">
          <LanguageSelector />
        </div>
        <div id="recaptcha-container" />
        <div className="w-full max-w-md">
            <div className="flex flex-col items-center text-center mb-6">
                <Link href="/" className="mb-4">
                  <Image src="/icon.svg" alt="Ndara Afrique Logo" width={60} height={60} />
                </Link>
            </div>
            
            <div className="auth-card rounded-2xl p-6 sm:p-8">
               <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 text-slate-300">
                        <TabsTrigger value="login">{t('loginButton')}</TabsTrigger>
                        <TabsTrigger value="register">{t('registerButton')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="login" className="space-y-6 mt-6">
                        <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                            <FormField control={loginForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel className="text-slate-300">{t('emailLabel')}</FormLabel><FormControl><Input placeholder="email@exemple.com" {...field} className="h-12 bg-slate-800/50 border-slate-700 text-white" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={loginForm.control} name="password" render={({ field }) => ( <FormItem><FormLabel className="text-slate-300">{t('passwordLabel')}</FormLabel><FormControl><PasswordInput field={field} /></FormControl><FormMessage /></FormItem> )} />
                            <div className="flex items-center justify-between">
                              <FormField control={loginForm.control} name="rememberMe" render={({ field }) => ( <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-slate-500 data-[state=checked]:bg-primary data-[state=checked]:border-primary" /></FormControl><FormLabel className="text-sm font-normal text-slate-400">{t('remember_me')}</FormLabel></FormItem> )} />
                              <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">{t('password_forgot')}</Link>
                            </div>
                            <Button style={{backgroundColor: '#007bff'}} type="submit" className="w-full h-12 text-lg font-semibold" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('loginButton')}</Button>
                        </form>
                        </Form>
                    </TabsContent>

                    <TabsContent value="register" className="mt-6">
                        <Form {...registerForm}>
                            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                            <FormField control={registerForm.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel className="text-slate-300">{t('fullNameLabel')}</FormLabel><FormControl><Input placeholder="Mathias OYONO" {...field} className="h-12 bg-slate-800/50 border-slate-700 text-white" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={registerForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel className="text-slate-300">{t('emailLabel')}</FormLabel><FormControl><Input placeholder="nom@exemple.com" {...field} className="h-12 bg-slate-800/50 border-slate-700 text-white" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={registerForm.control} name="password" render={({ field }) => ( <FormItem><FormLabel className="text-slate-300">{t('passwordLabel')}</FormLabel><FormControl><PasswordInput field={field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={registerForm.control} name="terms" render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                                 <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-slate-500 data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-1" /></FormControl>
                                 <div className="space-y-1 leading-none">
                                    <FormLabel className="text-xs font-normal text-slate-400">
                                      {t('i_agree_to')} <Link href="/cgu" target="_blank" className="underline text-primary/80 hover:text-primary">{t('terms_of_use')}</Link> {t('and')} <Link href="/mentions-legales" target="_blank" className="underline text-primary/80 hover:text-primary">{t('privacy_policy')}</Link>.
                                    </FormLabel>
                                    <FormMessage />
                                 </div>
                              </FormItem>
                            )} />
                            <Button style={{backgroundColor: '#007bff'}} type="submit" className="w-full h-12 text-lg font-semibold !mt-6" disabled={isLoading || !registerForm.watch('terms')}>{t('create_account')}</Button>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    </div>
  );
}
