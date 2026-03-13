'use client';

/**
 * @fileOverview Page de candidature pour devenir instructeur sur Ndara Afrique.
 * ✅ DESIGN : Prêt pour l'intégration Qwen.
 * ✅ LOGIQUE : Soumission sécurisée vers la collection 'users'.
 */

import { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  Rocket, 
  CheckCircle2, 
  Loader2, 
  ChevronRight, 
  Award,
  BookOpen,
  Briefcase,
  Bot,
  Globe,
  Linkedin
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const applicationSchema = z.object({
  specialty: z.string().min(3, "Précisez votre domaine."),
  professionalExperience: z.string().min(50, "Détaillez votre parcours (min. 50 caract.)."),
  firstCourseTitle: z.string().min(5, "Titre requis."),
  firstCourseDescription: z.string().min(50, "Description requise (min. 50 caract.)."),
  whatsappNumber: z.string().min(8, "Numéro requis."),
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

  if (isUserLoading) return <div className="flex h-screen items-center justify-center bg-[#0f172a]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  // Si déjà instructeur
  if (currentUser?.isInstructorApproved) {
    return (
      <div className="max-w-md mx-auto py-32 px-6 text-center space-y-6">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto shadow-2xl">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Accès Activé</h1>
        <p className="text-slate-400 font-medium">Votre compte expert est opérationnel. Commencez à bâtir votre académie.</p>
        <Button onClick={() => router.push('/instructor/dashboard')} className="w-full h-16 rounded-[2rem] bg-primary text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl">
          Aller au Dashboard
        </Button>
      </div>
    );
  }

  // Si candidature déjà envoyée
  if (currentUser?.instructorApplication?.submittedAt) {
    return (
      <div className="max-w-md mx-auto py-32 px-6 text-center space-y-8 animate-in fade-in duration-1000">
        <div className="relative inline-block">
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="w-24 h-24 bg-slate-900 border-2 border-primary/30 rounded-full flex items-center justify-center mx-auto relative z-10 shadow-2xl">
                <Rocket className="h-12 w-12 text-primary animate-float" />
            </div>
        </div>
        <div className="space-y-3">
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Audit en cours</h1>
            <p className="text-slate-400 text-sm leading-relaxed font-medium italic">
                "Bara ala, votre demande est entre de bonnes mains. Notre équipe pédagogique analyse votre profil."
            </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/student/dashboard')} className="w-full h-14 rounded-2xl border-slate-800 text-slate-500 font-black uppercase text-[10px] tracking-widest">
          Retourner à mes cours
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

      toast({ title: "Candidature transmise !", description: "Vous recevrez une réponse sous 48h." });
      router.refresh();
    } catch (error) {
      toast({ variant: 'destructive', title: "Échec de l'envoi" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-32 px-6 bg-ndara-bg min-h-screen relative overflow-hidden">
      <div className="grain-overlay" />
      
      <header className="py-16 text-center space-y-6 relative z-10">
        <Badge className="bg-primary/10 text-primary border-none uppercase font-black text-[10px] tracking-[0.3em] px-4 py-1.5 mb-2">
          Devenir Formateur
        </Badge>
        <h1 className="text-4xl md:text-6xl font-black text-white leading-none uppercase tracking-tight">
          Inspirez <br/><span className="text-primary">l'Afrique.</span>
        </h1>
        <p className="text-slate-500 text-lg max-w-xl mx-auto font-medium italic">
          "Partagez votre expertise et rejoignez l'élite des bâtisseurs du savoir africain."
        </p>
      </header>

      <div className="grid gap-12 relative z-10">
        {/* Avantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <BenefitCard icon={Award} title="Prestige" sub="Validation certifiée" />
          <BenefitCard icon={Briefcase} title="Revenus" sub="Cash-out direct" />
          <BenefitCard icon={Bot} title="IA Mathias" sub="Correction assistée" />
        </section>

        {/* Formulaire */}
        <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="specialty" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Spécialité</FormLabel>
                    <FormControl><Input placeholder="Ex: Finance, Code, AgriTech" {...field} className="h-12 bg-slate-950 border-white/5 rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="whatsappNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">WhatsApp</FormLabel>
                    <FormControl><Input placeholder="+236 ..." {...field} className="h-12 bg-slate-950 border-white/5 rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>

              <FormField control={form.control} name="professionalExperience" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Votre Parcours</FormLabel>
                  <FormControl><Textarea rows={4} placeholder="Décrivez votre expérience en quelques lignes..." {...field} className="bg-slate-950 border-white/5 rounded-xl resize-none" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <div className="pt-6 border-t border-white/5 space-y-6">
                <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em]">Votre projet de cours</h3>
                <FormField control={form.control} name="firstCourseTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 ml-1">Titre</FormLabel>
                    <FormControl><Input placeholder="Titre de votre première formation" {...field} className="h-12 bg-slate-950 border-white/5 rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="firstCourseDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 ml-1">Objectifs</FormLabel>
                    <FormControl><Textarea rows={4} placeholder="Que vont apprendre vos étudiants ?" {...field} className="bg-slate-950 border-white/5 rounded-xl resize-none" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-white/5">
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Linkedin size={16}/></div>
                      <FormControl><Input placeholder="Lien LinkedIn" {...field} className="border-none bg-transparent focus-visible:ring-0" /></FormControl>
                    </div>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="portfolioUrl" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-white/5">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg"><Globe size={16}/></div>
                      <FormControl><Input placeholder="Site / Portfolio" {...field} className="border-none bg-transparent focus-visible:ring-0" /></FormControl>
                    </div>
                  </FormItem>
                )}/>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-[0.98]">
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Envoyer ma candidature <ChevronRight className="ml-2 h-4 w-4"/></>}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

function BenefitCard({ icon: Icon, title, sub }: { icon: any, title: string, sub: string }) {
    return (
        <div className="p-6 bg-slate-900/50 border border-white/5 rounded-[2rem] text-center space-y-3 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <h3 className="text-white font-black text-xs uppercase tracking-tight">{title}</h3>
                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-1">{sub}</p>
            </div>
        </div>
    );
}
