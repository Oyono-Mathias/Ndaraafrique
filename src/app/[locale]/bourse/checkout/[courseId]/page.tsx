
'use client';

/**
 * @fileOverview Tunnel d'acquisition de licence de revente (Marché Secondaire).
 * ✅ DESIGN : Prestige Gold & Emerald.
 * ✅ LOGIQUE : Transfert de propriété définitif après paiement.
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
  ShieldCheck,
  Landmark,
  BadgeEuro,
  TrendingUp,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Course } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { purchaseResaleRightsAction } from '@/actions/courseActions';
import { cn } from '@/lib/utils';

export default function BourseCheckoutPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const router = useRouter();
  const { user } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const handlePurchase = async () => {
    if (!user || !course) return;
    if (!phoneNumber || phoneNumber.length < 8) {
        toast({ variant: 'destructive', title: "Numéro requis", description: "Veuillez saisir votre numéro Mobile Money." });
        return;
    }

    setIsProcessing(true);

    try {
      // 1. Simulation du paiement Moneroo (Haute Valeur)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 2. Action Serveur : Transfert de propriété
      const result = await purchaseResaleRightsAction({
          courseId: course.id,
          buyerId: user.uid,
          transactionId: `TXN-LICENSE-${Date.now()}`
      });

      if (result.success) {
          setIsSuccess(true);
          toast({ title: "Acquisition réussie !", description: "Vous êtes le nouveau propriétaire." });
      } else {
          throw new Error(result.error);
      }
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Échec de l'acquisition", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (courseLoading) return <div className="p-8 pt-24 bg-slate-950 min-h-screen"><Skeleton className="h-64 w-full rounded-[3rem] bg-slate-900" /></div>;
  if (!course) return <div className="p-8 pt-24 text-center text-slate-400 bg-slate-950 min-h-screen">Actif non trouvé.</div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-40 relative font-sans">
      <div className="grain-overlay" />
      
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-white/5 safe-area-pt">
        <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 active:scale-90">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="font-black text-xl text-white uppercase tracking-tight">Acquisition d'Actif</h1>
            </div>
            <div className="w-10" />
        </div>
      </header>

      <main className="pt-24 px-6 max-w-md mx-auto space-y-8 relative z-10 animate-in fade-in duration-1000">
        
        {/* --- LICENSE SUMMARY --- */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/20 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <BadgeEuro size={80} className="text-amber-500" />
            </div>
            
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-[0.3em]">
                    <Landmark size={12} />
                    Licence de Revente
                </div>
                <h2 className="text-2xl font-black text-white leading-tight uppercase tracking-tight truncate">{course.title}</h2>
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                <div className="space-y-1">
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Valeur de l'actif</p>
                    <p className="text-3xl font-black text-white">{(course.resaleRightsPrice || 0).toLocaleString('fr-FR')} <span className="text-sm font-bold text-amber-500">XOF</span></p>
                </div>
                <div className="text-right">
                    <p className="text-[#10b981] text-xs font-black uppercase flex items-center gap-1">
                        <TrendingUp size={14} /> +12% ROI
                    </p>
                </div>
            </div>
        </Card>

        {/* --- TRANSFER INFO --- */}
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={14} className="text-primary" />
                Clauses de Transfert
            </h3>
            <ul className="space-y-3">
                <li className="flex items-start gap-3">
                    <Check size={14} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 leading-relaxed">Pleine propriété intellectuelle transférée sur Ndara Afrique.</p>
                </li>
                <li className="flex items-start gap-3">
                    <Check size={14} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 leading-relaxed">Encaissement automatique de 100% des futures ventes directes.</p>
                </li>
                <li className="flex items-start gap-3">
                    <Check size={14} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 leading-relaxed">Droit de revente de la licence sur le marché secondaire.</p>
                </li>
            </ul>
        </div>

        {/* --- PAYMENT --- */}
        <section className="space-y-4">
            <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1">Numéro Mobile Money pour débit</label>
            <Input 
                type="tel" 
                placeholder="+236 ..." 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-16 bg-slate-900 border-white/5 rounded-3xl text-white font-mono text-xl tracking-widest px-6" 
            />
        </section>

      </main>

      {/* --- FIXED ACTION BAR --- */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 z-50 safe-area-pb">
        <div className="max-w-md mx-auto space-y-4">
            <Button 
                onClick={handlePurchase} 
                disabled={isProcessing || isSuccess}
                className="w-full h-16 rounded-[2rem] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase text-sm tracking-widest shadow-2xl shadow-amber-500/20 active:scale-95 transition-all"
            >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2"/> : <Lock className="h-4 w-4 mr-2" />}
                SIGNER L'ACQUISITION
            </Button>
        </div>
      </footer>

      {/* --- SUCCESS MODAL --- */}
      {isSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-6 animate-in fade-in duration-500">
              <div className="text-center space-y-8 max-w-sm animate-in zoom-in duration-700">
                  <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(245,158,11,0.4)]">
                      <Landmark className="h-12 w-12 text-slate-950" />
                  </div>
                  <div className="space-y-2">
                      <h3 className="font-black text-white text-3xl uppercase tracking-tight leading-none">Propriétaire !</h3>
                      <p className="text-slate-400 text-sm font-medium italic">"Bienvenue dans l'élite des détenteurs du savoir."</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 text-left">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3">Confirmation de titre</p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                          La formation <b>{course.title}</b> a été rattachée à votre compte expert. Vous pouvez dès maintenant gérer son contenu et percevoir les revenus.
                      </p>
                  </div>
                  <Button 
                    onClick={() => router.push('/instructor/dashboard')}
                    className="w-full h-16 rounded-2xl bg-white text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                  >
                      Aller au Dashboard Expert
                  </Button>
              </div>
          </div>
      )}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={cn("bg-slate-900 rounded-[2rem] border border-white/5", className)}>
            {children}
        </div>
    );
}
