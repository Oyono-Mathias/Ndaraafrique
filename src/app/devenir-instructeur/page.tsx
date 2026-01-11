
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Youtube, BookUser, Linkedin, Presentation, CheckSquare, FileText, Bot } from 'lucide-react';
import Link from 'next/link';
import PhoneInput from 'react-phone-number-input/react-hook-form-input';
import 'react-phone-number-input/style.css';
import { africanCountries } from '@/lib/countries';
import { Checkbox } from '@/components/ui/checkbox';
import { sendNewInstructorApplicationEmail } from '@/lib/emails';


const instructorApplicationSchema = z.object({
  specialty: z.string().min(3, { message: 'Veuillez préciser votre domaine de spécialité.' }),
  whatsappNumber: z.string().min(10, { message: 'Un numéro WhatsApp valide est requis.' }),
  youtubeUrl: z.string().url({ message: 'Veuillez entrer une URL YouTube valide.' }).optional().or(z.literal('')),
  facebookUrl: z.string().url({ message: 'Veuillez entrer une URL Facebook valide.' }).optional().or(z.literal('')),
  presentationVideoUrl: z.string().url({ message: 'Le lien de votre vidéo de présentation est requis.' }),
  professionalExperience: z.string().min(50, { message: 'Veuillez décrire votre expérience avec au moins 50 caractères.' }),
  linkedinUrl: z.string().url({ message: 'Veuillez entrer une URL LinkedIn valide.' }).optional().or(z.literal('')),
  portfolioUrl: z.string().url({ message: 'Veuillez entrer une URL valide.' }).optional().or(z.literal('')),
  firstCourseTitle: z.string().min(10, { message: 'Le titre doit contenir au moins 10 caractères.' }),
  firstCourseDescription: z.string().min(30, { message: 'La description doit contenir au moins 30 caractères.' }),
  hasEquipment: z.boolean().refine(val => val === true, { message: 'Vous devez certifier que vous disposez du matériel nécessaire.' }),
});

type ApplicationFormValues = z.infer<typeof instructorApplicationSchema>;

const africanCountryCodes = africanCountries.map(c => c.code as any);
const prioritizedCountries = ['CM', 'CI', 'SN', 'CD', 'GA', 'BJ', 'TG', 'GN', 'ML', 'BF'];

