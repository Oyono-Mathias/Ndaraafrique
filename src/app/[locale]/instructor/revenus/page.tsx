
'use client';

/**
 * @fileOverview Gestion financière Formateur Android-First.
 * Vision claire du solde et interface simplifiée pour les retraits.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Wallet, DollarSign, TrendingUp, ArrowUpRight, History, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { requestPayout } from '@/actions/payoutActions';
import { useToast } from '@/hooks/use-toast';
import type { Payment, Payout } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function InstructorRevenueAndroid() {
    const { currentUser: instructor, isUserLoading } = useRole();
    const db = getFirestore();
    const { toast } = useToast();

    const [payments, setPayments] = useState<Payment[]>([]);
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!instructor?.uid) return;

        setIsLoading(true);
        const instructorId = instructor.uid;

        // Écoute des paiements réussis
        const unsubPayments = onSnapshot(
            query(collection(db, 'payments'), where('instructorId', '==', instructorId), where('status', '==', 'Completed')),
            (snap) => {
                setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
            }
        );

        // Écoute des demandes de retrait
        const unsubPayouts = onSnapshot(
            query(collection(db, 'payouts'), where('instructorId', '==', instructorId)),
            (snap) => {
                setPayouts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payout)).sort((a, b) => (b.date as any)?.toDate() - (a.date as any)?.toDate()));
                setIsLoading(false);
            }
        );

        return () => {
            unsubPayments();
            unsubPayouts();
        };
    }, [instructor?.uid, db]);

    const stats = useMemo(() => {
        const totalEarned = payments.reduce((acc, p) => acc + p.amount, 0);
        const totalWithdrawn = payouts
            .filter(p => p.status === 'valide' || p.status === 'en_attente')
            .reduce((acc, p) => acc + p.amount, 0);
        
        return {
            totalEarned,
            balance: totalEarned - totalWithdrawn
        };
    }, [payments, payouts]);

    const handlePayout = async () => {
        if (stats.balance <= 5000) {
            toast({ variant: 'destructive', title: "Seuil non atteint", description: "Le montant minimum pour un retrait est de 5 000 XOF." });
            return;
        }

        setIsSubmitting(true);
        const result = await requestPayout({ instructorId: instructor!.uid, amount: stats.balance });
        
        if (result.success) {
            toast({ title: "Demande envoyée !", description: "Votre retrait sera traité sous 48h." });
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsSubmitting(false);
    };

    return (
        <div className="flex flex-col gap-8 p-4 pb-24">
            <header className="pt-2">
                <h1 className="text-2xl font-black text-white">Mes Revenus</h1>
                <p className="text-slate-400 text-sm mt-1">Gérez vos gains en toute transparence.</p>
            </header>

            {/* --- SOLDE & RETRAIT --- */}
            <section className="bg-gradient-to-br from-primary/20 to-blue-600/5 border border-primary/20 rounded-3xl p-6 relative overflow-hidden">
                <Wallet className="absolute -right-4 -bottom-4 h-24 w-24 text-primary opacity-5" />
                <p className="text-[10px] uppercase font-black text-primary tracking-widest mb-1">Solde disponible</p>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-black text-white">{isLoading ? "..." : stats.balance.toLocaleString('fr-FR')}</h2>
                    <span className="text-sm font-bold text-slate-400 uppercase">XOF</span>
                </div>
                
                <Button 
                    onClick={handlePayout}
                    disabled={isSubmitting || isLoading || stats.balance <= 0}
                    className="w-full h-12 mt-6 rounded-2xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                    {isSubmitting ? "Traitement..." : "Demander un retrait"}
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
            </section>

            {/* --- HISTORIQUE DES RETRAITS --- */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <History className="h-5 w-5 text-slate-500" />
                        Historique
                    </h3>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-slate-900" />)}
                    </div>
                ) : payouts.length > 0 ? (
                    <div className="grid gap-3">
                        {payouts.map(payout => (
                            <PayoutItem key={payout.id} payout={payout} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                        <p className="text-sm text-slate-500">Aucun historique de retrait.</p>
                    </div>
                )}
            </section>
        </div>
    );
}

function PayoutItem({ payout }: { payout: Payout }) {
    const statusIcon = payout.status === 'valide' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : payout.status === 'rejete' ? <XCircle className="h-4 w-4 text-red-500" /> : <Clock className="h-4 w-4 text-amber-500" />;
    const statusText = payout.status === 'valide' ? 'Payé' : payout.status === 'rejete' ? 'Refusé' : 'En attente';
    const statusColor = payout.status === 'valide' ? 'text-green-500' : payout.status === 'rejete' ? 'text-red-500' : 'text-amber-500';

    return (
        <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-white">{payout.amount.toLocaleString('fr-FR')} XOF</p>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">
                        {payout.date ? format((payout.date as any).toDate(), "d MMM yyyy", { locale: fr }) : ""}
                    </p>
                </div>
                <div className={cn("flex items-center gap-1.5 text-xs font-bold", statusColor)}>
                    {statusIcon}
                    {statusText}
                </div>
            </CardContent>
        </Card>
    );
}
