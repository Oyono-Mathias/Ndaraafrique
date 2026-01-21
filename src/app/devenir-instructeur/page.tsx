
'use client';

import { useState, useEffect } from 'react';
import { useRouter, Link } from 'next-intl/navigation';
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
import PhoneInput from 'react-phone-number-input/react-hook-form-input';
import 'react-phone-number-input/style.css';
import { africanCountries } from '@/lib/countries';
import { Checkbox } from '@/components/ui/checkbox';
import { sendNewInstructorApplicationEmail } from '@/lib/emails';
import { sendAdminNotification } from '@/actions/notificationActions';
import { useDoc, useMemoFirebase } from '@/firebase';
import type { Settings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const instructorApplicationSchema = () => z.object({
  specialty: z.string().min(3, { message: "La spécialité est requise." }),
  whatsappNumber: z.string().min(10, { message: "Le numéro WhatsApp est requis." }),
  youtubeUrl: z.string().url({ message: "URL YouTube invalide." }).optional().or(z.literal('')),
  facebookUrl: z.string().url({ message: "URL Facebook invalide." }).optional().or(z.literal('')),
  presentationVideoUrl: z.string().url({ message: "L'URL de la vidéo de présentation est requise." }),
  professionalExperience: z.string().min(50, { message: "L'expérience doit contenir au moins 50 caractères." }),
  linkedinUrl: z.string().url({ message: "URL LinkedIn invalide." }).optional().or(z.literal('')),
  portfolioUrl: z.string().url({ message: "URL de portfolio invalide." }).optional().or(z.literal('')),
  firstCourseTitle: z.string().min(10, { message: "Le titre du cours doit contenir au moins 10 caractères." }),
  firstCourseDescription: z.string().min(30, { message: "La description du cours doit contenir au moins 30 caractères." }),
  hasEquipment: z.boolean().refine(val => val === true, { message: "Vous devez certifier que vous avez le matériel nécessaire." }),
});

type ApplicationFormValues = z.infer<ReturnType<typeof instructorApplicationSchema>>;

const africanCountryCodes = africanCountries.map(c => c.code as any);
const prioritizedCountries = ['CM', 'CI', 'SN', 'CD', 'GA', 'BJ', 'TG', 'GN', 'ML', 'BF'];

export default function BecomeInstructorPage() {
  const router = useRouter();
  const { user, currentUser, isUserLoading } = useRole();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const db = getFirestore();

  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings, isLoading: settingsLoading } = useDoc<Settings>(settingsRef);
  const allowSignup = settings?.platform?.allowInstructorSignup ?? false;

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(instructorApplicationSchema()),
  });
  
  useEffect(() => {
    if (!isUserLoading && !user) {
        toast({
            variant: "destructive",
            title: "Accès refusé",
            description: "Vous devez créer un compte pour postuler.",
        });
        router.push('/login?tab=register');
    }
  }, [user, isUserLoading, router, toast]);

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
        title: "Candidature envoyée !",
        description: "Merci ! Votre candidature est en cours d'examen. Nous vous répondrons dans les plus brefs délais.",
      });
      router.push('/dashboard');
    } catch (error) {
      console.error("Failed to submit application:", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Une erreur est survenue lors de l'envoi de votre candidature." });
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
            <h1 className="text-2xl font-bold">Vous êtes déjà instructeur !</h1>
            <p className="text-muted-foreground mt-2">Votre compte est approuvé. Vous pouvez commencer à créer des formations.</p>
            <Button asChild className="mt-4"><Link href="/instructor/courses/create">Créer un cours</Link></Button>
        </div>
    );
  }
  
   if (currentUser?.role === 'instructor' && !currentUser?.isInstructorApproved) {
    return (
        <div className="text-center p-8">
            <h1 className="text-2xl font-bold">Candidature en cours d'examen</h1>
            <p className="text-muted-foreground mt-2">Nous examinons actuellement votre profil. Merci de votre patience !</p>
             <Button asChild className="mt-4"><Link href="/dashboard">Retour au tableau de bord</Link></Button>
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
          <CardTitle className="text-3xl font-bold text-center dark:text-white">Devenir Instructeur</CardTitle>
          <CardDescription className="text-center dark:text-slate-400">Rejoignez notre communauté d'experts et partagez votre savoir.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="space-y-4 p-6 border rounded-lg dark:border-slate-700">
                <h3 className="font-semibold text-lg flex items-center gap-2 dark:text-white"><BookUser className="h-5 w-5 text-primary"/>Identité & Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="specialty" render={({ field }) => (
                      <FormItem><FormLabel className="dark:text-slate-300">Votre spécialité principale</FormLabel><FormControl><Input placeholder="Ex: Développement web, Marketing digital" {...field} className="dark:bg-slate-700 dark:border-slate-600" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Controller control={form.control} name="whatsappNumber" render={({ field }) => (
                        <FormItem><FormLabel className="dark:text-slate-300">N° WhatsApp</FormLabel>
                          <FormControl><PhoneInput {...field} defaultCountry="CM" international withCountryCallingCode className="flex h-10 w-full rounded-md border border-input dark:bg-slate-700 dark:border-slate-600 px-3 py-2 text-sm shadow-sm" countries={africanCountryCodes} countryOptionsOrder={prioritizedCountries} /></FormControl>
                        <FormMessage /></FormItem>
                     )}/>
                </div>
              </div>
              
              <div className="space-y-4 p-6 border rounded-lg dark:border-slate-700">
                <h3 className="font-semibold text-lg flex items-center gap-2 dark:text-white"><Youtube className="h-5 w-5 text-destructive"/>Présence Sociale</h3>
                 <FormField control={form.control} name="youtubeUrl" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">Chaîne Youtube (optionnel)</FormLabel><FormControl><Input placeholder="https://youtube.com/channel/..." {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormDescription className="dark:text-slate-400">Partagez si vous avez déjà du contenu vidéo.</FormDescription><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="facebookUrl" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">Page Facebook (optionnel)</FormLabel><FormControl><Input placeholder="https://facebook.com/..." {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormDescription className="dark:text-slate-400">Votre page professionnelle ou communautaire.</FormDescription><FormMessage /></FormItem>
                 )} />
              </div>

               <div className="space-y-4 p-6 border rounded-lg dark:border-slate-700">
                <h3 className="font-semibold text-lg flex items-center gap-2 dark:text-white"><Linkedin className="h-5 w-5 text-blue-500"/>Expertise & Expérience</h3>
                 <FormField control={form.control} name="professionalExperience" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">Décrivez votre expérience professionnelle</FormLabel><FormControl><Textarea placeholder="Ex: 'Développeur Full-Stack depuis 5 ans avec une expertise en React et Node.js, j'ai mené plusieurs projets pour des startups...'" {...field} rows={4} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">Profil LinkedIn (optionnel)</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/..." {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                 )} />
                  <FormField control={form.control} name="portfolioUrl" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">Portfolio ou site web (optionnel)</FormLabel><FormControl><Input placeholder="https://mon-portfolio.com" {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                 )} />
              </div>

              <div className="space-y-4 p-6 border rounded-lg dark:border-slate-700">
                <h3 className="font-semibold text-lg flex items-center gap-2 dark:text-white"><Presentation className="h-5 w-5 text-green-500"/>Projet de Cours</h3>
                 <FormField control={form.control} name="presentationVideoUrl" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">Vidéo de présentation (1-2 min)</FormLabel><FormControl><Input placeholder="Lien YouTube, Vimeo, Google Drive..." {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormDescription className="dark:text-slate-400">Présentez-vous et expliquez pourquoi vous voulez enseigner sur Ndara Afrique.</FormDescription><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="firstCourseTitle" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">Titre de votre premier cours</FormLabel><FormControl><Input placeholder="Ex: Maîtriser le design d'interfaces avec Figma" {...field} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="firstCourseDescription" render={({ field }) => (
                    <FormItem><FormLabel className="dark:text-slate-300">Description de ce cours</FormLabel><FormControl><Textarea placeholder="En quelques lignes, que vont apprendre les étudiants ?" {...field} rows={3} className="dark:bg-slate-700 dark:border-slate-600"/></FormControl><FormMessage /></FormItem>
                 )} />
              </div>

              <div className="space-y-4 p-6 border rounded-lg dark:border-slate-700">
                 <FormField control={form.control} name="hasEquipment" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow dark:border-slate-600">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel className="dark:text-slate-200">Validation Technique</FormLabel>
                            <FormDescription className="dark:text-slate-400">Je certifie avoir le matériel nécessaire (micro de qualité, caméra, bonne connexion internet) pour produire des cours de haute qualité.</FormDescription>
                            <FormMessage />
                        </div>
                    </FormItem>
                 )} />
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Envoyer ma candidature
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
