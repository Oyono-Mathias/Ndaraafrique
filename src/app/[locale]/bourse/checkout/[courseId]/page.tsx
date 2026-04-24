'use client';

/**
 * @fileOverview Tunnel d'acquisition de licence de revente V2.1.
 * ✅ UNIFICATION : Statuts en minuscules.
 * ✅ TRAÇABILITÉ : Ajout du courseTitle.
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
          courseTitle: `Licence: ${course.title}`,
          userId: user.uid,
          type: 'license_purchase'
      });

      if (!result.success) throw new Error(result.error);

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
            <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 active:scale-90 transition"><ArrowLeft className="h-5 w-5" /></button>
            <h1 className="font-black text-xl text-white uppercase tracking-tight">Investissement</h1>
            <div className="w-10" />
        </div>
      </header>

      <main className="pt-24 px-6 max-w-md mx-auto space-y-8 relative z-10 animate-in fade-in duration-700">
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/20 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><BadgeEuro size={80} className="text-amber-500" /></div>
            <div className="space-y-1">
                <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><Landmark size={12} /> Licence de Revente</p>
                <h2 className="text-2xl font-black text-white leading-tight uppercase truncate">{course.title}</h2>
            </div>
            <div className="pt-4 border-t border-white/5">
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Valeur Marché</p>
                <p className="text-3xl font-black text-white">{(course.resaleRightsPrice || 0).toLocaleString('fr-FR')} <span className="text-sm font-bold text-amber-500">XOF</span></p>
            </div>
        </div>

        <section className="space-y-4">
            <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1">Numéro Mobile Money pour débit</label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center border border-white/5">
                    <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <Input type="tel" placeholder="+236 ..." value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-16 bg-slate-900 border-white/5 rounded-3xl text-white font-mono text-xl tracking-widest pl-16 px-6" />
            </div>
        </section>

        <Button onClick={handlePurchase} disabled={isProcessing || isSuccess} className="w-full h-16 rounded-[2rem] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase text-sm tracking-widest shadow-2xl transition-all active:scale-95">
            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />}
            SIGNER L'ACQUISITION
        </Button>
      </main>
    </div>
  );
}
