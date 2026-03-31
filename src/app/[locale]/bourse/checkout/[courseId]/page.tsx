'use client';

/**
 * @fileOverview Tunnel d'acquisition de licence de revente V2.
 * ✅ RÉSOLU : Typage MeSombResponse pour séparer Simulation et Réel.
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { doc, getFirestore, onSnapshot } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Lock, 
  Loader2, 
  ChevronRight, 
  ShieldCheck,
  Landmark,
  BadgeEuro,
  TrendingUp,
  Smartphone,
  Layers,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Course } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { purchaseResaleRightsAction } from '@/actions/courseActions';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';

type Provider = 'orange' | 'mtn' | 'wave';

export default function BourseCheckoutPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const router = useRouter();
  const locale = useLocale();
  const { user } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<Provider>('orange');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    const unsub = onSnapshot(doc(db, 'courses', courseId), (snap) => {
        if (snap.exists()) {
            setCourse({ id: snap.id, ...snap.data() } as Course);
        } else {
            setCourse(null);
        }
        setIsLoading(false);
    });
    return () => unsub();
  }, [db, courseId]);

  const handlePurchase = async () => {
    if (!user || !course) return;

    if (!phoneNumber || phoneNumber.length < 8) {
        toast({ variant: 'destructive', title: "Numéro requis" });
        return;
    }

    setIsProcessing(true);

    try {
      const result = await initiateMeSombPayment({
          amount: course.resaleRightsPrice || 0,
          phoneNumber: phoneNumber,
          service: provider === 'orange' ? 'ORANGE' : 'MTN',
          courseId: course.id,
          userId: user.uid,
      });

      if (!result.success) throw new Error(result.error);

      // 🛡️ Typage sécurisé : On ne traite l'achat interne que si c'est un paiement réel
      if (result.type === 'REAL') {
          const resTransfer = await purchaseResaleRightsAction({
              courseId: course.id,
              buyerId: user.uid,
              transactionId: `TXN-LICENSE-${result.transactionId}`
          });

          if (!resTransfer.success) throw new Error((resTransfer as any).error || "Erreur de transfert.");
      }
      
      setIsSuccess(true);
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Échec de l'acquisition", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <div className="p-8 pt-24 bg-slate-950 min-h-screen"><Skeleton className="h-64 w-full rounded-[3rem] bg-slate-900" /></div>;
  if (!course) return null;

  return (
    <div className="min-h-screen bg-slate-950 pb-40 relative">
      <div className="grain-overlay" />
      
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-white/5 safe-area-pt">
        <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 active:scale-90">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="font-black text-xl text-white uppercase tracking-tight">Investissement</h1>
            </div>
            <div className="w-10" />
        </div>
      </header>

      <main className="pt-24 px-6 max-w-md mx-auto space-y-8 relative z-10 animate-in fade-in duration-700">
        
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/20 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><BadgeEuro size={80} className="text-amber-500" /></div>
            <div className="space-y-1">
                <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                    <Landmark size={12} /> Licence de Revente
                </p>
                <h2 className="text-2xl font-black text-white leading-tight uppercase truncate">{course.title}</h2>
            </div>
            <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                <div className="space-y-1">
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Valeur Marché</p>
                    <p className="text-3xl font-black text-white">{(course.resaleRightsPrice || 0).toLocaleString('fr-FR')} <span className="text-sm font-bold text-amber-500">XOF</span></p>
                </div>
                <div className="text-right"><p className="text-[#10b981] text-xs font-black uppercase flex items-center gap-1"><TrendingUp size={14} /> +12% ROI</p></div>
            </div>
        </div>

        <section className="space-y-4">
            <h2 className="font-black text-white text-[10px] uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-primary" />
                MOYEN DE PAIEMENT
            </h2>
            <div className="grid grid-cols-3 gap-3">
                <ProviderBtn active={provider === 'orange'} onClick={() => setProvider('orange')} label="Orange" color="bg-[#FF7900]" initials="OM" />
                <ProviderBtn active={provider === 'mtn'} onClick={() => setProvider('mtn')} label="MTN" color="bg-[#FFCC00]" initials="MTN" darkText />
                <ProviderBtn active={provider === 'wave'} onClick={() => setProvider('wave')} label="Wave" color="bg-[#1DC0F1]" initials="W" />
            </div>
        </section>

        <section className="space-y-4">
            <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1">Numéro Mobile Money pour débit</label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center border border-white/5">
                    <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <Input 
                    type="tel" 
                    placeholder="+236 ..." 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-16 bg-slate-900 border-white/5 rounded-3xl text-white font-mono text-xl tracking-widest pl-16 px-6" 
                />
            </div>
        </section>

        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={14} className="text-primary" /> Clause de Transfert
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed italic">"L'acquisition via Mobile Money garantit l'attribution immédiate de votre titre de propriété sur Ndara Afrique."</p>
        </div>

      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 z-50 safe-area-pb shadow-2xl">
        <div className="max-w-md mx-auto">
            <Button 
                onClick={handlePurchase} 
                disabled={isProcessing || isSuccess}
                className="w-full h-16 rounded-[2rem] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase text-sm tracking-widest shadow-2xl shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />}
                SIGNER L'ACQUISITION
            </Button>
        </div>
      </footer>

      {isSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-6 animate-in fade-in duration-500">
              <div className="text-center space-y-8 max-w-sm animate-in zoom-in duration-700">
                  <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                      <Landmark className="h-12 w-12 text-slate-950" />
                  </div>
                  <h3 className="font-black text-white text-3xl uppercase tracking-tight">Propriétaire !</h3>
                  <Button onClick={() => router.push(`/${locale}/instructor/dashboard`)} className="w-full h-16 rounded-2xl bg-white text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl">
                      Aller au Dashboard Expert
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
