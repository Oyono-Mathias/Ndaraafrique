
'use client';

/**
 * @fileOverview Page de paiement (Checkout) Mobile Money.
 * Design Android-First, Esthétique Vintage Ocre.
 * Gère la sélection d'opérateur et la création d'enrollment Firestore.
 */

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getFirestore, setDoc, serverTimestamp } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useRole } from '@/context/RoleContext';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Lock, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Course } from '@/lib/types';

const operators = [
  { id: 'mtn', name: 'MTN MoMo', color: 'bg-yellow-400', textColor: 'text-black', logo: 'MTN' },
  { id: 'orange', name: 'Orange Money', color: 'bg-[#FF6600]', textColor: 'text-white', logo: 'OM' },
  { id: 'wave', name: 'Wave', color: 'bg-[#00A3E0]', textColor: 'text-white', logo: 'W' },
];

export default function CheckoutPage() {
  const { courseId } = useParams();
  const router = useRouter();
  const { user, currentUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Récupération des infos du cours
  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId as string) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const handlePayment = async () => {
    if (!user || !course || !selectedOperator || phoneNumber.length < 8) {
      toast({ variant: 'destructive', title: "Informations incomplètes", description: "Veuillez sélectionner un opérateur et entrer votre numéro." });
      return;
    }

    setIsProcessing(true);

    try {
      // Simulation d'un délai de traitement passerelle
      await new Promise(resolve => setTimeout(resolve, 2500));

      const enrollmentId = `${user.uid}_${courseId}`;
      
      // 2. Création de l'inscription dans Firestore
      await setDoc(doc(db, 'enrollments', enrollmentId), {
        studentId: user.uid,
        courseId: courseId,
        instructorId: course.instructorId,
        enrollmentDate: serverTimestamp(),
        lastAccessedAt: serverTimestamp(),
        progress: 0,
        priceAtEnrollment: course.price,
        status: 'active',
        paymentMethod: selectedOperator,
        transactionId: `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      });

      // 3. Initialisation de la progression
      await setDoc(doc(db, 'course_progress', enrollmentId), {
        userId: user.uid,
        courseId: courseId,
        courseTitle: course.title,
        courseCover: course.imageUrl || '',
        progressPercent: 0,
        completedLessons: [],
        updatedAt: serverTimestamp(),
      });

      toast({ 
        title: "Paiement réussi !", 
        description: "Bienvenue dans votre nouvelle formation." 
      });

      // Redirection vers le lecteur
      router.push(`/student/courses/${courseId}`);

    } catch (error) {
      console.error("Payment error:", error);
      toast({ variant: 'destructive', title: "Échec du paiement", description: "Une erreur est survenue lors de la transaction." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (courseLoading) return <CheckoutSkeleton />;
  if (!course) return <div className="p-8 text-center">Cours introuvable.</div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-12 font-sans selection:bg-[#CC7722]/30">
      
      {/* --- HEADER --- */}
      <header className="p-4 flex items-center gap-4 bg-slate-900/50 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-white truncate">Finaliser l'inscription</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-8">
        
        {/* --- RÉSUMÉ COURS --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="relative h-16 w-24 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
            <Image src={course.imageUrl || `https://picsum.photos/seed/${courseId}/200/150`} alt={course.title} fill className="object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white line-clamp-1">{course.title}</h2>
            <p className="text-2xl font-black text-[#CC7722] mt-1">
              {(course.price || 0).toLocaleString('fr-FR')} <span className="text-[10px] uppercase opacity-60">XOF</span>
            </p>
          </div>
        </div>

        {/* --- SÉLECTEUR OPÉRATEUR --- */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <div className="h-px w-4 bg-slate-800" />
            Choisir votre opérateur
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {operators.map((op) => (
              <button
                key={op.id}
                onClick={() => setSelectedOperator(op.id)}
                className={cn(
                  "relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95",
                  selectedOperator === op.id 
                    ? "border-[#CC7722] bg-[#CC7722]/5 shadow-[0_0_20px_rgba(204,119,34,0.1)]" 
                    : "border-slate-800 bg-slate-900/40 opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                )}
              >
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center font-black text-sm shadow-xl", op.color, op.textColor)}>
                  {op.logo}
                </div>
                <span className="text-[10px] font-bold uppercase text-slate-300">{op.name}</span>
                {selectedOperator === op.id && (
                  <div className="absolute -top-2 -right-2 bg-[#CC7722] rounded-full p-1 shadow-lg">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* --- FORMULAIRE --- */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 ml-1">Numéro Mobile Money</label>
            <div className="relative">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <Input 
                type="tel"
                placeholder="00 00 00 00"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                className="h-14 pl-12 bg-slate-900 border-4 border-slate-800 rounded-2xl text-lg font-bold tracking-[0.1em] focus-visible:ring-[#CC7722]/20 focus-visible:border-[#CC7722]"
              />
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Vos informations sont chiffrées. Ndara Afrique ne stocke jamais vos codes secrets. La validation se fait directement sur votre téléphone.
            </p>
          </div>
        </section>

        {/* --- BOUTON DE PAIEMENT --- */}
        <footer className="pt-4">
          <Button 
            onClick={handlePayment}
            disabled={isProcessing || !selectedOperator || phoneNumber.length < 8}
            className="w-full h-16 rounded-2xl bg-[#CC7722] hover:bg-[#CC7722]/90 text-white shadow-2xl shadow-[#CC7722]/20 font-black uppercase tracking-wider text-base active:scale-[0.98] transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-5 w-5" />
                Payer {(course.price || 0).toLocaleString('fr-FR')} XOF
              </>
            )}
          </Button>
          <p className="text-center text-[10px] text-slate-600 mt-4 uppercase tracking-[0.15em] font-bold">
            Paiement 100% sécurisé via Ndara Pay
          </p>
        </footer>

      </div>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 space-y-8">
      <Skeleton className="h-12 w-1/2 bg-slate-900 rounded-full" />
      <Skeleton className="h-24 w-full bg-slate-900 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 bg-slate-900 rounded-2xl" />
        <Skeleton className="h-24 bg-slate-900 rounded-2xl" />
        <Skeleton className="h-24 bg-slate-900 rounded-2xl" />
      </div>
      <Skeleton className="h-14 w-full bg-slate-900 rounded-2xl" />
      <Skeleton className="h-16 w-full bg-slate-900 rounded-2xl" />
    </div>
  );
}
