
'use client';

/**
 * @fileOverview Page de candidature pour devenir instructeur sur Ndara Afrique.
 * Design Android-First, épuré et professionnel.
 */

import { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { 
  Briefcase, 
  Rocket, 
  CheckCircle2, 
  Loader2, 
  ChevronRight, 
  Youtube, 
  Linkedin, 
  Globe, 
  Award,
  BookOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const applicationSchema = z.object({
  specialty: z.string().min(3, "Veuillez préciser votre domaine d'expertise."),
  professionalExperience: z.string().min(50, "Détaillez davantage votre parcours (min. 50 caractères)."),
  firstCourseTitle: z.string().min(5, "Quel serait le titre de votre premier cours ?"),
  firstCourseDescription: z.string().min(50, "Donnez-nous envie d'apprendre avec vous !"),
  whatsappNumber: z.string().min(8, "Numéro de contact requis."),
  portfolioUrl: z.string().url("URL invalide").or(z.literal('')).optional(),
  linkedinUrl: z.string().url("URL LinkedIn invalide").or(z.literal('')).optional(),
});

type ApplicationValues = z.infer<typeof applicationSchema>;

export default function DevenirInstructeurPage() {
  const { currentUser, user, isUserLoading } = useRole();
  const { toast } = useToast();
  const router = useRouter();
  const db = getFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      specialty: '',
      professionalExperience: '',
      firstCourseTitle: '',
      firstCourseDescription: '',
      whatsappNumber: '',
      portfolioUrl: '',
      linkedinUrl: '',
    }
  });

  if (isUserLoading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Si déjà instructeur approuvé
  if (currentUser?.isInstructorApproved) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="p-6 bg-primary/10 rounded-full inline-block mb-6">
          <CheckCircle2 className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Vous êtes déjà Formateur</h1>
        <p className="text-slate-400 mt-2">Votre compte est actif. Vous pouvez commencer à créer vos formations dès maintenant.</p>
        <Button asChild className="mt-8 h-14 rounded-2xl w-full font-black uppercase text-[10px] tracking-widest shadow-xl">
          <button onClick={() => router.push('/instructor/dashboard')}>Aller au Dashboard Formateur</button>
        </Button>
      </div>
    );
  }

  // Si candidature déjà envoyée
  if (currentUser?.instructorApplication?.submittedAt) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="p-6 bg-amber-500/10 rounded-full inline-block mb-6">
          <Rocket className="h-16 w-16 text-amber-500 animate-pulse" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Candidature en cours</h1>
        <p className="text-slate-400 mt-2">Nous avons bien reçu votre demande. Notre équipe pédagogique l'étudie avec attention. Vous recevrez une notification d'ici 48h.</p>
        <Button variant="outline" asChild className="mt-8 h-14 rounded-2xl w-full font-black uppercase text-[10px] tracking-widest border-slate-800">
          <button onClick={() => router.push('/student/dashboard')}>Retourner apprendre</button>
        </Button>
      </div>
    );
  }

  const onSubmit = async (values: ApplicationValues) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        role: 'instructor',
        isInstructorApproved: false,
        instructorApplication: {
          ...values,
          submittedAt: serverTimestamp(),
        }
      });

      toast({ 
        title: "Candidature envoyée !", 
        description: "Merci pour votre intérêt. Nous vous recontacterons très vite." 
      });
      router.refresh();
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: "Erreur", 
        description: "Impossible d'envoyer votre candidature. Réessayez." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 px-4 bg-grainy">
      <header className="py-12 text-center space-y-4">
        <Badge className="bg-primary/10 text-primary border-none uppercase font-black text-[10px] tracking-[0.2em] px-4 py-1.5 mb-2">
          Devenir Formateur
        </Badge>
        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
          Partagez votre savoir, <br/>
          <span className="text-primary">Inspirez l'Afrique.</span>
        </h1>
        <p className="text-slate-500 text-lg max-w-xl mx-auto font-medium">
          Rejoignez la plus grande communauté d'experts locaux et monétisez votre expertise.
        </p>
      </header>

      <div className="grid gap-12">
        {/* --- AVANTAGES --- */}
        <section className="grid sm:grid-cols-3 gap-4">
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-[2rem] text-center space-y-3">
            <Award className="h-8 w-8 text-primary mx-auto" />
            <h3 className="font-bold text-white text-sm">Reconnaissance</h3>
            <p className="text-xs text-slate-500">Validez votre expertise auprès de milliers d'apprenants.</p>
          </div>
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-[2rem] text-center space-y-3">
            <Briefcase className="h-8 w-8 text-blue-400 mx-auto" />
            <h3 className="font-bold text-white text-sm">Revenus passifs</h3>
            <p className="text-xs text-slate-500">Monétisez vos cours 24h/24 via Mobile Money.</p>
          </div>
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-[2rem] text-center space-y-3">
            <BookOpen className="h-8 w-8 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-white text-sm">Outils IA</h3>
            <p className="text-xs text-slate-500">Utilisez MATHIAS pour corriger et assister vos élèves.</p>
          </div>
        </section>

        {/* --- FORMULAIRE --- */}
        <Card className="bg-slate-900 border-slate-800 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 border-b border-white/5">
            <CardTitle className="text-xl font-bold text-white uppercase tracking-tight">Formulaire de Candidature</CardTitle>
            <CardDescription>Parlez-nous de vous et de vos projets de formation.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-8 space-y-8">
                
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Domaine d'expertise</FormLabel>
                        <FormControl><Input placeholder="Ex: Développement Web, Design, Marketing..." {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whatsappNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">N° WhatsApp (Contact)</FormLabel>
                        <FormControl><Input placeholder="Ex: +236..." {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="professionalExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Parcours & Expérience</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Décrivez votre parcours professionnel en quelques lignes..." 
                          rows={4} 
                          {...field} 
                          className="bg-slate-800/50 border-slate-700 rounded-xl resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-6 border-t border-white/5 space-y-6">
                  <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em]">Votre premier cours</h3>
                  <FormField
                    control={form.control}
                    name="firstCourseTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Titre suggéré</FormLabel>
                        <FormControl><Input placeholder="Ex: Maîtriser Python pour la Data Science" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="firstCourseDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Description rapide</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Que vont apprendre les étudiants dans ce cours ?" 
                            rows={4} 
                            {...field} 
                            className="bg-slate-800/50 border-slate-700 rounded-xl resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em]">Réseaux & Liens</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="linkedinUrl"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2 bg-slate-800/30 p-1 rounded-xl border border-slate-700">
                            <div className="p-2 bg-blue-600/10 rounded-lg"><Linkedin className="h-4 w-4 text-blue-400" /></div>
                            <FormControl><Input placeholder="Lien LinkedIn" {...field} className="bg-transparent border-none focus-visible:ring-0 h-10" /></FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="portfolioUrl"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2 bg-slate-800/30 p-1 rounded-xl border border-slate-700">
                            <div className="p-2 bg-primary/10 rounded-lg"><Globe className="h-4 w-4 text-primary" /></div>
                            <FormControl><Input placeholder="Portfolio ou Site" {...field} className="bg-transparent border-none focus-visible:ring-0 h-10" /></FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

              </CardContent>
              <CardFooter className="p-8 bg-slate-900/50 border-t border-white/5 flex flex-col items-center">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 active:scale-[0.98] transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      Envoyer ma candidature
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
                <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Une équipe examinera votre demande sous 48h ouvrées.
                </p>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
