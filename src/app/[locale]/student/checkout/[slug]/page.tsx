'use client';

/**
 * @fileOverview Page de paiement (Checkout) unifiée.
 * ✅ RÉSOLU : Utilisation du paramètre unique [slug] pour éviter les conflits Next.js.
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getFirestore } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Lock, 
  Loader2, 
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Course } from '@/lib/types';
import { Card } from '@/components/ui/card';

export default function CheckoutPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { user } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [isProcessing, setIsProcessing] = useState(false);

  const courseRef = useMemo(() => slug ? doc(db, 'courses', slug) : null, [db, slug]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const handlePayment = async () => {
    if (!user || !course) return;
    setIsProcessing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({ title: "Redirection Moneroo..." });
      router.push(`/courses/${slug}`);
    } catch (error) {
      toast({ variant: 'destructive', title: "Erreur technique" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (courseLoading) return <div className="p-8"><Skeleton className="h-64 w-full rounded-3xl" /></div>;
  if (!course) return <div className="p-8 text-center text-slate-400">Formation non trouvée.</div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-32 font-sans">
      <header className="p-4 flex items-center gap-4 bg-slate-900/80 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-xl">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full text-white">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-black uppercase tracking-[0.15em] text-white">Validation Ndara</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-8 mt-10">
        <Card className="bg-[#fdf6e3] text-slate-900 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden border-none">
            <div className="space-y-6">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Facture Pro-forma</p>
                <h2 className="text-xl font-black uppercase leading-tight text-center">{course.title}</h2>
                <div className="border-t-2 border-dashed border-slate-300 pt-6 flex justify-between items-baseline">
                    <span className="text-[10px] font-black uppercase">Prix Net</span>
                    <div className="text-right">
                        <p className="text-4xl font-black">{(course.price || 0).toLocaleString('fr-FR')}</p>
                        <p className="text-[9px] font-bold uppercase opacity-60">CFA (XOF)</p>
                    </div>
                </div>
            </div>
        </Card>

        <div className="space-y-4">
            <Button onClick={handlePayment} disabled={isProcessing} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin"/> : <><Lock className="mr-2 h-4 w-4"/> Finaliser l'achat</>}
            </Button>
        </div>
      </div>
    </div>
  );
}
