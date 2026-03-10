'use client';

/**
 * @fileOverview Tunnel de paiement unifié avec support des coupons.
 * Calcule dynamiquement les remises et sécurise la transaction.
 */

import { useState, useMemo } from 'react';
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
  Ticket,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Course } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { validateCouponAction } from '@/actions/couponActions';

export default function CheckoutPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { user } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);

  const courseRef = useMemo(() => slug ? doc(db, 'courses', slug) : null, [db, slug]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const discountedPrice = useMemo(() => {
    if (!course) return 0;
    if (!appliedCoupon) return course.price;

    if (appliedCoupon.discountType === 'percentage') {
      return Math.max(0, course.price - (course.price * appliedCoupon.discountValue) / 100);
    } else {
      return Math.max(0, course.price - appliedCoupon.discountValue);
    }
  }, [course, appliedCoupon]);

  const handleValidateCoupon = async () => {
    if (!couponCode.trim() || !course) return;
    setIsValidating(true);
    const result = await validateCouponAction(couponCode, course.id);
    if (result.success) {
      setAppliedCoupon(result.coupon);
      toast({ title: "Remise appliquée !" });
    } else {
      setAppliedCoupon(null);
      toast({ variant: 'destructive', title: "Erreur", description: result.error });
    }
    setIsValidating(false);
  };

  const handlePayment = async () => {
    if (!user || !course) return;
    setIsProcessing(true);

    try {
      // Simulation Moneroo avec injection du prix réduit
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({ title: "Redirection Moneroo..." });
      
      // Ici on passerait les métadonnées incluant le couponId pour le webhook
      console.log("Paiement initié:", {
          amount: discountedPrice,
          couponId: appliedCoupon?.id || null,
          courseId: course.id
      });

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

      <div className="p-4 max-w-md mx-auto space-y-8 mt-10 animate-in fade-in duration-700">
        <Card className="bg-[#fdf6e3] text-slate-900 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden border-none">
            <div className="space-y-6">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Facture Pro-forma</p>
                <h2 className="text-xl font-black uppercase leading-tight text-center">{course.title}</h2>
                
                <div className="border-t-2 border-dashed border-slate-300 pt-6 space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                        <span>Prix initial</span>
                        <span>{course.price.toLocaleString('fr-FR')} XOF</span>
                    </div>
                    
                    {appliedCoupon && (
                        <div className="flex justify-between items-center text-[10px] font-bold text-emerald-600 uppercase">
                            <span>Remise ({appliedCoupon.code})</span>
                            <span>-{ (course.price - discountedPrice).toLocaleString('fr-FR') } XOF</span>
                        </div>
                    )}

                    <div className="pt-2 flex justify-between items-baseline">
                        <span className="text-[10px] font-black uppercase">Net à payer</span>
                        <div className="text-right">
                            <p className="text-4xl font-black text-primary">{discountedPrice.toLocaleString('fr-FR')}</p>
                            <p className="text-[9px] font-bold uppercase opacity-60">CFA (XOF)</p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>

        {/* Section Code Promo */}
        <div className="space-y-3">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Un code de réduction ?</p>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Input 
                        placeholder="Entrez votre code..." 
                        value={couponCode} 
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="h-14 bg-slate-900 border-slate-800 rounded-2xl text-white pr-10"
                        disabled={!!appliedCoupon}
                    />
                    {appliedCoupon ? (
                        <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                    ) : (
                        <Ticket className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-700" />
                    )}
                </div>
                {appliedCoupon ? (
                    <Button 
                        variant="ghost" 
                        onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                        className="h-14 px-4 rounded-2xl text-red-400 font-black uppercase text-[10px]"
                    >
                        Annuler
                    </Button>
                ) : (
                    <Button 
                        onClick={handleValidateCoupon}
                        disabled={isValidating || !couponCode.trim()}
                        className="h-14 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-[10px]"
                    >
                        {isValidating ? <Loader2 className="h-4 w-4 animate-spin"/> : "Appliquer"}
                    </Button>
                )}
            </div>
        </div>

        <div className="space-y-4">
            <Button onClick={handlePayment} disabled={isProcessing} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin"/> : <><Lock className="mr-2 h-4 w-4"/> Payer via Moneroo</>}
            </Button>
            <p className="text-[9px] text-slate-600 text-center uppercase font-bold tracking-widest">Paiement 100% sécurisé via Mobile Money (OM, MTN, Wave)</p>
        </div>
      </div>
    </div>
  );
}
