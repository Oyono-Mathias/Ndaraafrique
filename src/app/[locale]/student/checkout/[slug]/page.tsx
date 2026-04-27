'use client';

/**
 * @fileOverview Tunnel de paiement Ndara Afrique V6.0.
 * ✅ SÉCURITÉ : Récupération intelligente du numéro certifié.
 * ✅ TEMPS RÉEL : Écouteur Firestore onSnapshot pour feedback USSD immédiat.
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
  Smartphone, 
  ShieldCheck, 
  GraduationCap, 
  Check, 
  Zap, 
  Wallet,
  X,
  PhoneCall,
  XCircle,
  RefreshCw,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Course, Country } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { purchaseCourseWithWalletAction } from '@/actions/userActions';
import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';
import { OperatorLogo } from '@/components/ui/OperatorLogo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

function CheckoutContent() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const locale = useLocale();
  const { user, currentUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAwaitingUssd, setIsAwaitingUssd] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string; title: string }>({
    isOpen: false,
    message: '',
    title: 'Échec de la commande'
  });

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

  const certifiedNumber = useMemo(() => {
    if (!currentUser || !currentUser.countryCode || !activeMethod || activeMethod.provider !== 'mesomb') return null;
    
    const opKey = activeMethod.name.toLowerCase().includes('mtn') ? 'MTN' : 
                  activeMethod.name.toLowerCase().includes('orange') ? 'ORANGE' : 
                  activeMethod.name.toLowerCase().includes('wave') ? 'WAVE' : 
                  activeMethod.name.toLowerCase().includes('mpesa') ? 'MPESA' : 'DEFAULT';

    return currentUser.certifiedMobileNumbers?.[`${currentUser.countryCode}_${opKey}`] || null;
  }, [currentUser, activeMethod]);

  const ussdInstruction = useMemo(() => {
    if (!activeMethod || activeMethod.provider !== 'mesomb') return "Veuillez valider le paiement sur votre téléphone";
    const op = activeMethod.name.toUpperCase();
    if (op.includes('MTN')) return "Composez *126# puis validez le paiement sur votre téléphone";
    if (op.includes('ORANGE')) return "Composez #150*50# puis validez le paiement";
    return "Veuillez valider le paiement sur votre téléphone";
  }, [activeMethod]);

  const handlePayment = async () => {
    if (!user || !course || !activeMethod) return;

    try {
      if (activeMethod.provider === 'wallet') {
          setIsProcessing(true);
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
          if (!certifiedNumber) {
              toast({ variant: 'destructive', title: "Certification requise", description: `Veuillez enregistrer votre numéro ${activeMethod.name} dans votre profil.` });
              return;
          }

          setIsAwaitingUssd(true);
          setIsProcessing(true);

          const result = await initiateMeSombPayment({
              amount: course.price,
              phoneNumber: certifiedNumber,
              service: activeMethod.name.toUpperCase().includes('MTN') ? 'MTN' : activeMethod.name.toUpperCase().includes('WAVE') ? 'WAVE' : 'ORANGE',
              courseId: course.id,
              courseTitle: course.title,
              userId: user.uid
          });
          
          if (result.success) {
              if (result.type === 'SIMULATED') {
                  setIsAwaitingUssd(false);
                  setIsSuccess(true);
              } else if (result.type === 'REAL' && result.transactionId) {
                  // ✅ LOGIQUE TEMPS RÉEL : Écoute de la transaction spécifique
                  const paymentRef = doc(db, 'payments', result.transactionId);
                  const unsubscribe = onSnapshot(paymentRef, (snap) => {
                      if (snap.exists()) {
                          const data = snap.data();
                          if (data.status === 'completed') {
                              setIsAwaitingUssd(false);
                              setIsSuccess(true);
                              unsubscribe();
                          } else if (data.status === 'failed') {
                              setIsAwaitingUssd(false);
                              const errorMsg = data.metadata?.errorMessage || "La transaction a été rejetée.";
                              
                              let userMessage = errorMsg;
                              if (errorMsg.includes('balance')) userMessage = "Solde insuffisant sur votre compte Mobile Money.";
                              if (errorMsg.includes('cancel')) userMessage = "Paiement annulé sur votre téléphone.";
                              if (errorMsg.includes('timeout')) userMessage = "Le délai de validation a expiré.";

                              setErrorModal({
                                  isOpen: true,
                                  title: "Validation échouée",
                                  message: userMessage
                              });
                              unsubscribe();
                          }
                      }
                  });
              }
          } else {
              throw new Error(String(result.error));
          }
      }
    } catch (e: any) {
      setIsAwaitingUssd(false);
      setErrorModal({ isOpen: true, message: "Erreur réseau. Vérifiez votre connexion.", title: "Erreur de paiement" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (courseLoading || isLoadingCountry) return <div className="p-8 pt-24 bg-slate-950 min-h-screen"><Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" /></div>;

  const currencySymbol = countryData?.currency || 'XOF';

  return (
    <div className="min-h-screen bg-slate-950 pb-40 relative">
      <div className="grain-overlay" />
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-white/5 safe-area-pt">
        <div className="flex items-center justify-between px-4 py-4">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 transition active:scale-90"><ArrowLeft className="h-5 w-5" /></button>
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
                <span className="font-mono font-black text-[#D97706] text-3xl">{(course?.price || 0).toLocaleString()} {currencySymbol}</span>
            </div>
        </div>

        <section className="space-y-4">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] ml-1">MOYEN DE PAIEMENT</h3>
            <div className="grid grid-cols-4 gap-2">
                <button onClick={() => setSelectedMethodId('wallet')} className={cn("flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all active:scale-95", selectedMethodId === 'wallet' ? "border-primary bg-primary/10" : "border-white/5 bg-slate-900 opacity-40")}><Wallet className="h-5 w-5 text-primary mb-1"/><span className="text-[8px] font-black uppercase text-white">Wallet</span></button>
                {countryData?.paymentMethods.filter(m => m.active).map(m => (
                    <button key={m.id} onClick={() => setSelectedMethodId(m.id)} className={cn("flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all active:scale-95", selectedMethodId === m.id ? "border-primary bg-primary/10" : "border-white/5 bg-slate-900 opacity-40")}>
                        <OperatorLogo logo={m.logo} operatorName={m.provider} size={24} className="mb-1"/>
                        <span className="text-[8px] font-black uppercase text-white truncate w-full text-center">{m.name}</span>
                    </button>
                ))}
            </div>
        </section>

        <section className="space-y-6">
            {selectedMethodId === 'wallet' ? (
                <div className="p-6 bg-slate-900 border border-white/5 rounded-3xl text-center shadow-inner relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Votre solde Ndara</p>
                    <p className="text-2xl font-black text-primary">{(currentUser?.balance || 0).toLocaleString()} {currencySymbol}</p>
                </div>
            ) : (
                <div className="space-y-3 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Compte de débit certifié</label>
                    
                    {certifiedNumber ? (
                        <div className="p-5 bg-[#10b981]/5 border border-[#10b981]/20 rounded-3xl flex items-center justify-between shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-[#10b981]/10 flex items-center justify-center text-[#10b981]">
                                    <Smartphone size={20} />
                                </div>
                                <div>
                                    <p className="font-mono text-lg font-black text-white tracking-widest">{certifiedNumber}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <ShieldCheck size={12} className="text-[#10b981]" />
                                        <span className="text-[8px] font-black text-[#10b981] uppercase tracking-widest">{activeMethod?.name} Certifié</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-2 bg-slate-950 rounded-lg text-slate-700">
                                <Lock size={16} />
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl flex flex-col items-center text-center space-y-4">
                            <ShieldAlert className="h-10 w-10 text-red-500" />
                            <div className="space-y-1">
                                <p className="text-white font-bold text-sm uppercase">Numéro {activeMethod?.name} non certifié</p>
                                <p className="text-slate-500 text-[10px] font-medium leading-relaxed italic">
                                    Vous devez enregistrer votre numéro {activeMethod?.name} dans votre profil pour acheter cette formation.
                                </p>
                            </div>
                            <Button asChild className="h-11 rounded-xl bg-slate-900 border border-white/5 text-xs font-black uppercase tracking-widest">
                                <Link href="/account">Certifier ce numéro <ExternalLink size={12} className="ml-2" /></Link>
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </section>

        <Button 
            onClick={handlePayment} 
            disabled={isProcessing || isSuccess || (!certifiedNumber && selectedMethodId !== 'wallet') || (selectedMethodId === 'wallet' && (currentUser?.balance || 0) < (course?.price || 0))} 
            className="w-full h-16 rounded-[2rem] bg-primary text-slate-950 font-black uppercase text-sm tracking-widest shadow-2xl active:scale-95 transition-all"
        >
            {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : <Lock className="h-4 w-4 mr-2" />}
            <span>CONFIRMER LE PAIEMENT</span>
        </Button>
      </main>

      {/* 🔥 MODAL USSD DYNAMIQUE */}
      <Dialog open={isAwaitingUssd} onOpenChange={setIsAwaitingUssd}>
          <DialogContent className="bg-slate-900/90 backdrop-blur-2xl border-white/10 rounded-t-[3rem] p-0 overflow-hidden sm:max-w-md fixed bottom-0 top-auto translate-y-0 sm:relative sm:rounded-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
              <div className="p-8 pb-10 flex flex-col items-center text-center space-y-8 animate-in slide-up-modal">
                  <div className="w-full flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Ndara Secure</span>
                      </div>
                  </div>
                  <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                      <div className="w-24 h-24 rounded-full bg-slate-950 border-2 border-primary/30 flex items-center justify-center relative z-10 shadow-2xl">
                          <Loader2 className="h-14 w-14 animate-spin text-primary opacity-20 absolute" />
                          <PhoneCall className="h-8 w-8 text-primary animate-bounce" />
                      </div>
                  </div>
                  <div className="space-y-3">
                      <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight leading-none">Validation USSD</DialogTitle>
                      <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                          <p className="text-primary text-sm font-bold leading-relaxed italic">
                              "{ussdInstruction}"
                          </p>
                      </div>
                  </div>
                  <div className="w-full pt-4">
                      <Button 
                          variant="ghost" 
                          onClick={() => setIsAwaitingUssd(false)} 
                          className="w-full h-14 rounded-2xl text-slate-500 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all"
                      >
                          <X className="mr-2 h-4 w-4" /> Annuler l'achat
                      </Button>
                  </div>
              </div>
          </DialogContent>
      </Dialog>

      {/* ❌ MODAL D'ERREUR FINTECH RÉELLE */}
      <Dialog open={errorModal.isOpen} onOpenChange={(o) => setErrorModal(prev => ({ ...prev, isOpen: o }))}>
        <DialogContent className="bg-[#0f172a] border-white/5 rounded-t-[3rem] p-0 overflow-hidden sm:max-w-md fixed bottom-0 top-auto translate-y-0 sm:relative sm:rounded-[2.5rem]">
            <div className="p-8 flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border-2 border-red-500/20 shadow-2xl">
                    <XCircle className="h-10 w-10 text-red-500" />
                </div>
                <div className="space-y-2">
                    <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">{errorModal.title}</DialogTitle>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed italic">"{errorModal.message}"</p>
                </div>
            </div>
            <DialogFooter className="p-8 pt-0 flex flex-col gap-3">
                <Button 
                    onClick={() => { setErrorModal(prev => ({ ...prev, isOpen: false })); handlePayment(); }}
                    className="w-full h-16 rounded-2xl bg-white text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
                </Button>
                <Button 
                    variant="ghost"
                    onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-full h-12 rounded-xl text-slate-500 font-bold uppercase text-[10px] tracking-widest"
                >
                    Fermer
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {isSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-6 animate-in fade-in duration-500">
              <div className="bg-slate-900 rounded-[3rem] p-10 text-center space-y-8 max-w-sm shadow-2xl border border-primary/20">
                  <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce shadow-primary/40">
                      <Check className="h-14 w-14 text-slate-950" strokeWidth={4} />
                  </div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tight">C'est validé !</h3>
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
