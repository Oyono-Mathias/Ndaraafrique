'use client';

/**
 * @fileOverview Page du panier étudiant Ndara Afrique.
 * ✅ STYLE : Android-First Vintage.
 * ✅ FONCTIONNEL : Liste, suppression et bouton checkout.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import type { CartItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, ShoppingBag, ArrowLeft, ChevronRight, Lock, Landmark } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

export default function CartPage() {
  const { user, isUserLoading } = useRole();
  const db = getFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    // On redirige vers le premier cours pour le checkout (MVP : un par un ou panier global)
    // Ici on simule une redirection vers le checkout global
    router.push(`/student/checkout/${items[0].courseId}`);
  };

  if (isUserLoading) return <CartSkeleton />;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="p-4 flex items-center gap-4 bg-background/80 border-b border-border sticky top-0 z-30 backdrop-blur-xl">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-black uppercase tracking-tight">Mon Panier</h1>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-6">
        {isLoading ? (
            <div className="space-y-4">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
            </div>
        ) : items.length > 0 ? (
            <div className="space-y-4">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                    {items.length} formation{items.length > 1 ? 's' : ''} dans le panier
                </p>
                
                {items.map(item => (
                    <Card key={item.id} className="bg-card border-border overflow-hidden rounded-2xl shadow-lg group active:scale-[0.98] transition-all">
                        <CardContent className="p-3 flex items-center gap-4">
                            <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                                <Image src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100/100`} alt={item.title} fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm text-foreground truncate">{item.title}</h3>
                                <p className="text-primary font-black text-sm mt-1">{item.price.toLocaleString('fr-FR')} XOF</p>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleRemove(item.id)}
                                className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full"
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}

                <div className="mt-8 pt-6 border-t border-border space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total à régler</span>
                        <div className="text-right">
                            <p className="text-3xl font-black text-foreground">{totalPrice.toLocaleString('fr-FR')} FCFA</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">TVA Incluse</p>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                <div className="p-8 bg-muted/20 rounded-full">
                    <ShoppingBag className="h-16 w-16 text-muted-foreground opacity-20" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black uppercase tracking-tight">Votre panier est vide</h2>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                        Le savoir n'attend pas ! Explorez nos formations et commencez à apprendre.
                    </p>
                </div>
                <Button onClick={() => router.push('/search')} className="h-14 px-8 rounded-xl font-black uppercase text-xs tracking-widest">
                    Découvrir les cours
                </Button>
            </div>
        )}
      </main>

      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-2xl border-t border-border z-40 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
                <div className="flex items-center gap-2 justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    <Lock className="h-3 w-3 text-emerald-500" />
                    Paiement 100% sécurisé via Moneroo
                </div>
                <Button 
                    onClick={handleCheckout}
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/20 font-black uppercase tracking-widest text-sm transition-all active:scale-[0.96]"
                >
                    Finaliser ma commande
                    <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}

function CartSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
    );
}
