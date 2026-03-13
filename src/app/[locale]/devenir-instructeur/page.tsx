'use client';

/**
 * @fileOverview Page de candidature pour devenir instructeur sur Ndara Afrique.
 * ✅ DESIGN QWEN : Immersion totale, cards de valeur, formulaire épuré.
 * ✅ LOGIQUE : Soumission sécurisée vers la collection 'users' avec état de suivi.
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
  Linkedin,
  Star,
  FileText,
  Smartphone,
  ShieldCheck,
  Clock,
  Headset,
  X,
  Send,
  Zap,
  Coins
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

  if (isUserLoading) {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-950">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  // --- ÉTAT 1 : DÉJÀ APPROUVÉ ---
  if (currentUser?.isInstructorApproved) {
    return (
      <div className="max-w-md mx-auto py-32 px-6 text-center space-y-8 animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto shadow-2xl">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
        <div className="space-y-2">
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Accès Activé</h1>
            <p className="text-slate-400 font-medium leading-relaxed">Votre compte expert est opérationnel. Commencez à bâtir votre académie dès maintenant.</p>
        </div>
        <Button onClick={() => router.push('/instructor/dashboard')} className="w-full h-16 rounded-[2rem] bg-primary text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
          Aller au Dashboard Formateur
        </Button>
      </div>
    );
  }

  // --- ÉTAT 2 : CANDIDATURE EN COURS (ROQUETTE) ---
  if (currentUser?.instructorApplication?.submittedAt) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 animate-in fade-in duration-500 overflow-y-auto">
        <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
            <div className="w-32 h-32 mb-8 relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center shadow-2xl relative z-10 animate-bounce" style={{ animationDuration: '3s' }}>
                    <Rocket className="h-14 w-14 text-slate-950" />
                </div>
            </div>

            <h2 className="font-black text-3xl text-white text-center mb-2 uppercase tracking-tight">Candidature Envoyée !</h2>
            <p className="text-slate-500 text-sm text-center mb-8 max-w-[280px] font-medium italic">
                "Notre équipe pédagogique examine votre profil. Vous recevrez une réponse sous 48-72h."
            </p>

            <div className="w-full max-w-sm bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Clock className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-black text-white text-sm uppercase">Statut</p>
                        <p className="text-primary text-[10px] font-black uppercase tracking-widest">En cours d'examen</p>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <span>Progression de l'audit</span>
                        <span className="text-white">Étape 1/3</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: '33%' }} />
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-4">
                    <StepItem done title="Soumission reçue" />
                    <StepItem current title="Examen technique & pédagogique" />
                    <StepItem title="Entretien & Activation" />
                </div>
            </div>

            <div className="mt-10 flex gap-3 w-full max-w-sm">
                <Button variant="outline" onClick={() => router.push('/student/dashboard')} className="flex-1 h-14 rounded-2xl border-white/5 bg-slate-900 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                    RETOUR
                </Button>
                <Button onClick={() => router.push('/student/support')} className="flex-1 h-14 rounded-2xl bg-primary text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                    <Headset className="mr-2 h-4 w-4" />
                    SUPPORT
                </Button>
            </div>
        </div>
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
    <div className="max-w-md mx-auto pb-32 bg-[#0f172a] min-h-screen relative overflow-hidden font-sans">
      <div className="grain-overlay" />
      
      {/* --- HEADER --- */}
      <header className="px-6 pt-12 pb-8 space-y-6 relative z-10">
        <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500">
                <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary to-blue-600 shadow-lg animate-pulse-glow">
                <Star className="h-3 w-3 text-white fill-current" />
                <span className="text-white text-[9px] font-black uppercase tracking-widest">Pionnier Ndara</span>
                <Star className="h-3 w-3 text-white fill-current" />
            </div>
            <div className="w-10" />
        </div>

        <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
                PARTAGEZ VOTRE SAVOIR,<br/>
                <span className="text-primary">INSPIREZ L'AFRIQUE</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium italic">"Rejoignez l'élite des formateurs du continent."</p>
        </div>
      </header>

      <main className="px-6 space-y-10 relative z-10">
        
        {/* --- BENEFITS --- */}
        <section className="grid grid-cols-1 gap-4">
            <ValueCard 
                icon={Award} 
                title="Reconnaissance" 
                desc="Devenez une référence. Badge vérifié et mise en avant stratégique de votre profil." 
                color="text-primary bg-primary/10" 
            />
            <ValueCard 
                icon={Coins} 
                title="Revenus Passifs" 
                desc="Gagnez jusqu'à 70% de commission. Retraits directs via Mobile Money." 
                color="text-orange-400 bg-orange-500/10" 
            />
            <ValueCard 
                icon={Bot} 
                title="Co-pilote MATHIAS" 
                desc="Notre IA vous assiste pour structurer et améliorer vos formations en continu." 
                color="text-blue-400 bg-blue-500/10" 
                badge="IA"
            />
        </section>

        {/* --- FORM --- */}
        <section className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <FileText size={20} />
                </div>
                <h3 className="font-black text-white text-sm uppercase tracking-widest">Ma Candidature</h3>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="specialty" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Domaine d'expertise</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Trading, AgriTech, Code..." {...field} className="h-14 bg-slate-950 border-white/5 rounded-2xl text-white focus-visible:ring-primary/30" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>

                    <FormField control={form.control} name="professionalExperience" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Votre parcours</FormLabel>
                            <FormControl>
                                <Textarea rows={4} placeholder="Décrivez votre expérience et vos succès..." {...field} className="bg-slate-950 border-white/5 rounded-2xl text-white resize-none p-4" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>

                    <div className="pt-4 border-t border-white/5 space-y-6">
                        <h4 className="text-xs font-black text-primary uppercase tracking-[0.3em]">PROJET DE FORMATION</h4>
                        <FormField control={form.control} name="firstCourseTitle" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Titre du cours</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Trading Forex pour Débutants" {...field} className="h-14 bg-slate-950 border-white/5 rounded-2xl text-white" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="firstCourseDescription" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Objectifs pédagogiques</FormLabel>
                                <FormControl>
                                    <Textarea rows={4} placeholder="Que vont apprendre vos étudiants ?" {...field} className="bg-slate-950 border-white/5 rounded-2xl text-white resize-none p-4" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-6">
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.3em]">COORDONNÉES</h4>
                        <div className="space-y-4">
                            <FormField control={form.control} name="whatsappNumber" render={({ field }) => (
                                <FormItem>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500"><Smartphone size={18}/></div>
                                        <FormControl><Input placeholder="WhatsApp (+236...)" {...field} className="h-14 pl-12 bg-slate-950 border-white/5 rounded-2xl text-white" /></FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                                <FormItem>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"><Linkedin size={18}/></div>
                                        <FormControl><Input placeholder="Lien LinkedIn" {...field} className="h-14 pl-12 bg-slate-950 border-white/5 rounded-2xl text-white" /></FormControl>
                                    </div>
                                </FormItem>
                            )}/>
                        </div>
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-[0.98] mt-6">
                        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Envoyer ma candidature <Send className="ml-2 h-4 w-4" /></>}
                    </Button>
                </form>
            </Form>
        </section>

        {/* --- FAQ --- */}
        <section className="bg-slate-900/30 border border-white/5 rounded-[2.5rem] p-6 space-y-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">QUESTIONS FRÉQUENTES</h3>
            <div className="space-y-4">
                <FaqItem q="Combien puis-je gagner ?" a="Jusqu'à 70% de commission sur chaque vente directe, plus des bonus de performance mensuels." />
                <FaqItem q="Délai de validation ?" a="Notre équipe pédagogique examine les dossiers sous 48h à 72h ouvrées." />
                <FaqItem q="Aide à la création ?" a="Oui ! Mathias IA vous assiste pour structurer vos modules et quiz." />
            </div>
        </section>

        <p className="text-center text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] pb-12">Ndara Afrique • Excellence Network</p>
      </main>
    </div>
  );
}

function ValueCard({ icon: Icon, title, desc, color, badge }: any) {
    return (
        <div className="bg-slate-900 border border-white/5 p-5 rounded-[2rem] flex items-center gap-5 shadow-xl active:scale-[0.98] transition-transform">
            <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 relative", color)}>
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

function StepItem({ title, done = false, current = false }: { title: string, done?: boolean, current?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border",
                done ? "bg-primary border-primary text-slate-950" : current ? "border-primary text-primary" : "border-slate-800 text-slate-700"
            )}>
                {done ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-black">{current ? '2' : '3'}</span>}
            </div>
            <span className={cn(
                "text-xs font-bold",
                done ? "text-slate-500 line-through" : current ? "text-white" : "text-slate-700"
            )}>{title}</span>
        </div>
    );
}

function FaqItem({ q, a }: { q: string, a: string }) {
    return (
        <div className="space-y-1">
            <p className="font-bold text-white text-[13px] uppercase tracking-tight">{q}</p>
            <p className="text-slate-500 text-xs font-medium leading-relaxed italic">{a}</p>
        </div>
    );
}
