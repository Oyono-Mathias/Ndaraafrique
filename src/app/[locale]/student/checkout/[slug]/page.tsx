'use client';

/**
 * @fileOverview Tunnel de paiement Ndara Afrique V5.0.
 * ✅ INTERNATIONAL : Modes de paiement chargés dynamiquement par pays.
 */

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getFirestore, updateDoc, increment, onSnapshot, collection, query, where, getDocs, limit } from 'firebase/firestore';
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
  LayoutGrid,
  CreditCard,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Course, Settings, Country, PaymentMethod } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { validateCouponAction } from '@/actions/couponActions';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { initiateMonerooPayment } from '@/actions/monerooActions';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';
import { OperatorLogo } from '@/components/ui/OperatorLogo';

function CheckoutContent() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const { user, currentUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- ÉTAT INTERNATIONAL ---
  const [countryData, setCountryData] = useState<Country | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('wallet');
  const [isLoadingCountry, setIsLoadingCountry] = useState(true);

  const courseRef = useMemo(() => slug ? doc(db, 'courses', slug) : null, [db, slug]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  useEffect(() => {
    if (!currentUser?.countryCode) return;

    const fetchCountry = async () => {
        setIsLoadingCountry(true);
        try {
            const q = query(collection(db, 'countries'), where('code', '==', currentUser.countryCode), where('active', '==', true), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                setCountryData({ id: snap.docs[0].id, ...snap.docs[0].data() } as Country);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingCountry(false);
        }
    };
    fetchCountry();
  }, [currentUser?.countryCode, db]);

  const discountedPrice = useMemo(() => {
    if (!course) return 0;
    if (!appliedCoupon) return course.price;
    return appliedCoupon.discountType === 'percentage' 
        ? Math.max(0, course.price - (course.price * appliedCoupon.discountValue) / 100)
        : Math.max(0, course.price - appliedCoupon.discountValue);
  }, [course, appliedCoupon]);

  const activeMethod = useMemo(() => 
    selectedMethodId === 'wallet' ? { provider: 'wallet', name: 'Wallet' } :
    selectedMethodId === 'virtual' ? { provider: 'virtual', name: 'Virtuel' } :
    countryData?.paymentMethods.find(m => m.id === selectedMethodId),
  [countryData, selectedMethodId]);

  const handlePayment = async () => {
    if (!user || !course || !activeMethod) return;
    setIsProcessing(true);

    try {
      if (activeMethod.provider === 'wallet') {
          if ((currentUser?.balance || 0) < discountedPrice) throw new Error("Solde insuffisant");
          await updateDoc(doc(db, 'users', user.uid), { balance: increment(-discountedPrice) });
          await processNdaraPayment({
              transactionId: `WAL-${Date.now()}`,
              provider: 'wallet',
              amount: discountedPrice,
              currency: countryData?.currency || 'XOF',
              metadata: { userId: user.uid, courseId: course.id, type: 'course_purchase' }
          });
          setIsSuccess(true);
      } else if (activeMethod.provider === 'mesomb') {
          const result = await initiateMeSombPayment({
              amount: discountedPrice,
              phoneNumber: phoneNumber,
              service: activeMethod.name.toUpperCase().includes('MTN') ? 'MTN' : 'ORANGE',
              courseId: course.id,
              userId: user.uid
          });
          if (result.success) {
              if (result.type === 'SIMULATED') setIsSuccess(true);
              else toast({ title: "Action requise sur votre mobile" });
          } else throw new Error(result.error);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Échec", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (courseLoading || isLoadingCountry) return <div className="p-8 pt-24 bg-slate-950 min-h-screen"><Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-40 relative">
      <div className="grain-overlay" />
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-white/5 safe-area-pt">
        <div className="flex items-center justify-between px-4 py-4">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 active:scale-90"><ArrowLeft className="h-5 w-5" /></button>
            <h1 className="font-black text-xl text-white uppercase tracking-tight">Checkout</h1>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{countryData?.flagEmoji}</div>
        </div>
      </header>

      <main className="pt-24 px-4 max-md mx-auto space-y-8 animate-in fade-in">
        <div className="bg-[#FEF3C7] rounded-[2rem] p-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b-2 border-dashed border-[#D97706]/20 pb-4 mb-4">
                <h2 className="font-black text-[#D97706] text-sm uppercase truncate pr-4">{course?.title}</h2>
                <GraduationCap className="h-6 w-6 text-[#D97706] opacity-30" />
            </div>
            <div className="flex justify-between items-end">
                <span className="text-[#D97706]/60 text-[10px] font-black uppercase">À régler</span>
                <span className="font-mono font-black text-[#D97706] text-3xl">{discountedPrice.toLocaleString()} {countryData?.currency}</span>
            </div>
        </div>

        <section className="space-y-4">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] ml-1">Moyen de paiement</h3>
            <div className="grid grid-cols-4 gap-2">
                <button onClick={() => setSelectedMethodId('wallet')} className={cn("flex flex-col items-center justify-center p-3 rounded-2xl border-2", selectedMethodId === 'wallet' ? "border-primary bg-primary/10" : "border-white/5 bg-slate-900 opacity-40")}><Wallet className="h-5 w-5 text-primary mb-1"/><span className="text-[8px] font-black uppercase text-white">Wallet</span></button>
                {countryData?.paymentMethods.filter(m => m.active).map(m => (
                    <button key={m.id} onClick={() => setSelectedMethodId(m.id)} className={cn("flex flex-col items-center justify-center p-3 rounded-2xl border-2", selectedMethodId === m.id ? "border-primary bg-primary/10" : "border-white/5 bg-slate-900 opacity-40")}><OperatorLogo operatorName={m.provider} size={24} className="mb-1"/><span className="text-[8px] font-black uppercase text-white truncate w-full text-center">{m.name}</span></button>
                ))}
                <button onClick={() => setSelectedMethodId('virtual')} className={cn("flex flex-col items-center justify-center p-3 rounded-2xl border-2", selectedMethodId === 'virtual' ? "border-primary bg-primary/10" : "border-white/5 bg-slate-900 opacity-40")}><Zap className="h-5 w-5 text-primary mb-1"/><span className="text-[8px] font-black uppercase text-white">Virtuel</span></button>
            </div>
        </section>

        <section className="space-y-6">
            {selectedMethodId === 'wallet' ? (
                <div className="p-5 bg-slate-900 border border-white/5 rounded-3xl text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Solde actuel</p>
                    <p className="text-xl font-black text-primary">{(currentUser?.balance || 0).toLocaleString()} {countryData?.currency}</p>
                </div>
            ) : selectedMethodId !== 'virtual' && (
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Numéro Mobile Money ({countryData?.prefix})</label>
                    <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                        <Input type="tel" placeholder="6xx xxx xxx" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-14 pl-12 bg-slate-900 border-white/5 rounded-2xl text-white font-mono" />
                    </div>
                </div>
            )}
        </section>

        <Button onClick={handlePayment} disabled={isProcessing || isSuccess} className="w-full h-16 rounded-[2rem] bg-primary text-slate-950 font-black uppercase text-sm tracking-widest shadow-2xl active:scale-95">
            {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : <Lock className="h-4 w-4 mr-2" />}
            Confirmer le paiement
        </Button>
      </main>

      {isSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 animate-in fade-in">
              <div className="bg-slate-900 rounded-[3rem] p-10 text-center space-y-6">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto shadow-2xl"><Check className="h-10 w-10 text-slate-950" strokeWidth={4} /></div>
                  <h3 className="text-2xl font-black text-white uppercase">Inscription réussie</h3>
                  <Button onClick={() => router.push(`/${locale}/courses/${course?.id}`)} className="w-full h-14 rounded-2xl bg-primary text-slate-950 font-black uppercase">Accéder au cours</Button>
              </div>
          </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="p-8 pt-24 bg-slate-950 min-h-screen"><Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" /></div>}>
            <CheckoutContent />
        </Suspense>
    )
}