export default function BecomeInstructorPage() {
  const router = useRouter();
  const { user, formaAfriqueUser, isUserLoading } = useRole();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(instructorApplicationSchema),
  });
  
  useEffect(() => {
    if (!isUserLoading && !user) {
        toast({
            variant: "destructive",
            title: "Accès refusé",
            description: "Veuillez créer un compte pour accéder à ce contenu.",
        });
        router.push('/login?tab=register');
    }
  }, [user, isUserLoading, router, toast]);

  const onSubmit = async (data: ApplicationFormValues) => {
    if (!formaAfriqueUser) return;
    setIsSubmitting(true);
    const db = getFirestore();
    const userDocRef = doc(db, 'users', formaAfriqueUser.uid);
    try {
      await updateDoc(userDocRef, {
        role: 'instructor',
        isInstructorApproved: false,
        instructorApplication: { ...data, submittedAt: serverTimestamp() }
      });
      
      // Send email notification to admin
      await sendNewInstructorApplicationEmail({
        applicantName: formaAfriqueUser.fullName,
        applicantEmail: formaAfriqueUser.email,
        specialty: data.specialty
      });

      toast({
        duration: 10000,
        title: 'Candidature envoyée avec succès !',
        description: "Merci ! Votre dossier (YouTube, Facebook et Vidéo) est en cours d'analyse. Nous vous contacterons sur WhatsApp sous 48h.",
      });
      router.push('/dashboard');
    } catch (error) {
      console.error("Failed to submit application:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de soumettre votre candidature.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
   if (isUserLoading || (!isUserLoading && !user)) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (formaAfriqueUser?.role === 'instructor' && formaAfriqueUser?.isInstructorApproved) {
    return (
        <div className="text-center p-8">
            <h1 className="text-2xl font-bold">Vous êtes déjà un instructeur !</h1>
            <p className="text-muted-foreground mt-2">Vous pouvez commencer à créer des cours.</p>
            <Button asChild className="mt-4"><Link href="/instructor/courses/create">Créer un cours</Link></Button>
        </div>
    );
  }
  
   if (formaAfriqueUser?.role === 'instructor' && !formaAfriqueUser?.isInstructorApproved) {
    return (
        <div className="text-center p-8">
            <h1 className="text-2xl font-bold">Votre candidature est en cours d'examen</h1>
            <p className="text-muted-foreground mt-2">Merci ! Votre dossier (YouTube, Facebook et Vidéo) est en cours d'analyse. Nous vous contacterons sur WhatsApp sous 48h.</p>
             <Button asChild className="mt-4"><Link href="/dashboard">Retour au tableau de bord</Link></Button>
        </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Devenez Formateur sur FormaAfrique</CardTitle>
          <CardDescription className="text-center">Partagez votre expertise et générez des revenus en formant la prochaine génération de talents.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="space-y-4 p-6 border rounded-lg">
                <h3 className="font-semibold text-lg flex items-center gap-2"><BookUser className="h-5 w-5 text-primary"/>Identité & Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="specialty" render={({ field }) => (
                      <FormItem><FormLabel>Votre spécialité principale</FormLabel><FormControl><Input placeholder="Ex: Marketing Digital" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Controller control={form.control} name="whatsappNumber" render={({ field }) => (
                        <FormItem><FormLabel>Numéro WhatsApp</FormLabel>
                          <FormControl><PhoneInput {...field} defaultCountry="CM" international withCountryCallingCode className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" countries={africanCountryCodes} countryOptionsOrder={prioritizedCountries} /></FormControl>
                        <FormMessage /></FormItem>
                     )}/>
                </div>
              </div>
              
              <div className="space-y-4 p-6 border rounded-lg">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Youtube className="h-5 w-5 text-destructive"/>Présence Sociale</h3>
                 <FormField control={form.control} name="youtubeUrl" render={({ field }) => (
                    <FormItem><FormLabel>Chaîne YouTube</FormLabel><FormControl><Input placeholder="https://youtube.com/channel/..." {...field} /></FormControl><FormDescription>Minimum 200 abonnés requis.</FormDescription><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="facebookUrl" render={({ field }) => (
                    <FormItem><FormLabel>Page Facebook</FormLabel><FormControl><Input placeholder="https://facebook.com/..." {...field} /></FormControl><FormDescription>Une activité hebdomadaire est requise.</FormDescription><FormMessage /></FormItem>
                 )} />
              </div>

               <div className="space-y-4 p-6 border rounded-lg">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Linkedin className="h-5 w-5 text-blue-500"/>Votre Expertise</h3>
                 <FormField control={form.control} name="professionalExperience" render={({ field }) => (
                    <FormItem><FormLabel>Décrivez votre expérience professionnelle</FormLabel><FormControl><Textarea placeholder="J'ai travaillé comme développeur senior pendant 5 ans chez..." {...field} rows={4} /></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                    <FormItem><FormLabel>Profil LinkedIn</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/..." {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
                  <FormField control={form.control} name="portfolioUrl" render={({ field }) => (
                    <FormItem><FormLabel>Portfolio ou site web (Optionnel)</FormLabel><FormControl><Input placeholder="https://mon-portfolio.com" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
              </div>

              <div className="space-y-4 p-6 border rounded-lg">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Presentation className="h-5 w-5 text-green-500"/>Projet de Cours & Vidéo</h3>
                 <FormField control={form.control} name="presentationVideoUrl" render={({ field }) => (
                    <FormItem><FormLabel>Vidéo de présentation (1 min)</FormLabel><FormControl><Input placeholder="Lien Google Drive ou YouTube (non répertoriée)" {...field} /></FormControl><FormDescription>Présentez-vous et expliquez pourquoi vous voulez enseigner.</FormDescription><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="firstCourseTitle" render={({ field }) => (
                    <FormItem><FormLabel>Titre de votre premier cours</FormLabel><FormControl><Input placeholder="Ex: Devenez un expert en Community Management" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="firstCourseDescription" render={({ field }) => (
                    <FormItem><FormLabel>Description de ce cours</FormLabel><FormControl><Textarea placeholder="Dans ce cours, les étudiants apprendront à..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                 )} />
              </div>

              <div className="space-y-4 p-6 border rounded-lg">
                 <FormField control={form.control} name="hasEquipment" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Validation Technique</FormLabel>
                            <FormDescription>Je certifie posséder le matériel nécessaire (micro/caméra) pour produire des vidéos de qualité.</FormDescription>
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
