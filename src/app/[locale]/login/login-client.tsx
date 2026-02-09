'use client';

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
  signInWithPopup, 
  deleteUser,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp, 
  getDoc, 
  writeBatch,
  collection
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { useToast } from '@/hooks/use-toast';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useRole } from '@/context/RoleContext';

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
          <Input type={showPassword ? "text" : "password"} {...field} className="h-12 bg-slate-800/50 border-slate-700 text-white focus-visible:ring-primary/20 focus-visible:border-primary focus-visible:ring-2" />
          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-slate-400 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
          </Button>
      </div>
  );
};

export default function LoginClient() {
  const t = useTranslations('Auth');
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'login';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [loginBackground, setLoginBackground] = useState<string | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();
  const db = getFirestore();
  const { user, isUserLoading, role } = useRole();
  const locale = useLocale();

  const loginForm = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const registerForm = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema), defaultValues: { fullName: '', email: '', password: '', terms: false } });
  
  useEffect(() => {
    if (!isUserLoading && user) {
      const target = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';
      router.push(target);
    }
  }, [user, isUserLoading, role, router]);

  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(getAuth(), values.email, values.password);
      toast({ title: "Connexion réussie !" });
    } catch (error) { 
      toast({ variant: 'destructive', title: "Erreur", description: "Email ou mot de passe incorrect." }); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    const auth = getAuth();
    let authUser: FirebaseUser | null = null;

    try {
      // 1. Création du compte Auth
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      authUser = userCredential.user;
      
      // 2. Mise à jour du nom dans Auth
      await updateProfile(authUser, { displayName: values.fullName });

      // 3. Création atomique du profil dans Firestore via Batch
      const uid = authUser.uid;
      const batch = writeBatch(db);
      
      const userRef = doc(db, "users", uid);
      const welcomeRef = doc(db, "users", uid, "notifications", "welcome");

      const userData = {
        uid,
        email: values.email,
        fullName: values.fullName,
        username: values.fullName.replace(/\s/g, '_').toLowerCase() + Math.floor(1000 + Math.random() * 9000),
        role: 'student',
        status: 'active',
        isInstructorApproved: false,
        createdAt: serverTimestamp(),
        isProfileComplete: false,
        preferredLanguage: locale as 'fr' | 'en',
        isOnline: true,
        lastSeen: serverTimestamp(),
      };

      batch.set(userRef, userData);

      // Création du message de bienvenue
      batch.set(welcomeRef, {
        text: `Bara ala ${values.fullName} ! Bienvenue sur Ndara Afrique. Explorez notre catalogue et commencez votre quête du savoir dès aujourd'hui.`,
        type: 'success',
        read: false,
        createdAt: serverTimestamp(),
        link: '/student/dashboard'
      });

      await batch.commit();
      toast({ title: "Compte créé !", description: "Bienvenue dans la famille Ndara." });
      router.push('/student/dashboard');

    } catch (error: any) {
      console.error("Registration flow error:", error);
      
      // 4. GESTION D'ERREUR EXPERTE : Suppression du compte Auth en cas d'échec Firestore
      if (authUser) {
        try {
          await deleteUser(authUser);
        } catch (cleanupErr) {
          console.error("Cleanup failure: Could not delete orphan auth user", cleanupErr);
        }
      }

      let msg = "Une erreur est survenue lors de l'inscription.";
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/email-already-in-use') msg = "Cette adresse email est déjà utilisée.";
      }
      toast({ variant: 'destructive', title: "Échec de l'inscription", description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    setIsLoading(true);
    try {
      await signInWithPopup(getAuth(), provider);
    } catch (err) {
      toast({ variant: 'destructive', title: "Erreur Google", description: "La connexion a échoué." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950">
        <div className="w-full max-w-md">
            <div className="flex flex-col items-center text-center mb-6">
                <Link href="/" className="mb-4">
                  <Image src="/logo.png" alt="Ndara Afrique" width={60} height={60} className="rounded-full shadow-2xl" />
                </Link>
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
                              <Link href="/forgot-password" className="text-xs font-bold text-primary hover:underline">{t('password_forgot')}</Link>
                            </div>
                            <Button type="submit" className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('loginButton')}</Button>
                        </form>
                        </Form>
                    </TabsContent>

                    <TabsContent value="register" className="mt-6 animate-in fade-in slide-in-from-bottom-2">
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
                                      {t('i_agree_to')} <Link href="/cgu" className="underline text-slate-300">CGU</Link> et <Link href="/mentions-legales" className="underline text-slate-300">Confidentialité</Link>
                                    </FormLabel>
                                    <FormMessage />
                                 </div>
                              </FormItem>
                            )} />
                            <Button type="submit" className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl mt-4" disabled={isLoading || !registerForm.watch('terms')}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('create_account')}</Button>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    </div>
  );
}
