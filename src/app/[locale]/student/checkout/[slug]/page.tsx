'use client';

/**
 * @fileOverview Tunnel de paiement Mobile Money Ndara Afrique V2.
 * ✅ DESIGN QWEN : Reçu vintage, sélecteur de fournisseur tactile et animations de succès.
 * ✅ FONCTIONNEL : Gestion des coupons, de l'affiliation et simulation de paiement Moneroo.
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
  Ticket,
  CheckCircle2,
  Smartphone,
  Wallet,
  ShieldCheck,
  Info,
  GraduationCap,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Course } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { validateCouponAction } from '@/actions/couponActions';
import { cn } from '@/lib/utils';

type Provider = 'orange' | 'mtn' | 'wave';

export default function CheckoutPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { user } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [provider, setProvider] = useState<Provider>('orange');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const courseRef = useMemo(() => slug ? doc(db, 'courses', slug) : null, [db, slug]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  // Récupération de l'affilié depuis le cache local
  useEffect(() => {
      if (typeof window === 'undefined') return;
      const stored = localStorage.getItem('ndara_affiliate_id');
      if (stored) {
          try {
              const data = JSON.parse(stored);
              if (data.expiresAt > Date.now()) {
                  setAffiliateId(data.id);
              }
          } catch (e) {
              console.error("Affiliate cookie parse error");
          }
      }
  }, []);

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
    if (!phoneNumber || phoneNumber.length < 8) {
        toast({ variant: 'destructive', title: "Numéro invalide", description: "Veuillez saisir votre numéro Mobile Money." });
        return;
    }

    setIsProcessing(true);

    try {
      // Simulation du délai Moneroo
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const paymentMetadata = {
          userId: user.uid,
          courseId: course.id,
          amount: discountedPrice,
          couponId: appliedCoupon?.id || null,
          affiliateId: affiliateId || null,
          provider
      };

      console.log("🚀 Transaction Moneroo simulée:", paymentMetadata);
      setIsSuccess(true);
      
    } catch (error) {
      toast({ variant: 'destructive', title: "Erreur technique", description: "Impossible d'initier le paiement." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (courseLoading) return <div className="p-8 pt-24"><Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" /></div>;
  if (!course) return <div className="p-8 pt-24 text-center text-slate-400">Formation non trouvée.</div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-40 relative">
      <div className="grain-overlay" />
      
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-white/5 safe-area-pt">
        <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-gray-400 hover:text-white transition active:scale-90">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="font-black text-xl text-white uppercase tracking-tight">Paiement</h1>
            </div>
            <div className="w-10" />
        </div>
      </header>

      <main className="pt-24 px-4 max-w-md mx-auto space-y-8 relative z-10 animate-in fade-in duration-700">
        
        {/* --- VINTAGE INVOICE SUMMARY --- */}
        <div className="relative mt-2">
            <div className="bg-[#FEF3C7] rounded-[2rem] overflow-hidden shadow-2xl relative">
                <div className="h-3 w-full" style={{ backgroundImage: 'radial-gradient(circle at 10px -1px, transparent 10px, #FEF3C7 11px)', backgroundSize: '20px 20px', backgroundRepeat: 'repeat-x' }} />
                
                <div className="px-6 py-5 space-y-6">
                    <div className="flex items-center justify-between mb-4 border-b-2 border-dashed border-[#D97706]/30 pb-4">
                        <div className="flex-1 min-w-0 pr-4">
                            <p className="font-mono text-[#D97706]/60 text-[9px] uppercase tracking-[0.2em] mb-1">Formation</p>
                            <h2 className="font-black text-[#D97706] text-sm leading-tight uppercase truncate">{course.title}</h2>
                        </div>
                        <div className="w-10 h-10 bg-[#D97706]/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="h-5 w-5 text-[#D97706]" />
                        </div>
                    </div>

                    <div className="flex justify-between items-end">
                        <p className="font-mono text-[#D97706]/60 text-[10px] uppercase font-bold tracking-widest mb-1">Total à payer</p>
                        <div className="text-right">
                            {appliedCoupon && (
                                <p className="font-mono text-[#D97706]/60 text-xs line-through">{course.price.toLocaleString('fr-FR')} F</p>
                            )}
                            <p className="font-mono font-black text-[#D97706] text-3xl">
                                {discountedPrice.toLocaleString('fr-FR')} <span className="text-lg">F</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="h-3 w-full" style={{ backgroundImage: 'radial-gradient(circle at 10px 1px, transparent 10px, #0f172a 11px)', backgroundSize: '20px 20px', backgroundRepeat: 'repeat-x' }} />
            </div>
            <div className="absolute inset-0 border-2 border-dashed border-[#D97706]/10 rounded-[2.2rem] pointer-events-none -m-1" />
        </div>

        {/* --- PROVIDER SELECTION --- */}
        <section className="space-y-4">
            <h2 className="font-black text-white text-[10px] uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5 text-primary" />
                MOBILE MONEY
            </h2>
            <div className="grid grid-cols-3 gap-3">
                <button 
                    onClick={() => setProvider('orange')}
                    className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 rounded-3xl border-2 transition-all active:scale-95",
                        provider === 'orange' ? "bg-primary/10 border-primary shadow-lg" : "bg-slate-900 border-white/5 grayscale"
                    )}
                >
                    <div className="w-12 h-12 rounded-full bg-[#FF7900] flex items-center justify-center text-white font-black text-xs shadow-lg">OM</div>
                    <span className="text-white text-[9px] font-black uppercase">Orange</span>
                </button>
                <button 
                    onClick={() => setProvider('mtn')}
                    className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 rounded-3xl border-2 transition-all active:scale-95",
                        provider === 'mtn' ? "bg-primary/10 border-primary shadow-lg" : "bg-slate-900 border-white/5 grayscale"
                    )}
                >
                    <div className="w-12 h-12 rounded-full bg-[#FFCC00] flex items-center justify-center text-black font-black text-xs shadow-lg">MTN</div>
                    <span className="text-white text-[9px] font-black uppercase">MoMo</span>
                </button>
                <button 
                    onClick={() => setProvider('wave')}
                    className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 rounded-3xl border-2 transition-all active:scale-95",
                        provider === 'wave' ? "bg-primary/10 border-primary shadow-lg" : "bg-slate-900 border-white/5 grayscale"
                    )}
                >
                    <div className="w-12 h-12 rounded-full bg-[#1DC0F1] flex items-center justify-center text-white font-black text-xs shadow-lg">W</div>
                    <span className="text-white text-[9px] font-black uppercase">Wave</span>
                </button>
            </div>
        </section>

        {/* --- PHONE INPUT --- */}
        <section className="space-y-3">
            <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1">Numéro de téléphone</label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center border border-white/5">
                    <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <Input 
                    type="tel" 
                    placeholder="Ex: 07 07 07 07" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="phone-input w-full bg-slate-900 border-white/5 rounded-[2rem] h-14 pl-16 pr-4 text-white font-mono text-lg tracking-wider"
                />
            </div>
            <p className="text-slate-600 text-[9px] flex items-center gap-1.5 ml-1 italic">
                <Info size={12} />
                Vérifiez que le numéro est bien associé à votre compte Mobile Money.
            </p>
        </section>

        {/* --- COUPON ZONE --- */}
        <section className="space-y-3">
            <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1">Code Promo (Optionnel)</label>
            <div className="flex gap-2">
                <Input 
                    placeholder="Tapez ici..." 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-900 border-white/5 rounded-2xl h-12 text-white font-black placeholder:text-slate-700"
                    disabled={!!appliedCoupon}
                />
                {appliedCoupon ? (
                    <Button variant="ghost" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="h-12 px-4 rounded-xl text-red-400 font-black uppercase text-[10px]">Annuler</Button>
                ) : (
                    <Button 
                        onClick={handleValidateCoupon} 
                        disabled={isValidating || !couponCode.trim()} 
                        className="h-12 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-[10px] tracking-widest"
                    >
                        {isValidating ? <Loader2 className="h-4 w-4 animate-spin"/> : "OK"}
                    </Button>
                )}
            </div>
        </section>

        {/* --- SECURITY BANNER --- */}
        <div className="bg-slate-900/50 rounded-3xl p-4 border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
                <p className="text-white text-xs font-black uppercase tracking-tight leading-none">Paiement Crypté SSL</p>
                <p className="text-slate-500 text-[10px] mt-1 font-medium italic">Vos données sont protégées par Ndara Secure v2.0</p>
            </div>
        </div>

      </main>

      {/* --- FIXED ACTION BAR --- */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 z-50 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto space-y-4">
            <Button 
                onClick={handlePayment} 
                disabled={isProcessing || isSuccess}
                className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-sm tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin"/> : <Lock className="h-4 w-4 fill-current"/>}
                <span>PAYER {discountedPrice.toLocaleString('fr-FR')} XOF</span>
            </Button>
            <p className="text-center text-slate-600 text-[9px] font-bold uppercase tracking-tighter">
                En validant, vous acceptez les conditions de vente Ndara Afrique.
            </p>
        </div>
      </footer>

      {/* --- SUCCESS MODAL --- */}
      {isSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 animate-in fade-in duration-300">
              <Card className="bg-slate-900 border-white/10 rounded-[3rem] p-10 w-full max-w-sm text-center shadow-[0_0_100px_rgba(16,185,129,0.2)] animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                      <Check className="h-12 w-12 text-slate-900" strokeWidth={4} />
                  </div>
                  <h3 className="font-black text-white text-2xl uppercase tracking-tight mb-2">Paiement Réussi !</h3>
                  <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium">Bienvenue dans la famille Ndara. Votre formation est débloquée et prête à être étudiée.</p>
                  <Button 
                    onClick={() => router.push(`/student/courses/${slug}`)}
                    className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl"
                  >
                      Commencer le cours
                  </Button>
              </Card>
          </div>
      )}
    </div>
  );
}
