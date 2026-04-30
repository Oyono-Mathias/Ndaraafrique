'use client';

/**
 * @fileOverview Client de connexion Ndara Afrique.
 * ✅ SÉCURITÉ : Vérification de 'allowRegistration' avant toute inscription.
 * ✅ SYNC : Création systématique du document Firestore au premier login Google.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp, 
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import type { Settings } from '@/lib/types';

const loginSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide." }),
  password: z.string().min(1, { message: "Le mot de passe est requis." }),
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
          <Input type={showPassword ? "text" : "password"} {...field} className="h-12 bg-slate-800/50 border-slate-700 text-white focus-visible:ring-primary/20" />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
          </button>
      </div>
  );
};

export default function LoginClient() {
  const t = useTranslations('Auth');
  const tActions = useTranslations('Actions');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'login';
  const redirectUrl = searchParams.get('redirect'); 
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();
  const db = getFirestore();
  const { user, isUserLoading, role, loading } = useRole();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', terms: false },
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) setSettings(snap.data() as Settings);
    });
    return () => unsub();
  }, [db]);

  useEffect(() => {
    if (!isUserLoading && !loading && user && role) {
      if (redirectUrl) {
          router.push(decodeURIComponent(redirectUrl));
          return;
      }
      
      const target = role === 'admin' 
        ? '/admin' 
        : role === 'instructor' 
            ? '/instructor/dashboard' 
            : '/student/dashboard';
            
      router.push(`/${locale}${target}`);
    }
  }, [user, isUserLoading, loading, role, router, locale, redirectUrl]);

  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(getAuth(), values.email, values.password);
    } catch (error) { 
      toast({ variant: 'destructive', title: tActions('error.generic'), description: tActions('error.user_not_found') }); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    if (settings?.users?.allowRegistration === false) {
        toast({ variant: 'destructive', title: "Inscriptions fermées", description: "Les nouvelles inscriptions sont temporairement suspendues." });
        return;
    }

    setIsLoading(true);
    const auth = getAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const authUser = userCredential.user;
      
      await updateProfile(authUser, { displayName: values.fullName });

      const userRef = doc(db, "users", authUser.uid);
      const userData = {
        uid: authUser.uid,
        email: values.email,
        fullName: values.fullName,
        username: values.fullName.replace(/\s/g, '_').toLowerCase() + Math.floor(1000 + Math.random() * 9000),
        role: 'student',
        status: 'active',
        isInstructorApproved: false,
        createdAt: serverTimestamp(),
        isProfileComplete: false,
        preferredLanguage: locale as 'fr' | 'en' | 'sg',
        isOnline: true,
        lastSeen: serverTimestamp(),
        balance: 0,
        affiliateBalance: 0,
        pendingAffiliateBalance: 0,
        affiliateStats: { clicks: 0, registrations: 0, sales: 0, earnings: 0 },
        restrictions: {
            canWithdraw: true,
            canSendMessage: true,
            canBuyCourse: true,
            canSellCourse: true,
            canAccessPlatform: true
        }
      };

      await setDoc(userRef, userData);
      toast({ title: tActions('success.generic') });

    } catch (error: any) {
      toast({ variant: 'destructive', title: tActions('error.generic') });
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    setIsLoading(true);
    try {
      const result = await signInWithPopup(getAuth(), provider);
      const user = result.user;
      
      // ✅ VÉRIFICATION ET CRÉATION SYNC
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        if (settings?.users?.allowRegistration === false) {
            await getAuth().signOut();
            toast({ variant: 'destructive', title: "Inscriptions fermées", description: "Veuillez réessayer plus tard." });
            return;
        }

        const userData = {
          uid: user.uid,
          email: user.email || '',
          fullName: user.displayName || 'Utilisateur Google',
          username: (user.displayName || 'user').replace(/\s/g, '_').toLowerCase() + Math.floor(1000 + Math.random() * 9000),
          role: 'student',
          status: 'active',
          isInstructorApproved: false,
          createdAt: serverTimestamp(),
          isProfileComplete: false,
          preferredLanguage: locale as 'fr' | 'en' | 'sg',
          isOnline: true,
          lastSeen: serverTimestamp(),
          profilePictureURL: user.photoURL || '',
          balance: 0,
          affiliateBalance: 0,
          pendingAffiliateBalance: 0,
          affiliateStats: { clicks: 0, registrations: 0, sales: 0, earnings: 0 },
          restrictions: {
              canWithdraw: true,
              canSendMessage: true,
              canBuyCourse: true,
              canSellCourse: true,
              canAccessPlatform: true
          }
        };
        await setDoc(userRef, userData);
        console.log(`[AUTH_SYNC] Nouveau profil créé pour ${user.email}`);
      }
    } catch (err) {
      console.error("[AUTH_GOOGLE_ERROR]", err);
      toast({ variant: 'destructive', title: tActions('error.generic') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950">
        <div className="w-full max-w-md">
            <div className="flex flex-col items-center text-center mb-10">
                <Link href={`/${locale}`} className="mb-4">
                  <Image src="/logo.png" alt="Ndara Afrique" width={64} height={64} className="rounded-full shadow-2xl" />
                </Link>
                <h1 className="text-2xl font-black text-white uppercase tracking-tight">Ndara Afrique</h1>
            </div>
            
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl">
               <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 rounded-2xl h-12 p-1">
                        <TabsTrigger value="login" className="rounded-xl font-bold uppercase text-[10px] tracking-widest">{t('loginButton')}</TabsTrigger>
                        <TabsTrigger value="register" className="rounded-xl font-bold uppercase text-[10px] tracking-widest">{t('registerButton')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="login" className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2">
                        <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                            <FormField control={loginForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel className="text-slate-400 text-[10px] font-black uppercase ml-1">{t('emailLabel')}</FormLabel><FormControl><Input placeholder="email@exemple.com" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={loginForm.control} name="password" render={({ field }) => ( <FormItem><FormLabel className="text-slate-400 text-[10px] font-black uppercase ml-1">{t('passwordLabel')}</FormLabel><FormControl><PasswordInput field={field} /></FormControl><FormMessage /></FormItem> )} />
                            <div className="flex items-center justify-end">
                              <Link href={`/${locale}/forgot-password`} className="text-xs font-bold text-primary hover:underline">{t('password_forgot')}</Link>
                            </div>
                            <Button type="submit" className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('loginButton')}</Button>
                        </form>
                        </Form>
                    </TabsContent>

                    <TabsContent value="register" className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                        {settings?.users?.allowRegistration === false ? (
                            <div className="py-10 text-center space-y-4">
                                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Inscriptions suspendues</p>
                                <p className="text-xs text-slate-500 italic">Revenez très prochainement.</p>
                            </div>
                        ) : (
                            <Form {...registerForm}>
                                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                                <FormField control={registerForm.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel className="text-slate-400 text-[10px] font-black uppercase ml-1">{t('fullNameLabel')}</FormLabel><FormControl><Input placeholder="Prénom & Nom" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={registerForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel className="text-slate-400 text-[10px] font-black uppercase ml-1">{t('emailLabel')}</FormLabel><FormControl><Input placeholder="nom@exemple.com" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={registerForm.control} name="password" render={({ field }) => ( <FormItem><FormLabel className="text-slate-400 text-[10px] font-black uppercase ml-1">{t('passwordLabel')}</FormLabel><FormControl><PasswordInput field={field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={registerForm.control} name="terms" render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1 border-slate-600 data-[state=checked]:bg-primary" /></FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel className="text-[10px] font-medium text-slate-500">
                                        {t('i_agree_to')} <Link href={`/${locale}/cgu`} className="underline text-slate-300">{t('terms_of_use')}</Link> {t('and')} <Link href={`/${locale}/mentions-legales`} className="underline text-slate-300">{t('privacy_policy')}</Link>
                                        </FormLabel>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                                )} />
                                <Button type="submit" className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl mt-4" disabled={isLoading || !registerForm.watch('terms')}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('create_account')}</Button>
                                </form>
                            </Form>
                        )}
                    </TabsContent>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800"></span></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-[#111827] px-4 text-slate-500 tracking-widest">OU</span></div>
                    </div>

                    <Button 
                        variant="outline" 
                        onClick={loginWithGoogle} 
                        disabled={isLoading} 
                        className="w-full h-14 rounded-2xl border-slate-800 bg-slate-800/30 hover:bg-slate-800 text-white font-bold gap-3"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.42v2.77h2.64c1.54-1.42 2.43-3.5 2.43-5.92z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-2.64-2.77c-.73.49-1.66.78-2.64.78-2.85 0-5.27-1.92-6.13-4.51H2.18v2.16C3.99 19.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.87 13.84c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.5H2.18C1.43 8.99 1 10.45 1 12s.43 3.01 1.18 4.5l3.69-2.66z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 4.47 2.18 8.5l3.69 2.66c.86-2.59 3.28-4.51 6.13-4.51z"/>
                        </svg>
                        {t('continue_with_google')}
                    </Button>
                </Tabs>
            </div>
        </div>
    </div>
  );
}
