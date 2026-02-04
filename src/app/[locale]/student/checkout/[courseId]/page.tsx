
'use client';

/**
 * @fileOverview Page de paiement (Checkout) optimisée pour Moneroo.
 * Design Android-First, Esthétique Vintage "Ticket de Caisse".
 * Support multi-méthodes (MoMo, Carte) et bouton d'aide WhatsApp.
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
      // Ici, on appellerait normalement une Server Action pour créer une session Moneroo
      // via l'endpoint https://api.moneroo.io/v1/payments
      
      // Simulation de la préparation Moneroo
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({ 
        title: "Redirection Moneroo", 
        description: "Vous allez être redirigé vers la passerelle sécurisée." 
      });

      // Simulation de redirection vers Moneroo (en prod, on utiliserait l'URL fournie par l'API)
      // window.location.href = monerooCheckoutUrl;
      
      // Pour le prototype, on simule le succès après redirection
      router.push(`/student/courses/${courseId}`);

    } catch (error) {
      console.error("Moneroo Error:", error);
      toast({ 
        variant: 'destructive', 
        title: "Erreur de connexion", 
        description: "Impossible de joindre la passerelle de paiement." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (courseLoading) return <CheckoutSkeleton />;
  if (!course) return <div className="p-8 text-center text-slate-400">Cours introuvable.</div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-32 font-sans selection:bg-[#CC7722]/30">
      
      {/* --- HEADER FIXE --- */}
      <header className="p-4 flex items-center gap-4 bg-slate-900/80 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-xl">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full text-white">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-black uppercase tracking-tight text-white">Paiement Sécurisé</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* --- TICKET DE CAISSE VINTAGE --- */}
        <section className="relative">
          <div className="bg-[#fdf6e3] text-slate-900 p-6 rounded-t-sm shadow-xl relative overflow-hidden">
            {/* Texture papier */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/notebook.png')]" />
            
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 border-b border-slate-300 pb-2">
              Récapitulatif de commande
            </p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-start gap-4">
                <h2 className="text-sm font-bold leading-snug flex-1">{course.title}</h2>
                <span className="text-xs font-mono font-bold">x1</span>
              </div>
              
              <div className="border-t border-dashed border-slate-400 pt-4 flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase">Total à payer</span>
                <div className="text-right">
                  <p className="text-3xl font-black font-mono tracking-tighter">
                    {(course.price || 0).toLocaleString('fr-FR')}
                  </p>
                  <p className="text-[10px] font-bold uppercase opacity-60">Francs CFA (XOF)</p>
                </div>
              </div>
            </div>
          </div>
          {/* Bordure dentelée du bas */}
          <div className="h-2 w-full bg-[radial-gradient(circle,transparent_4px,#fdf6e3_4px)] bg-[length:12px_8px] bg-repeat-x" />
        </section>

        {/* --- MÉTHODES DE PAIEMENT --- */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
            Mode de règlement
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedMethod('momo')}
              className={cn(
                "flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-95",
                selectedMethod === 'momo' 
                  ? "border-[#CC7722] bg-[#CC7722]/5 shadow-lg" 
                  : "border-slate-800 bg-slate-900/40 opacity-60"
              )}
            >
              <Smartphone className={cn("h-6 w-6", selectedMethod === 'momo' ? "text-[#CC7722]" : "text-slate-500")} />
              <span className="text-[10px] font-black uppercase tracking-widest">Mobile Money</span>
              {selectedMethod === 'momo' && <CheckCircle2 className="h-4 w-4 text-[#CC7722] absolute top-2 right-2" />}
            </button>

            <button
              onClick={() => setSelectedMethod('card')}
              className={cn(
                "flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-95",
                selectedMethod === 'card' 
                  ? "border-[#CC7722] bg-[#CC7722]/5 shadow-lg" 
                  : "border-slate-800 bg-slate-900/40 opacity-60"
              )}
            >
              <CreditCard className={cn("h-6 w-6", selectedMethod === 'card' ? "text-[#CC7722]" : "text-slate-500")} />
              <span className="text-[10px] font-black uppercase tracking-widest">Carte / Visa</span>
              {selectedMethod === 'card' && <CheckCircle2 className="h-4 w-4 text-[#CC7722] absolute top-2 right-2" />}
            </button>
          </div>
        </section>

        {/* --- LOGOS DE CONFIANCE --- */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between opacity-50 grayscale contrast-125">
            <div className="h-6 w-12 relative"><Image src="https://upload.wikimedia.org/wikipedia/commons/a/ad/MTN_Logo.svg" alt="MTN" fill className="object-contain" /></div>
            <div className="h-6 w-12 relative"><Image src="https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg" alt="Orange" fill className="object-contain" /></div>
            <div className="h-6 w-12 relative"><Image src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" fill className="object-contain" /></div>
            <div className="h-6 w-12 relative"><Image src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" fill className="object-contain" /></div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Paiement traité par <span className="text-slate-300 font-bold">Moneroo</span>. Vos coordonnées bancaires ou MoMo sont protégées par un cryptage SSL 256 bits.
            </p>
          </div>
        </section>

        {/* --- BOUTON DE SUPPORT WHATSAPP DISCRET --- */}
        <a 
          href="https://wa.me/23675000000" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold transition-transform active:scale-95"
        >
          <MessageCircle className="h-4 w-4" />
          Une question ? Aide au paiement WhatsApp
        </a>

      </div>

      {/* --- CTA FIXE (FOOTER) --- */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800 z-40 safe-area-pb">
        <div className="max-w-md mx-auto">
          <Button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full h-16 rounded-2xl bg-[#CC7722] hover:bg-[#CC7722]/90 text-white shadow-2xl shadow-[#CC7722]/20 font-black uppercase tracking-widest text-sm transition-all active:scale-[0.97]"
          >
            {isProcessing ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Initialisation...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 mr-1" />
                Confirmer & Payer
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
      <Skeleton className="h-12 w-1/2 bg-slate-900 rounded-full" />
      <Skeleton className="h-48 w-full bg-slate-900 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 bg-slate-900 rounded-2xl" />
        <Skeleton className="h-24 bg-slate-900 rounded-2xl" />
      </div>
      <Skeleton className="h-32 w-full bg-slate-900 rounded-2xl" />
    </div>
  );
}
