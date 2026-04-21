'use client';

/**
 * @fileOverview Tunnel de paiement Ndara Afrique V5.0.
 * ✅ UX : Affichage immédiat du code USSD après initiation MeSomb.
 */

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getFirestore, onSnapshot, collection, query, where, getDocs, limit } from 'firebase/firestore';
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
  Wallet,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Course, Country } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { purchaseCourseWithWalletAction } from '@/actions/userActions';
import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';
import { OperatorLogo } from '@/components/ui/OperatorLogo';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Configuration USSD de secours
const USSD_CONFIG: Record<string, Record<string, string>> = {
  "CM": {
    "MTN": "*126#",
    "ORANGE": "#150*50#"
  }
};

function CheckoutContent() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const locale = useLocale();
  const { user, currentUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAwaitingUssd, setIsAwaitingUssd] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

  const activeMethod = useMemo(() => 
    selectedMethodId === 'wallet' ? { provider: 'wallet', name: 'Solde Ndara' } :
    selectedMethodId === 'virtual' ? { provider: 'virtual', name: 'Crédit Virtuel' } :
    countryData?.paymentMethods.find(m => m.id === selectedMethodId),
  [countryData, selectedMethodId]);

  const getUssdCode = () => {
    const countryCode = currentUser?.countryCode || "CM";
    const opName = activeMethod?.name.toUpperCase() || "";
    if (opName.includes("MTN")) return USSD_CONFIG[countryCode]?.["MTN"];
    if (opName.includes("ORANGE")) return USSD_CONFIG[countryCode]?.["ORANGE"];
    return null;
  };

  const handlePayment = async () => {
    if (!user || !course || !activeMethod) return;
    setIsProcessing(true);

    try {
      if (activeMethod.provider === 'wallet') {
          const result = await purchaseCourseWithWalletAction({
              userId: user.uid,
              courseId: course.id,
              amount: course.price
          });

          if (result.success) {
              setIsSuccess(true);
          } else {
              throw new Error(result.error || "Échec du débit wallet.");
          }

      } else if (activeMethod.provider === 'mesomb') {
          if (!phoneNumber || phoneNumber.length < 8) {
              throw new Error("Numéro de téléphone requis pour Mobile Money.");
          }

          const result = await initiateMeSombPayment({
              amount: course.price,
              phoneNumber: phoneNumber,
              service: activeMethod.name.toUpperCase().includes('MTN') ? 'MTN' : 'ORANGE',
              courseId: course.id,
              userId: user.uid
          });
          
          if (result.success) {
              if (result.type === 'SIMULATED') {
                  setIsSuccess(true);
              } else {
                  // ✅ UX FIX: Affichage immédiat du modal de guidage
                  setIsAwaitingUssd(true);
              }
          } else {
              throw new Error(result.error);
          }
      } else if (selectedMethodId === 'virtual') {
          setIsSuccess(true);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Échec du paiement", description: e.message });
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
            <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 active:scale-90 transition"><ArrowLeft className="h-5 w-5" /></button>
            <h1 className="font-black text-xl text-white uppercase tracking-tight">Finaliser l'achat</h1>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">{countryData?.flagEmoji || '🌍'}</div>
        </div>
      </header>

      <main className="pt-24 px-4 max-w-md mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="bg-[#FEF3C7] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><GraduationCap size={80} className="text-[#D97706]" /></div>
            <div className="flex justify-between items-center border-b-2 border-dashed border-[#D97706]/20 pb-4 mb-4">
                <h2 className="font-black text-[#D97706] text-sm uppercase truncate pr-4">{course?.title}</h2>
            </div>
            <div className="flex justify-between items-end">
                <span className="text-[#D97706]/60 text-[10px] font-black uppercase tracking-widest">Total à payer</span>
                <span className="font-mono font-black text-[#D97706] text-3xl">{(course?.price || 0).toLocaleString()} {countryData?.currency || 'XOF'}</span>
            </div>
        </div>

        <section className="space-y-4">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] ml-1">MOYEN DE PAIEMENT</h3>
            <div className="grid grid-cols-4 gap-2">
                <button 
                    onClick={() => setSelectedMethodId('wallet')} 
                    className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all active:scale-95", 
                        selectedMethodId === 'wallet' ? "border-primary bg-primary/10" : "border-white/5 bg-slate-900 opacity-40"
                    )}
                >
                    <Wallet className="h-5 w-5 text-primary mb-1"/>
                    <span className="text-[8px] font-black uppercase text-white">Wallet</span>
                </button>
                {countryData?.paymentMethods.filter(m => m.active).map(m => (
                    <button 
                        key={m.id} 
                        onClick={() => setSelectedMethodId(m.id)} 
                        className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all active:scale-95", 
                            selectedMethodId === m.id ? "border-primary bg-primary/10" : "border-white/5 bg-slate-900 opacity-40"
                        )}
                    >
                        <OperatorLogo operatorName={m.provider} size={24} className="mb-1"/>
                        <span className="text-[8px] font-black uppercase text-white truncate w-full text-center">{m.name}</span>
                    </button>
                ))}
                <button 
                    onClick={() => setSelectedMethodId('virtual')} 
                    className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all active:scale-95", 
                        selectedMethodId === 'virtual' ? "border-primary bg-primary/10" : "border-white/5 bg-slate-900 opacity-40"
                    )}
                >
                    <Zap className="h-5 w-5 text-primary mb-1"/>
                    <span className="text-[8px] font-black uppercase text-white">Virtuel</span>
                </button>
            </div>
        </section>

        <section className="space-y-6">
            {selectedMethodId === 'wallet' ? (
                <div className="p-6 bg-slate-900 border border-white/5 rounded-3xl text-center shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Votre solde Ndara</p>
                    <p className="text-2xl font-black text-primary">{(currentUser?.balance || 0).toLocaleString()} {countryData?.currency || 'XOF'}</p>
                    {(currentUser?.balance || 0) < (course?.price || 0) && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest">Solde insuffisant</p>
                        </div>
                    )}
                </div>
            ) : (selectedMethodId !== 'virtual' && selectedMethodId !== 'wallet') && (
                <div className="space-y-3 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Numéro Mobile Money ({countryData?.prefix})</label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center">
                            <Smartphone className="h-4 w-4 text-primary" />
                        </div>
                        <Input 
                            type="tel" 
                            placeholder="6xx xxx xxx" 
                            value={phoneNumber} 
                            onChange={(e) => setPhoneNumber(e.target.value)} 
                            className="h-16 pl-14 bg-slate-900 border-white/5 rounded-3xl text-white font-mono text-xl tracking-widest" 
                        />
                    </div>
                </div>
            )}
        </section>

        <Button 
            onClick={handlePayment} 
            disabled={isProcessing || isSuccess || (selectedMethodId === 'wallet' && (currentUser?.balance || 0) < (course?.price || 0))} 
            className="w-full h-16 rounded-[2rem] bg-primary text-slate-950 font-black uppercase text-sm tracking-widest shadow-2xl active:scale-95 transition-all shadow-primary/20"
        >
            {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : <Lock className="h-4 w-4 mr-2" />}
            <span>CONFIRMER LE PAIEMENT</span>
        </Button>

        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 flex items-start gap-4">
            <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
            <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight">
                Accès immédiat et illimité au contenu après validation de la transaction.
            </p>
        </div>
      </main>

      {/* ✅ UX FIX: Guidage USSD Immédiat */}
      <Dialog open={isAwaitingUssd} onOpenChange={setIsAwaitingUssd}>
          <DialogContent className="bg-slate-900 border-white/10 rounded-[3rem] p-10 text-center sm:max-w-md z-[10005]">
              <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                  <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Loader2 className="h-10 w-10 animate-spin" />
                      </div>
                      <Smartphone className="absolute -bottom-1 -right-1 h-7 w-7 text-primary bg-slate-950 rounded-full p-1 border border-white/10" />
                  </div>
                  <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">Paiement en cours</DialogTitle>
                  <div className="space-y-4">
                      <p className="text-slate-400 font-medium italic text-sm leading-relaxed">
                          Veuillez saisir votre code PIN sur le prompt USSD qui va s'afficher sur votre téléphone.
                      </p>
                      
                      {getUssdCode() && (
                          <div className="p-4 bg-slate-950 rounded-2xl border border-primary/20 space-y-2">
                              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">En cas de problème, composez :</p>
                              <p className="text-xl font-black text-primary tracking-widest">{getUssdCode()}</p>
                          </div>
                      )}
                  </div>
                  <Button variant="ghost" onClick={() => setIsAwaitingUssd(false)} className="w-full text-slate-500 font-black uppercase text-[10px] tracking-widest mt-2">Fermer</Button>
              </div>
          </DialogContent>
      </Dialog>

      {isSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-6 animate-in fade-in duration-500">
              <div className="bg-slate-900 rounded-[3rem] p-10 text-center space-y-8 max-w-sm shadow-2xl border border-primary/20">
                  <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce shadow-primary/40">
                      <Check className="h-14 w-14 text-slate-950" strokeWidth={4} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-white uppercase tracking-tight">C'est validé !</h3>
                    <p className="text-slate-400 font-medium italic">Félicitations, vous avez débloqué votre nouvelle compétence.</p>
                  </div>
                  <Button onClick={() => router.push(`/${locale}/courses/${course?.id}`)} className="w-full h-16 rounded-2xl bg-primary text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl">
                      Accéder à mes leçons
                  </Button>
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
