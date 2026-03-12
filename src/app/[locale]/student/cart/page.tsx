'use client';

/**
 * @fileOverview Page du panier étudiant Ndara Afrique - Design Android-First V2.
 * ✅ ESTHÉTIQUE : Ticket de caisse vintage et cartes très arrondies.
 * ✅ FONCTIONNEL : Synchronisation temps réel et suppression fluide.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import type { CartItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Trash2, 
    ShoppingBag, 
    ArrowLeft, 
    ChevronRight, 
    Lock, 
    Smartphone, 
    CreditCard, 
    Receipt, 
    Ticket,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function CartPage() {
  const { user, isUserLoading } = useRole();
  const db = getFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'card'>('momo');

  useEffect(() => {
    if (!user?.uid) return;

    const cartRef = collection(db, 'users', user.uid, 'cart');
    const unsubscribe = onSnapshot(cartRef, (snap) => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as CartItem)));
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, db]);

  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.price || 0), 0);
  }, [items]);

  const handleRemove = async (courseId: string) => {
    if (!user) return;
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'cart', courseId));
        toast({ title: "Article retiré" });
    } catch (err) {
        toast({ variant: 'destructive', title: "Erreur suppression" });
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    // On redirige vers le checkout du premier cours (MVP)
    router.push(`/student/checkout/${items[0].courseId}`);
  };

  if (isUserLoading) return <CartSkeleton />;

  return (
    <div className="min-h-screen bg-[#0f172a] pb-40 relative">
      <div className="grain-overlay" />
      
      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-white/5 safe-top">
        <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => router.back()} 
                    className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center text-gray-400 hover:text-white transition active:scale-90"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="font-black text-xl text-white uppercase tracking-tight">Mon Panier</h1>
            </div>
            <div className="w-10" />
        </div>
      </header>

      <main className="pt-24 px-4 max-w-2xl mx-auto space-y-8 relative z-10">
        {isLoading ? (
            <div className="space-y-4">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[2rem] bg-slate-900 border border-white/5" />)}
            </div>
        ) : items.length > 0 ? (
            <div className="space-y-6">
                <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                        {items.length} formation{items.length > 1 ? 's' : ''} sélectionnée{items.length > 1 ? 's' : ''}
                    </p>
                    
                    {items.map(item => (
                        <div key={item.id} className="bg-[#1e293b] border border-white/5 rounded-[2rem] p-3 flex gap-4 shadow-xl active:scale-[0.98] transition-all">
                            <div className="relative h-20 w-24 shrink-0 rounded-[1.5rem] overflow-hidden bg-slate-800 shadow-inner">
                                <Image src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100/100`} alt={item.title} fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                <div>
                                    <h3 className="font-black text-sm text-white leading-tight line-clamp-2 uppercase tracking-tight">{item.title}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Accès Permanent</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-[#10b981] font-black text-base uppercase">{item.price.toLocaleString('fr-FR')} <span className="text-[10px]">XOF</span></p>
                                    <button 
                                        onClick={() => handleRemove(item.id)}
                                        className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* --- VINTAGE RECEIPT --- */}
                <div className="relative">
                    <div className="bg-[#FEF3C7] rounded-[2rem] overflow-hidden shadow-2xl relative">
                        {/* Scalloped top */}
                        <div className="h-3 w-full" style={{ backgroundImage: 'radial-gradient(circle at 10px -1px, transparent 10px, #FEF3C7 11px)', backgroundSize: '20px 20px', backgroundRepeat: 'repeat-x' }} />
                        
                        <div className="px-8 py-6 space-y-6">
                            <div className="text-center space-y-1 border-b-2 border-dashed border-[#D97706]/20 pb-6">
                                <div className="w-12 h-12 bg-[#D97706]/10 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <Receipt className="h-6 w-6 text-[#D97706]" />
                                </div>
                                <h2 className="font-black text-[#D97706] text-lg uppercase tracking-tight">Récapitulatif</h2>
                                <p className="font-mono text-[#D97706]/60 text-[10px] uppercase tracking-[0.2em]">Ndara Afrique v2.0</p>
                            </div>

                            <div className="space-y-3 font-mono text-[#D97706] text-sm">
                                {items.map(item => (
                                    <div key={item.id} className="flex justify-between gap-4">
                                        <span className="truncate flex-1">{item.title}</span>
                                        <span className="font-bold">{item.price.toLocaleString('fr-FR')} F</span>
                                    </div>
                                ))}
                                <div className="pt-2 flex justify-between text-[#10b981] font-bold">
                                    <span>Remise Platform</span>
                                    <span>-0 F</span>
                                </div>
                            </div>

                            <div className="border-t-2 border-dashed border-[#D97706]/20 pt-6">
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-[#D97706] text-lg uppercase tracking-tighter">TOTAL</span>
                                    <span className="font-mono font-black text-[#D97706] text-3xl">{totalPrice.toLocaleString('fr-FR')} F</span>
                                </div>
                            </div>

                            <div className="bg-[#10b981]/10 rounded-2xl p-3 text-center border border-[#10b981]/20">
                                <p className="font-mono text-[#D97706] text-[10px] uppercase font-bold tracking-widest">
                                    Code promo applicable à l'étape suivante
                                </p>
                            </div>
                        </div>

                        {/* Scalloped bottom */}
                        <div className="h-3 w-full" style={{ backgroundImage: 'radial-gradient(circle at 10px 1px, transparent 10px, #0f172a 11px)', backgroundSize: '20px 20px', backgroundRepeat: 'repeat-x' }} />
                    </div>
                    {/* Animated dash decorative border */}
                    <div className="absolute inset-0 border-2 border-dashed border-[#D97706]/10 rounded-[2.2rem] pointer-events-none -m-1" />
                </div>

                {/* --- PAYMENT METHOD --- */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                        <Smartphone className="h-3.5 w-3.5" /> MOYEN DE PAIEMENT
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setPaymentMethod('momo')}
                            className={cn(
                                "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95",
                                paymentMethod === 'momo' ? "bg-[#10b981]/10 border-[#10b981] text-white" : "bg-[#1e293b] border-white/5 text-slate-500"
                            )}
                        >
                            <Smartphone className="h-5 w-5" />
                            <span className="text-xs font-black uppercase">Mobile Money</span>
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('card')}
                            className={cn(
                                "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 opacity-50",
                                paymentMethod === 'card' ? "bg-[#10b981]/10 border-[#10b981] text-white" : "bg-[#1e293b] border-white/5 text-slate-500"
                            )}
                        >
                            <CreditCard className="h-5 w-5" />
                            <span className="text-xs font-black uppercase">Carte / PayPal</span>
                        </button>
                    </div>
                </section>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-8 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-[#1e293b] rounded-full flex items-center justify-center shadow-2xl">
                    <ShoppingBag className="h-10 w-10 text-slate-700" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none">Panier Vide</h2>
                    <p className="text-slate-500 text-sm max-w-[200px] mx-auto font-medium">Le savoir n'attend pas. Explorez nos formations.</p>
                </div>
                <Button onClick={() => router.push('/search')} className="h-14 px-8 rounded-2xl bg-primary text-[#0f172a] font-black uppercase text-xs tracking-widest shadow-xl">
                    Découvrir les cours
                </Button>
            </div>
        )}
      </main>

      {/* --- FIXED ACTION BAR --- */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#1e293b]/95 backdrop-blur-xl border-t border-white/5 z-50 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#10b981]/20 flex items-center justify-center">
                        <Lock className="h-3 w-3 text-[#10b981]" />
                    </div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">Paiement 100% sécurisé via <span className="text-white font-black">Moneroo</span></span>
                </div>
                
                <Button 
                    onClick={handleCheckout}
                    className="w-full h-16 rounded-[2rem] bg-[#10b981] hover:bg-[#10b981]/90 text-[#0f172a] font-black uppercase text-sm tracking-widest shadow-2xl shadow-[#10b981]/20 group transition-all active:scale-95"
                >
                    Finaliser ma commande
                    <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <button 
                    onClick={() => router.push('/search')}
                    className="w-full text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] py-2"
                >
                    Continuer mes achats
                </button>
            </div>
        </div>
      )}
    </div>
  );
}

function CartSkeleton() {
    return (
        <div className="p-4 pt-24 space-y-6">
            <Skeleton className="h-10 w-1/2 bg-slate-900" />
            <Skeleton className="h-32 w-full rounded-[2rem] bg-slate-900" />
            <Skeleton className="h-64 w-full rounded-[2rem] bg-slate-900" />
        </div>
    );
}
