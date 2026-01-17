
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, MailCheck } from 'lucide-react';
import Link from 'next/link';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide." }),
});

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loginBackground, setLoginBackground] = useState<string | null>(null);
  const [siteName, setSiteName] = useState('Ndara Afrique');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const db = getFirestore();

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  
  useEffect(() => {
    const fetchSettings = async () => {
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
            const settingsData = settingsSnap.data()?.general;
            if (settingsData?.loginBackgroundImage) {
                setLoginBackground(settingsData.loginBackgroundImage);
            }
             if (settingsData?.logoUrl) {
                setLogoUrl(settingsData.logoUrl);
            }
            if (settingsData?.siteName) {
                setSiteName(settingsData.siteName);
            }
        }
    };
    fetchSettings();
  }, [db]);

  const onSubmit = async (values: z.infer<typeof forgotPasswordSchema>) => {
    setIsLoading(true);
    const auth = getAuth();
    try {
      await sendPasswordResetEmail(auth, values.email);
      setIsSubmitted(true); // Show success message instead of toast
    } catch (error) {
       let description = t('forgotPasswordErrorDefault');
       if (error instanceof FirebaseError) {
         if (error.code === 'auth/user-not-found') {
           description = t('forgotPasswordErrorUserNotFound');
         }
       }
       toast({ variant: 'destructive', title: t('errorTitle'), description });
    } finally {
      setIsLoading(false);
    }
  };

  const containerStyle = loginBackground 
    ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.95)), url('${loginBackground}')` } 
    : {};

  return (
    <div className="auth-page-container" style={containerStyle}>
        <div className="min-h-screen w-full flex items-center justify-center p-4">
            <div className="auth-card rounded-2xl shadow-lg w-full max-w-md p-6 sm:p-8">
                {isSubmitted ? (
                    <div className="animate-in fade-in-50 duration-500">
                        <div className="text-center pb-4">
                            <MailCheck className="h-12 w-12 text-green-400 mb-4 mx-auto"/>
                            <h1 className="text-2xl font-bold text-white">{t('forgotPasswordSuccessTitle')}</h1>
                        </div>
                        <div className="space-y-4 pb-4 text-center">
                            <p className="text-slate-300">
                                {t('forgotPasswordSuccessMessage')}
                            </p>
                            <Button onClick={() => router.push('/login')} className="w-full bg-primary hover:bg-primary/90 h-11 text-base !mt-5">
                                {t('okGotIt')}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="text-center pb-4">
                             {logoUrl ? <Image src={logoUrl} alt={siteName} width={40} height={40} className="mb-4 mx-auto rounded-full" /> : <Link href="/" className="mb-4 inline-block"><Image src="/icon.svg" alt="Ndara Afrique Logo" width={40} height={40}/></Link>}
                            <h1 className="text-2xl font-bold text-white">{t('password_forgot')}</h1>
                            <p className="text-slate-300 text-center text-sm pt-2">{t('forgotPasswordDescription')}</p>
                        </div>
                        <div className="space-y-4 pb-4">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-300">{t('emailLabel')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="votre.email@exemple.com" {...field} className="h-12 bg-slate-800/50 border-slate-700 text-white focus-visible:ring-primary/20 focus-visible:border-primary focus-visible:ring-2" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-12 text-lg font-semibold !mt-6" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t('forgotPasswordSendLink')}
                                    </Button>
                                </form>
                            </Form>
                        </div>
                        <div className="p-4 pt-0 text-center text-sm">
                            <Link href="/login" className="font-semibold text-primary hover:underline">
                                {t('backToLogin')}
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    </div>
  );
}
