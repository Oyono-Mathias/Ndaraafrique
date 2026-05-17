'use client';

/**
 * @fileOverview Portail d'Authentification Ndara Afrique v3.0.
 * ✅ DESIGN QWEN : Fintech Vintage, Glassmorphism, Grain Texture.
 * ✅ FONCTIONNEL : Redirection intelligente et création de document robuste.
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
  onSnapshot,
  increment,
  updateDoc
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, AlertTriangle, Mail, Lock, Chrome, Facebook, LogIn } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import type { Settings } from '@/lib/types';
import { cn } from '@/lib/utils';

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

export default function LoginClient() {
  const t = useTranslations('Auth');
  const tActions = useTranslations('Actions');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'login';
  const redirectUrl = searchParams.get('redirect'); 
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

      // 👥 LOGIQUE PARRAINAGE
      let referrerId: string | null = null;
      const referralRaw = localStorage.getItem('ndara_referral');
      if (referralRaw) {
          try {
              const refData = JSON.parse(referralRaw);
              if (refData.expiresAt > Date.now()) {
                  referrerId = refData.instructorId;
              }
          } catch (e) { console.warn("Invalid referral data"); }
      }

      // Extraction nom/prénom pour compatibilité admin
      const [prenom, ...nomParts] = (values.fullName || "").split(" ");
      const nom = nomParts.join(" ");

      const userRef = doc(db, "users", authUser.uid);
      const userData = {
        uid: authUser.uid,
        email: values.email,
        fullName: values.fullName,
        nom: nom || values.fullName,
        prenom: prenom || "",
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
        solde: 0, 
        hasAccess: [], 
        affiliateBalance: 0,
        pendingAffiliateBalance: 0,
        aiCredits: 5,
        hasAIAccess: false,
        referredBy: referrerId,
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

      if (referrerId) {
          const referrerRef = doc(db, 'users', referrerId);
          await updateDoc(referrerRef, {
              'affiliateStats.registrations': increment(1)
          }).catch(console.error);
          localStorage.removeItem('ndara_referral');
      }

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
      
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        if (settings?.users?.allowRegistration === false) {
            await getAuth().signOut();
            toast({ variant: 'destructive', title: "Inscriptions fermées", description: "Veuillez réessayer plus tard." });
            return;
        }

        let referrerId: string | null = null;
        const referralRaw = localStorage.getItem('ndara_referral');
        if (referralRaw) {
            try {
                const refData = JSON.parse(referralRaw);
                if (refData.expiresAt > Date.now()) referrerId = refData.instructorId;
            } catch (e) {}
        }

        const [prenom, ...nomParts] = (user.displayName || "").split(" ");
        const nom = nomParts.join(" ");

        const userData = {
          uid: user.uid,
          email: user.email || '',
          fullName: user.displayName || 'Utilisateur Google',
          nom: nom || user.displayName || "",
          prenom: prenom || "",
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
          solde: 0, 
          hasAccess: [], 
          affiliateBalance: 0,
          pendingAffiliateBalance: 0,
          aiCredits: 5,
          hasAIAccess: false,
          referredBy: referrerId,
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
        
        if (referrerId) {
            await updateDoc(doc(db, 'users', referrerId), { 'affiliateStats.registrations': increment(1) }).catch(() => {});
            localStorage.removeItem('ndara_referral');
        }
      }
      toast({ title: "Bienvenue sur Ndara Afrique !" });
    } catch (err) {
      toast({ variant: 'destructive', title: tActions('error.generic') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-black relative">
        <div className="grain-overlay" />
        
        <div className="w-full max-w-md min-h-screen md:min-h-[850px] bg-[#0F172A] relative flex flex-col shadow-2xl overflow-hidden rounded-[2.5rem]">
            
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981]/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none" />

            <main className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10">
                
                {/* Header Section */}
                <div className="text-center mb-10 animate-in fade-in duration-700">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#10B981] to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-transform hover:scale-110 duration-500">
                        <span className="text-white font-black text-4xl">N</span>
                    </div>
                    <h1 className="font-black text-3xl text-white mb-2 tracking-tight uppercase">Ndara Afrique</h1>
                    <p className="text-gray-400 text-sm italic">L'excellence de l'apprentissage panafricain</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-900/50 backdrop-blur-md rounded-2xl h-12 p-1 mb-8 border border-white/5">
                        <TabsTrigger value="login" className="rounded-xl font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-[#10B981] data-[state=active]:text-slate-900 transition-all">
                            {t('loginButton')}
                        </TabsTrigger>
                        <TabsTrigger value="register" className="rounded-xl font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-[#10B981] data-[state=active]:text-slate-900 transition-all">
                            {t('registerButton')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="login" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <Form {...loginForm}>
                            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                                <FormField control={loginForm.control} name="email" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-1">{t('emailLabel')}</FormLabel>
                                        <FormControl>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#10B981] transition-colors" />
                                                <Input placeholder="exemple@ndara.africa" {...field} className="h-14 pl-12 bg-white/5 border-white/5 rounded-4xl text-white placeholder:text-gray-600 focus-visible:ring-[#10B981]/20 backdrop-blur-md" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={loginForm.control} name="password" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <FormLabel className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{t('passwordLabel')}</FormLabel>
                                            <Link href={`/${locale}/forgot-password`} className="text-[#10B981] text-[10px] font-bold hover:text-emerald-400 transition">Oublié ?</Link>
                                        </div>
                                        <FormControl>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#10B981] transition-colors" />
                                                <Input type={showPassword ? "text" : "password"} {...field} className="h-14 pl-12 pr-12 bg-white/5 border-white/5 rounded-4xl text-white placeholder:text-gray-600 focus-visible:ring-[#10B981]/20 backdrop-blur-md" />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#10B981] transition">
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <Button type="submit" disabled={isLoading} className="w-full h-16 bg-[#10B981] hover:bg-emerald-400 text-slate-900 rounded-4xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all animate-pulse-glow border-none">
                                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <LogIn className="h-5 w-5 mr-2" />}
                                    {t('loginButton')}
                                </Button>
                            </form>
                        </Form>
                    </TabsContent>

                    <TabsContent value="register" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        {settings?.users?.allowRegistration === false ? (
                            <div className="py-10 text-center space-y-4 glass rounded-3xl border-red-500/20">
                                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Inscriptions suspendues</p>
                                <p className="text-xs text-slate-500 italic">Revenez très prochainement.</p>
                            </div>
                        ) : (
                            <Form {...registerForm}>
                                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                                    <FormField control={registerForm.control} name="fullName" render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="text-gray-400 text-[10px] font-bold uppercase ml-1">{t('fullNameLabel')}</FormLabel>
                                            <FormControl><Input placeholder="Prénom & Nom" {...field} className="h-12 bg-white/5 border-white/5 rounded-2xl text-white" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={registerForm.control} name="email" render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="text-gray-400 text-[10px] font-bold uppercase ml-1">{t('emailLabel')}</FormLabel>
                                            <FormControl><Input placeholder="email@exemple.com" {...field} className="h-12 bg-white/5 border-white/5 rounded-2xl text-white" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={registerForm.control} name="password" render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="text-gray-400 text-[10px] font-bold uppercase ml-1">{t('passwordLabel')}</FormLabel>
                                            <FormControl><Input type="password" {...field} className="h-12 bg-white/5 border-white/5 rounded-2xl text-white" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={registerForm.control} name="terms" render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1 border-gray-600 data-[state=checked]:bg-[#10B981]" /></FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="text-[10px] font-medium text-slate-500">
                                                    {t('i_agree_to')} <Link href={`/${locale}/cgu`} className="underline text-slate-300">{t('terms_of_use')}</Link> {t('and')} <Link href={`/${locale}/mentions-legales`} className="underline text-slate-300">{t('privacy_policy')}</Link>
                                                </FormLabel>
                                                <FormMessage />
                                            </div>
                                        </FormItem>
                                    )} />
                                    <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-4xl bg-[#10B981] hover:bg-emerald-400 text-slate-900 font-black uppercase text-xs tracking-widest shadow-xl mt-4 active:scale-95 transition-all">
                                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : t('create_account')}
                                    </Button>
                                </form>
                            </Form>
                        )}
                    </TabsContent>
                </Tabs>

                <div className="flex items-center gap-4 my-8">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Ou continuer avec</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={loginWithGoogle} className="h-14 bg-white/5 border border-white/5 rounded-4xl flex items-center justify-center gap-3 hover:bg-white/10 transition active:scale-95 group">
                        <Chrome className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                        <span className="text-white text-sm font-bold uppercase tracking-tighter">Google</span>
                    </button>
                    <button className="h-14 bg-white/5 border border-white/5 rounded-4xl flex items-center justify-center gap-3 hover:bg-white/10 transition active:scale-95 group opacity-50 cursor-not-allowed">
                        <Facebook className="w-5 h-5 text-blue-400" />
                        <span className="text-white text-sm font-bold uppercase tracking-tighter">Facebook</span>
                    </button>
                </div>
            </main>

            <footer className="px-6 py-6 border-t border-white/5 bg-slate-900/30">
                <div className="flex items-center justify-center gap-6 text-center mb-4">
                    <Link href={`/${locale}/mentions-legales`} className="text-gray-500 text-[10px] font-black uppercase hover:text-white transition tracking-widest">Confidentialité</Link>
                    <span className="text-gray-800">•</span>
                    <Link href={`/${locale}/cgu`} className="text-gray-500 text-[10px] font-black uppercase hover:text-white transition tracking-widest">Conditions</Link>
                    <span className="text-gray-800">•</span>
                    <Link href={`/${locale}/student/support`} className="text-gray-500 text-[10px] font-black uppercase hover:text-white transition tracking-widest">Aide</Link>
                </div>
                <p className="text-slate-700 text-[8px] font-bold text-center uppercase tracking-[0.4em]">© 2024 Ndara Afrique. Tous droits réservés.</p>
            </footer>
        </div>
    </div>
  );
}
