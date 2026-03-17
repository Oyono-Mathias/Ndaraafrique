'use client';

/**
 * @fileOverview Tunnel de paiement Ndara Afrique V4.
 * ✅ DESIGN : Choix direct de l'opérateur (Orange, MTN, Wave).
 * ✅ LOGIQUE : Supporte désormais Moneroo et MeSomb dynamiquement.
 */

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { doc, getFirestore, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Lock, 
  Loader2, 
  ChevronRight,
  Smartphone,
  ShieldCheck,
  GraduationCap,
  Check,
  Zap,
  Sparkles,
  Wallet,
  LayoutGrid
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Course } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { validateCouponAction } from '@/actions/couponActions';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { initiateMonerooPayment } from '@/actions/monerooActions';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';

type Provider = 'orange' | 'mtn' | 'wave' | 'virtual' | 'wallet';

function CheckoutContent() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const { user, currentUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [provider, setProvider] = useState<Provider>('orange');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Déterminer la passerelle préférée depuis l'URL
  const gateway = searchParams.get('gateway') || 'moneroo';

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
      toast({ variant: 'destructive', title: "Erreur", description: result.error as string });
    }
    setIsValidating(false);
  };

  const handlePayment = async () => {
    if (!user || !course) return;
    
    setIsProcessing(true);

    try {
      if (provider === 'wallet') {
          const balance = currentUser?.balance || 0;
          if (balance < discountedPrice) {
              toast({ variant: 'destructive', title: "Solde insuffisant", description: "Veuillez recharger votre portefeuille." });
              setIsProcessing(false);
              return;
          }

          await updateDoc(doc(db, 'users', user.uid), {
              balance: increment(-discountedPrice)
          });

          await processNdaraPayment({
              transactionId: `WAL-${user.uid.substring(0,5)}-${Date.now()}`,
              provider: 'wallet',
              amount: discountedPrice,
              currency: 'XOF',
              metadata: {
                  userId: user.uid,
                  courseId: course.id,
                  type: 'course_purchase'
              }
          });
          setIsSuccess(true);
      } else if (provider === 'virtual') {
          await new Promise(resolve => setTimeout(resolve, 2000));
          setIsSuccess(true);
      } else {
          // --- LOGIQUE MULTI-GATEWAY ---
          if (gateway === 'moneroo') {
              // 🚀 APPEL MONEROO
              const result = await initiateMonerooPayment({
                  amount: discountedPrice,
                  userId: user.uid,
                  userEmail: user.email!,
                  userName: currentUser?.fullName || 'Étudiant Ndara',
                  courseId: course.id,
                  affiliateId: localStorage.getItem('ndara_affiliate_id') ? JSON.parse(localStorage.getItem('ndara_affiliate_id')!).id : undefined,
                  couponId: appliedCoupon?.id,
                  returnUrl: `${window.location.origin}/${locale}/student/courses`
              });

              if (result.success && result.checkoutUrl) {
                  toast({ title: "Redirection vers Moneroo..." });
                  window.location.href = result.checkoutUrl;
              } else {
                  throw new Error(result.error);
              }
          } else {
              // 💳 APPEL MESOMB (Corrigé avec signature)
              const result = await initiateMeSombPayment({
                  amount: discountedPrice,
                  phoneNumber: phoneNumber,
                  service: provider === 'orange' ? 'ORANGE' : 'MTN',
                  courseId: course.id,
                  userId: user.uid,
                  affiliateId: localStorage.getItem('ndara_affiliate_id') ? JSON.parse(localStorage.getItem('ndara_affiliate_id')!).id : undefined,
                  couponId: appliedCoupon?.id
              });

              if (result.success) {
                  if (result.transactionId === "SIMULATED") {
                      setIsSuccess(true);
                  } else {
                      toast({ title: "Demande envoyée !", description: result.message });
                  }
              } else {
                  throw new Error(result.error);
              }
          }
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Échec du paiement", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (courseLoading) return <div className="p-8 pt-24 bg-slate-950 min-h-screen"><Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" /></div>;
  if (!course) return null;

  return (
    <div className="min-h-screen bg-slate-950 pb-40 relative">
      <div className="grain-overlay" />
      
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-white/5 safe-area-pt">
        <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 active:scale-90 transition">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="font-black text-xl text-white uppercase tracking-tight">Paiement</h1>
            </div>
            <div className="w-10" />
        </div>
      </header>

      <main className="pt-24 px-4 max-w-md mx-auto space-y-8 relative z-10 animate-in fade-in duration-700">
        
        {/* --- RECEIPT STYLE TICKET --- */}
        <div className="relative">
            <div className="bg-[#FEF3C7] rounded-[2rem] overflow-hidden shadow-2xl relative">
                <div className="h-3 w-full" style={{ backgroundImage: 'radial-gradient(circle at 10px -1px, transparent 10px, #FEF3C7 11px)', backgroundSize: '20px 20px', backgroundRepeat: 'repeat-x' }} />
                <div className="px-6 py-5 space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-dashed border-[#D97706]/20 pb-4">
                        <div className="flex-1 min-w-0 pr-4">
                            <p className="font-mono text-[#D97706]/60 text-[9px] uppercase tracking-widest mb-1">Désignation</p>
                            <h2 className="font-black text-[#D97706] text-sm leading-tight uppercase truncate">{course.title}</h2>
                        </div>
                        <GraduationCap className="h-8 w-8 text-[#D97706] opacity-20" />
                    </div>
                    <div className="flex justify-between items-end">
                        <p className="font-mono text-[#D97706]/60 text-[10px] uppercase font-bold tracking-widest">Montant à régler</p>
                        <p className="font-mono font-black text-[#D97706] text-3xl">
                            {discountedPrice.toLocaleString('fr-FR')} F
                        </p>
                    </div>
                </div>
                <div className="h-3 w-full" style={{ backgroundImage: 'radial-gradient(circle at 10px 1px, transparent 10px, #0f172a 11px)', backgroundSize: '20px 20px', backgroundRepeat: 'repeat-x' }} />
            </div>
        </div>

        {/* --- OPERATOR SELECTION --- */}
        <section className="space-y-4">
            <h2 className="font-black text-white text-[10px] uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                CHOIX DE L'OPÉRATEUR
            </h2>
            <div className="grid grid-cols-4 gap-2">
                <button 
                    onClick={() => setProvider('wallet')}
                    className={cn(
                        "flex flex-col items-center justify-center gap-2 p-2 rounded-2xl border-2 transition-all active:scale-95",
                        provider === 'wallet' ? "bg-primary/10 border-primary shadow-lg" : "bg-slate-900 border-white/5 opacity-40"
                    )}
                >
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-slate-950 shadow-lg">
                        <Wallet size={18} />
                    </div>
                    <span className="text-white text-[8px] font-black uppercase">Wallet</span>
                </button>
                
                <ProviderBtn active={provider === 'orange'} onClick={() => setProvider('orange')} label="Orange" color="bg-[#FF7900]" initials="OM" />
                <ProviderBtn active={provider === 'mtn'} onClick={() => setProvider('mtn')} label="MTN" color="bg-[#FFCC00]" initials="MTN" darkText />
                
                <button 
                    onClick={() => setProvider('virtual')}
                    className={cn(
                        "flex flex-col items-center justify-center gap-2 p-2 rounded-2xl border-2 transition-all active:scale-95",
                        provider === 'virtual' ? "bg-primary/10 border-primary" : "bg-slate-900 border-white/5 opacity-40 grayscale"
                    )}
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-slate-950">
                        <Zap size={18} className="fill-current" />
                    </div>
                    <span className="text-white text-[8px] font-black uppercase">Virtuel</span>
                </button>
            </div>
        </section>

        <section className="space-y-6">
            {provider === 'wallet' ? (
                <div className="p-6 bg-slate-900 border border-white/5 rounded-3xl space-y-3 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <span>Solde Portefeuille</span>
                        <span className="text-primary">{(currentUser?.balance || 0).toLocaleString()} XOF</span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">"Paiement instantané sans validation téléphone."</p>
                </div>
            ) : provider === 'virtual' ? (
                <div className="p-6 bg-primary/10 border border-primary/20 rounded-3xl space-y-2 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
                        <Sparkles size={16} /> Mode Publicitaire Actif
                    </div>
                    <p className="text-[10px] text-slate-400 italic">"Ce mode simule un paiement réussi pour vos vidéos de démonstration."</p>
                </div>
            ) : gateway === 'mesomb' ? (
                <div className="space-y-3">
                    <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1">Numéro Mobile Money</label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center border border-white/5">
                            <Smartphone className="h-5 w-5 text-primary" />
                        </div>
                        <Input 
                            type="tel" 
                            placeholder="Ex: 07 07 07 07" 
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full bg-slate-900 border-white/5 rounded-[2rem] h-14 pl-16 text-white font-mono text-lg"
                        />
                    </div>
                </div>
            ) : (
                <div className="p-6 bg-slate-900 border border-white/5 rounded-3xl space-y-2 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase tracking-widest">
                        <ShieldCheck size={14} /> Passerelle Moneroo active
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">Vous allez être redirigé vers la page sécurisée de Moneroo pour finaliser votre transaction via Mobile Money ou Carte.</p>
                </div>
            )}

            <div className="flex gap-2">
                <Input 
                    placeholder="CODE PROMO" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-900 border-white/5 rounded-2xl h-12 text-white font-black"
                    disabled={!!appliedCoupon}
                />
                <Button onClick={handleValidateCoupon} disabled={isValidating || !couponCode.trim()} className="h-12 px-6 rounded-2xl bg-slate-800 font-black text-[10px]">
                    {isValidating ? <Loader2 className="h-4 w-4 animate-spin"/> : "OK"}
                </Button>
            </div>
        </section>

        <div className="bg-slate-900/50 rounded-3xl p-4 border border-white/5 flex items-center gap-4">
            <ShieldCheck className="h-8 w-8 text-emerald-500 opacity-50" />
            <p className="text-slate-500 text-[10px] font-medium italic">Vos fonds sont sécurisés par l'infrastructure Ndara Afrique.</p>
        </div>

      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 z-50 safe-area-pb shadow-2xl">
        <div className="max-w-md mx-auto">
            <Button 
                onClick={handlePayment} 
                disabled={isProcessing || isSuccess}
                className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-sm tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-95"
            >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin"/> : <Lock className="h-4 w-4 mr-2"/>}
                {gateway === 'moneroo' && !['wallet', 'virtual'].includes(provider) ? "CONTINUER VERS LE PAIEMENT" : "VALIDER LE PAIEMENT"}
            </Button>
        </div>
      </footer>

      {isSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 animate-in fade-in duration-300">
              <div className="bg-slate-900 border-white/10 rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl animate-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check className="h-10 w-10 text-slate-900" strokeWidth={4} />
                  </div>
                  <h3 className="font-black text-white text-2xl uppercase mb-2">Succès !</h3>
                  <p className="text-slate-400 text-sm mb-8 leading-relaxed">Votre formation est maintenant débloquée.</p>
                  <Button onClick={() => router.push(`/${locale}/courses/${slug}`)} className="w-full h-14 rounded-2xl bg-primary text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl">
                      Commencer l'étude
                  </Button>
              </div>
          </div>
      )}
    </div>
  );
}

function ProviderBtn({ active, onClick, label, color, initials, darkText = false }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center gap-2 p-2 rounded-2xl border-2 transition-all active:scale-95",
                active ? "bg-primary/10 border-primary shadow-lg" : "bg-slate-900 border-white/5 grayscale opacity-40"
            )}
        >
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg", color, darkText ? "text-slate-950" : "text-white")}>
                {initials}
            </div>
            <span className="text-white text-[8px] font-black uppercase">{label}</span>
        </button>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="p-8 pt-24 bg-slate-950 min-h-screen"><Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" /></div>}>
            <CheckoutContent />
        </Suspense>
    )
}
