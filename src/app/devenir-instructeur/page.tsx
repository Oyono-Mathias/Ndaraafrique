

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { getFirestore, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Youtube, BookUser, Linkedin, Presentation, CheckSquare, FileText, Bot, ShieldX } from 'lucide-react';
import Link from 'next/link';
import PhoneInput from 'react-phone-number-input/react-hook-form-input';
import 'react-phone-number-input/style.css';
import { africanCountries } from '@/lib/countries';
import { Checkbox } from '@/components/ui/checkbox';
import { sendNewInstructorApplicationEmail } from '@/lib/emails';
import { useTranslations } from 'next-intl';
import { sendAdminNotification } from '@/actions/notificationActions';
import { useDoc, useMemoFirebase } from '@/firebase';
import type { Settings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const instructorApplicationSchema = (t: (key: string) => string) => z.object({
  specialty: z.string().min(3, { message: t('specialty_required') }),
  whatsappNumber: z.string().min(10, { message: t('whatsapp_required') }),
  youtubeUrl: z.string().url({ message: t('youtube_url_invalid') }).optional().or(z.literal('')),
  facebookUrl: z.string().url({ message: t('facebook_url_invalid') }).optional().or(z.literal('')),
  presentationVideoUrl: z.string().url({ message: t('video_url_required') }),
  professionalExperience: z.string().min(50, { message: t('experience_min_char') }),
  linkedinUrl: z.string().url({ message: t('linkedin_url_invalid') }).optional().or(z.literal('')),
  portfolioUrl: z.string().url({ message: t('portfolio_url_invalid') }).optional().or(z.literal('')),
  firstCourseTitle: z.string().min(10, { message: t('course_title_min_char') }),
  firstCourseDescription: z.string().min(30, { message: t('course_desc_min_char') }),
  hasEquipment: z.boolean().refine(val => val === true, { message: t('equipment_certify_required') }),
});

type ApplicationFormValues = z.infer<ReturnType<typeof instructorApplicationSchema>>;

const africanCountryCodes = africanCountries.map(c => c.code as any);
const prioritizedCountries = ['CM', 'CI', 'SN', 'CD', 'GA', 'BJ', 'TG', 'GN', 'ML', 'BF'];

export default function BecomeInstructorPage() {
  const router = useRouter();
  const { user, currentUser, isUserLoading } = useRole();
  const { toast } = useToast();
  const t = useTranslations('BecomeInstructor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const db = getFirestore();

  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings, isLoading: settingsLoading } = useDoc<Settings>(settingsRef);
  const allowSignup = settings?.platform?.allowInstructorSignup ?? false;

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(instructorApplicationSchema(t as any)),
  });
  
  useEffect(() => {
    if (!isUserLoading && !user) {
        toast({
            variant: "destructive",
            title: t('access_denied_title'),
            description: t('access_denied_create_account'),
        });
        router.push('/login?tab=register');
    }
  }, [user, isUserLoading, router, toast, t]);

  const onSubmit = async (data: ApplicationFormValues) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userDocRef, {
        role: 'instructor',
        isInstructorApproved: false,
        instructorApplication: { ...data, submittedAt: serverTimestamp() }
      });
      
      await sendAdminNotification({
        title: "🎓 Nouvelle candidature d'instructeur",
        body: `${currentUser.fullName} souhaite devenir instructeur dans le domaine : ${data.specialty}.`,
        link: '/admin/instructors',
        type: 'newApplications'
      });

      toast({
        duration: 10000,
        title: t('application_sent_title'),
        description: t('application_sent_desc'),
      });
      router.push('/dashboard');
    } catch (error) {
      console.error("Failed to submit application:", error);
      toast({ variant: 'destructive', title: t('error_title'), description: t('application_submit_error') });
    } finally {
      setIsSubmitting(false);
    }
  };
  
   const isLoading = isUserLoading || settingsLoading;

   if (isLoading || (!isUserLoading && !user)) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (currentUser?.role === 'instructor' && currentUser?.isInstructorApproved) {
    return (
        <div className="text-center p-8">
            <h1 className="text-2xl font-bold">{t('already_instructor_title')}</h1>
            <p className="text-muted-foreground mt-2">{t('already_instructor_desc')}</p>
            <Button asChild className="mt-4"><Link href="/instructor/courses/create">{t('create_course_button')}</Link></Button>
        </div>
    );
  }
  
   if (currentUser?.role === 'instructor' && !currentUser?.isInstructorApproved) {
    return (
        <div className="text-center p-8">
            <h1 className="text-2xl font-bold">{t('application_in_review_title')}</h1>
            <p className="text-muted-foreground mt-2">{t('application_in_review_desc')}</p>
             <Button asChild className="mt-4"><Link href="/dashboard">{t('back_to_dashboard')}</Link></Button>
        </div>
    );
  }

  if (!allowSignup) {
    return (
        <div className="text-center p-8 flex flex-col items-center">
            <div className="p-4 bg-slate-800 rounded-full mb-4">
                <ShieldX className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white">Candidatures fermées</h1>
            <p className="text-slate-400 mt-2 max-w-md">Nous n'acceptons pas de nouvelles candidatures pour le moment. Merci de votre intérêt pour Ndara Afrique. Revenez plus tard !</p>
             <Button asChild className="mt-6" variant="outline"><Link href="/dashboard">Retour au tableau de bord</Link></Button>
        </div>
    );
  }


  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center dark:text-white">{t('become_instructor_title')}</CardTitle>
          <CardDescription className="text-center dark:text-slate-400">{t('become_instructor_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="space-y-4 p-6 border rounded-lg dark:border-slate-700">
                <h3 className="font-semibold text-lg flex items-center gap-2 dark:text-white"><BookUser className="h-5 w-5 text-primary"/>{t('identity_contact_title')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="specialty" render={({ field }) => (
                      <FormItem><FormLabel className="dark:text-slate-300">{t('specialty_label')}</FormLabel><FormControl><Input placeholder={t('specialty_placeholder')} {...field} className="dark:bg-slate-700 dark:border-slate-600" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Controller control={form.control} name="whatsappNumber" render={({ field }) => (
                        <FormItem><FormLabel className="dark:text-slate-300">{t('whatsapp_label')}</FormLabel>
                          <FormControl><PhoneInput {...field} defaultCountry="CM" international withCountryCallingCode className="flex h-10 w-full rounded-md border border-input dark:bg-slate-700 dark:border-slate-600 px-3 py-2 text-sm shadow-sm" countries={africanCountryCodes} countryOptionsOrder={prioritizedCountries} /></FormControl>
                        <FormMessage /></FormItem>
                     )}/>
                </div>
              </div>
              
              <div className="space-y-4 p-6 border rounded-lg dark:border-slate-700">
                <h3 className="font-semibold text-lg flex items-center gap-2 dark:text-white"><Youtube className="h-5 w-5 text-destructive"/>{t('social_presence_title')}</h3>
                 <FormField control={form.control} name="youtubeUrl" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">{t('youtube_label')}</FormLabel><FormControl><Input placeholder="https://youtube.com/channel/..." {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormDescription className="dark:text-slate-400">{t('youtube_desc')}</FormDescription><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="facebookUrl" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">{t('facebook_label')}</FormLabel><FormControl><Input placeholder="https://facebook.com/..." {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormDescription className="dark:text-slate-400">{t('facebook_desc')}</FormDescription><FormMessage /></FormItem>
                 )} />
              </div>

               <div className="space-y-4 p-6 border rounded-lg dark:border-slate-700">
                <h3 className="font-semibold text-lg flex items-center gap-2 dark:text-white"><Linkedin className="h-5 w-5 text-blue-500"/>{t('expertise_title')}</h3>
                 <FormField control={form.control} name="professionalExperience" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">{t('experience_label')}</FormLabel><FormControl><Textarea placeholder={t('experience_placeholder')} {...field} rows={4} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">{t('linkedin_label')}</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/..." {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                 )} />
                  <FormField control={form.control} name="portfolioUrl" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">{t('portfolio_label')}</FormLabel><FormControl><Input placeholder="https://mon-portfolio.com" {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                 )} />
              </div>

              <div className="space-y-4 p-6 border rounded-lg dark:border-slate-700">
                <h3 className="font-semibold text-lg flex items-center gap-2 dark:text-white"><Presentation className="h-5 w-5 text-green-500"/>{t('course_project_title')}</h3>
                 <FormField control={form.control} name="presentationVideoUrl" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">{t('video_label')}</FormLabel><FormControl><Input placeholder={t('video_placeholder')} {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormDescription className="dark:text-slate-400">{t('video_desc')}</FormDescription><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="firstCourseTitle" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">{t('first_course_title_label')}</FormLabel><FormControl><Input placeholder={t('first_course_title_placeholder')} {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="firstCourseDescription" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">{t('first_course_desc_label')}</FormLabel><FormControl><Textarea placeholder={t('first_course_desc_placeholder')} {...field} rows={3} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                 )} />
              </div>

              <div className="space-y-4 p-6 border rounded-lg dark:border-slate-700">
                 <FormField control={form.control} name="hasEquipment" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow dark:border-slate-600">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel className="dark:text-slate-200">{t('tech_validation_label')}</FormLabel>
                            <FormDescription className="dark:text-slate-400">{t('tech_validation_desc')}</FormDescription>
                            <FormMessage />
                        </div>
                    </FormItem>
                 )} />
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {t('submit_application_button')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
