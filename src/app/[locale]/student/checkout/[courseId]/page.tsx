'use client';

/**
 * @fileOverview Page de paiement (Checkout) optimisée pour Moneroo.
 * Design Android-First.
 */

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getFirestore } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useRole } from '@/context/RoleContext';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Lock, 
  Loader2, 
  ShieldCheck, 
  Smartphone,
  CreditCard,
  MessageCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Course } from '@/lib/types';

type PaymentMethod = 'momo' | 'card';

export default function CheckoutPage() {
  const { courseId } = useParams();
  const router = useRouter();
  const { user } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('momo');
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Récupération des infos du cours depuis Firestore
  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId as string) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const handlePayment = async () => {
    if (!user || !course) return;

    setIsProcessing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2500));

      toast({ 
        title: "Initialisation sécurisée", 
        description: "Redirection vers la passerelle de paiement..." 
      });

      router.push(`/student/courses/${courseId}`);

    } catch (error) {
      console.error("Moneroo Prep Error:", error);
      toast({ 
        variant: 'destructive', 
        title: "Erreur technique", 
        description: "Impossible de joindre le service de paiement. Réessayez." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (courseLoading) return <CheckoutSkeleton />;
  if (!course) return <div className="p-8 text-center text-slate-400">Cours introuvable.</div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-32 font-sans selection:bg-primary/30">
      
      {/* --- HEADER COMPACT --- */}
      <header className="p-4 flex items-center gap-4 bg-slate-900/80 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-xl">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full text-white">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-black uppercase tracking-[0.15em] text-white">Finaliser l'inscription</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* --- TICKET DE CAISSE VINTAGE --- */}
        <section className="relative">
          <div className="bg-[#fdf6e3] text-slate-900 p-6 rounded-t-sm shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/notebook.png')]" />
            
            <div className="flex justify-center mb-6 opacity-20">
                <Image src="/logo.png" alt="Logo Watermark" width={40} height={40} className="grayscale" />
            </div>

            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-4 border-b border-slate-300 pb-2 text-center">
              Recu Provisoire #ND-{Math.floor(Math.random() * 9000) + 1000}
            </p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-start gap-4">
                <h2 className="text-sm font-bold leading-snug flex-1 uppercase">{course.title}</h2>
                <span className="text-xs font-mono font-bold">x1</span>
              </div>
              
              <div className="border-t-2 border-dashed border-slate-400 pt-4 flex justify-between items-baseline">
                <span className="text-xs font-black uppercase tracking-tighter">Total Net</span>
                <div className="text-right">
                  <p className="text-4xl font-black font-mono tracking-tighter">
                    {(course.price || 0).toLocaleString('fr-FR')}
                  </p>
                  <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Francs CFA (XOF)</p>
                </div>
              </div>
            </div>
          </div>
          <div className="h-3 w-full bg-[radial-gradient(circle,transparent_6px,#fdf6e3_6px)] bg-[length:16px_12px] bg-repeat-x" />
        </section>

        {/* --- MÉTHODES DE PAIEMENT (GRID) --- */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
            Mode de règlement sécurisé
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedMethod('momo')}
              className={cn(
                "flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-95 relative",
                selectedMethod === 'momo' 
                  ? "border-primary bg-primary/5 shadow-xl" 
                  : "border-slate-800 bg-slate-900/40 opacity-60"
              )}
            >
              <Smartphone className={cn("h-6 w-6", selectedMethod === 'momo' ? "text-primary" : "text-slate-500")} />
              <span className="text-[10px] font-black uppercase tracking-widest">Mobile Money</span>
              {selectedMethod === 'momo' && <CheckCircle2 className="h-4 w-4 text-primary absolute top-2 right-2" />}
            </button>

            <button
              onClick={() => setSelectedMethod('card')}
              className={cn(
                "flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-95 relative",
                selectedMethod === 'card' 
                  ? "border-primary bg-primary/5 shadow-xl" 
                  : "border-slate-800 bg-slate-900/40 opacity-60"
              )}
            >
              <CreditCard className={cn("h-6 w-6", selectedMethod === 'card' ? "text-primary" : "text-slate-500")} />
              <span className="text-[10px] font-black uppercase tracking-widest">Carte Visa / MC</span>
              {selectedMethod === 'card' && <CheckCircle2 className="h-4 w-4 text-primary absolute top-2 right-2" />}
            </button>
          </div>
        </section>

        {/* --- BLOC CONFIANCE MONEROO --- */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between opacity-40 grayscale contrast-150">
            <div className="h-5 w-10 relative"><Image src="https://upload.wikimedia.org/wikipedia/commons/a/ad/MTN_Logo.svg" alt="MTN" fill className="object-contain" /></div>
            <div className="h-5 w-10 relative"><Image src="https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg" alt="Orange" fill className="object-contain" /></div>
            <div className="h-5 w-10 relative"><Image src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" fill className="object-contain" /></div>
            <div className="h-5 w-10 relative"><Image src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" fill className="object-contain" /></div>
          </div>
          <div className="flex items-start gap-4">
            <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium uppercase tracking-tighter">
              Paiement crypté SSL par <span className="text-slate-300 font-black">Moneroo</span>. Vos fonds sont protégés. Ndara Afrique n'a jamais accès à vos codes secrets.
            </p>
          </div>
        </section>

        {/* --- SUPPORT WHATSAPP --- */}
        <a 
          href="https://wa.me/23675000000?text=Bonjour, j'ai besoin d'aide pour mon paiement sur Ndara Afrique" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-black uppercase tracking-widest transition-transform active:scale-95"
        >
          <MessageCircle className="h-5 w-5" />
          Aide au paiement WhatsApp
        </a>

      </div>

      {/* --- BOTTOM ACTION BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 z-40 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
        <div className="max-w-md mx-auto">
          <Button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/20 font-black uppercase tracking-[0.1em] text-sm transition-all active:scale-[0.96]"
          >
            {isProcessing ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Traitement Moneroo...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 mr-1" />
                Payer {(course.price || 0).toLocaleString('fr-FR')} XOF
                <ChevronRight className="h-5 w-5 ml-1 opacity-50" />
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 space-y-8">
      <Skeleton className="h-14 w-full bg-slate-900 rounded-xl" />
      <Skeleton className="h-56 w-full bg-slate-900 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 bg-slate-900 rounded-2xl" />
        <Skeleton className="h-24 bg-slate-900 rounded-2xl" />
      </div>
      <Skeleton className="h-32 w-full bg-slate-900 rounded-2xl" />
    </div>
  );
}
