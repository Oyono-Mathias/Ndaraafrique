'use client';

/**
 * @fileOverview Page de candidature pour devenir instructeur sur Ndara Afrique.
 * ✅ SÉCURITÉ : Vérification du paramètre 'allowInstructorSignup' avant d'autoriser l'envoi.
 */

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
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
  Award,
  Bot,
  FileText,
  Smartphone,
  Send,
  Coins,
  ArrowLeft,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Settings } from '@/lib/types';

const applicationSchema = z.object({
  specialty: z.string().min(3, "Précisez votre domaine."),
  professionalExperience: z.string().min(50, "Détaillez votre parcours (min. 50 caract.)."),
  firstCourseTitle: z.string().min(5, "Titre requis."),
  firstCourseDescription: z.string().min(50, "Description requise (min. 50 caract.)."),
  whatsappNumber: z.string().min(8, "Numéro requis."),
  portfolioUrl: z.string().url("URL invalide").or(z.literal('')).optional(),
  linkedinUrl: z.string().url("URL LinkedIn invalide").or(z.literal('')).optional(),
  youtubeUrl: z.string().url("URL YouTube invalide").or(z.literal('')).optional(),
});

type ApplicationValues = z.infer<typeof applicationSchema>;

export default function DevenirInstructeurPage() {
  const { currentUser, user, isUserLoading } = useRole();
  const { toast } = useToast();
  const router = useRouter();
  const db = getFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

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
      youtubeUrl: '',
    },
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) setSettings(snap.data() as Settings);
    });
    return () => unsub();
  }, [db]);

  if (isUserLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  // 🛡️ SÉCURITÉ : Vérifier si le recrutement est fermé
  if (settings && settings.platform?.allowInstructorSignup === false) {
      return (
        <div className="max-w-md mx-auto py-32 px-6 text-center space-y-8 animate-in fade-in duration-700">
            <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                <ShieldAlert className="h-12 w-12 text-amber-500" />
            </div>
            <div className="space-y-2">
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Recrutement Suspendu</h1>
                <p className="text-slate-400 font-medium leading-relaxed">
                    Nous ne recrutons plus de nouveaux experts pour le moment. Revenez ultérieurement !
                </p>
            </div>
            <Button onClick={() => router.push('/')} className="w-full h-16 rounded-[2rem] bg-slate-900 border border-white/5 text-white font-black uppercase text-xs">
                Retour à l'accueil
            </Button>
        </div>
      );
  }

  if (currentUser?.isInstructorApproved) {
    return (
      <div className="max-w-md mx-auto py-32 px-6 text-center space-y-8 animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto shadow-2xl">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
        <div className="space-y-2">
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Accès Activé</h1>
            <p className="text-slate-400 font-medium leading-relaxed">Votre compte expert est opérationnel.</p>
        </div>
        <button onClick={() => router.push('/instructor/dashboard')} className="w-full h-16 rounded-[2rem] bg-primary text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl">
          Aller au Dashboard Formateur
        </button>
      </div>
    );
  }

  if (currentUser?.instructorApplication?.submittedAt && currentUser.instructorApplication.status === 'pending') {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-8">
                <Rocket className="h-12 w-12 text-primary animate-bounce" />
            </div>
            <h2 className="font-black text-3xl text-white uppercase mb-2">Dossier en Examen</h2>
            <p className="text-slate-500 text-sm max-w-[280px] italic">"Le jury Ndara analyse votre projet. Réponse sous 48h."</p>
            <Button onClick={() => router.push('/student/dashboard')} className="mt-10 h-14 rounded-2xl bg-slate-900 text-slate-400 border border-white/5 font-black uppercase text-[10px] px-8">Retour au Dashboard</Button>
      </div>
    );
  }

  const onSubmit = async (values: ApplicationValues) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const isAutoApprove = settings?.instructors?.autoApproval === true;

      const payload = {
        role: isAutoApprove ? 'instructor' : 'student',
        isInstructorApproved: isAutoApprove,
        instructorApplication: {
          ...values,
          submittedAt: serverTimestamp(),
          status: isAutoApprove ? 'accepted' : 'pending',
          decisionDate: isAutoApprove ? serverTimestamp() : null
        }
      };

      await updateDoc(userRef, payload);

      if (isAutoApprove) {
          toast({ title: "Félicitations Expert !", description: "Votre compte a été activé automatiquement." });
          router.push('/instructor/dashboard');
      } else {
          toast({ title: "Candidature transmise !", description: "Vous recevrez une réponse sous 48h." });
          router.refresh();
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Échec de l'envoi" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pb-32 bg-[#0f172a] min-h-screen relative overflow-hidden font-sans">
      <div className="grain-overlay opacity-[0.03]" />
      
      <header className="px-6 pt-12 pb-8 space-y-6 relative z-10">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 active:scale-90"><ArrowLeft size={20} /></button>
        <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">PARTAGEZ VOTRE SAVOIR,<br/><span className="text-primary">INSPIREZ L'AFRIQUE</span></h1>
            <p className="text-slate-500 text-sm font-medium italic">"Rejoignez l'élite des formateurs du continent."</p>
        </div>
      </header>

      <main className="px-6 space-y-10 relative z-10">
        <section className="grid grid-cols-1 gap-4">
            <ValueCard icon={Award} title="Reconnaissance" desc="Badge vérifié et visibilité premium." color="text-primary bg-primary/10" />
            <ValueCard icon={Coins} title="Revenus Passifs" desc="Retraits directs via Mobile Money." color="text-orange-400 bg-orange-500/10" />
            <ValueCard icon={Bot} title="Assistant MATHIAS" desc="IA pour structurer vos cours." color="text-blue-400 bg-blue-500/10" badge="IA" />
        </section>

        <section className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><FileText size={20} /></div>
                <h3 className="font-black text-white text-sm uppercase tracking-widest">Ma Candidature</h3>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="specialty" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Domaine d'expertise</FormLabel>
                            <FormControl><Input placeholder="Ex: Trading, AgriTech, Code..." {...field} className="h-14 bg-slate-950 border-white/5 rounded-2xl text-white" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>

                    <FormField control={form.control} name="professionalExperience" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Votre parcours</FormLabel>
                            <FormControl><Textarea rows={4} placeholder="Décrivez votre succès..." {...field} className="bg-slate-950 border-white/5 rounded-2xl text-white resize-none p-4" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>

                    <div className="pt-4 border-t border-white/5 space-y-6">
                        <h4 className="text-xs font-black text-primary uppercase tracking-[0.3em]">PROJET DE FORMATION</h4>
                        <FormField control={form.control} name="firstCourseTitle" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Titre du cours</FormLabel>
                                <FormControl><Input placeholder="Ex: Trading Forex Débutants" {...field} className="h-14 bg-slate-950 border-white/5 rounded-2xl text-white" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="firstCourseDescription" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Objectifs</FormLabel>
                                <FormControl><Textarea rows={4} placeholder="Que vont apprendre vos Ndara ?" {...field} className="bg-slate-950 border-white/5 rounded-2xl text-white resize-none p-4" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-4">
                        <FormField control={form.control} name="whatsappNumber" render={({ field }) => (
                            <FormItem>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500"><Smartphone size={18}/></div>
                                    <FormControl><Input placeholder="WhatsApp (+236...)" {...field} className="h-14 pl-12 bg-slate-950 border-white/5 rounded-2xl text-white" /></FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Soumettre ma candidature <Send className="ml-2 h-4 w-4" /></>}
                    </button>
                </form>
            </Form>
        </section>
      </main>
    </div>
  );
}

function ValueCard({ icon: Icon, title, desc, color, badge }: any) {
    return (
        <div className="bg-slate-900 border border-white/5 p-5 rounded-[2rem] flex items-center gap-5 shadow-xl transition-transform active:scale-95">
            <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 relative shadow-inner", color)}>
                <Icon className="h-8 w-8" />
                {badge && <span className="absolute -top-1 -right-1 bg-white text-slate-950 px-1.5 py-0.5 rounded-lg text-[7px] font-black uppercase">{badge}</span>}
            </div>
            <div className="flex-1">
                <h3 className="font-black text-white text-sm uppercase tracking-tight mb-1">{title}</h3>
                <p className="text-slate-500 text-[10px] leading-relaxed font-medium italic">{desc}</p>
            </div>
        </div>
    );
}
