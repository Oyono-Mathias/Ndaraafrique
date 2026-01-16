'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { useRole } from '@/context/RoleContext';
import { doc, getFirestore } from 'firebase/firestore';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CreditCard, ArrowLeft, Gem } from 'lucide-react';
import type { SubscriptionPlan } from '@/lib/types';
import Script from 'next/script';

export default function PaymentSubscriptionClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    
    const planId = searchParams.get('planId');
    const [isLoading, setIsLoading] = useState(false);

    const planRef = useMemoFirebase(() => planId ? doc(db, 'subscription_plans', planId) : null, [db, planId]);
    const { data: plan, isLoading: planLoading } = useDoc<SubscriptionPlan>(planRef);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push(`/login?redirect=/abonnements`);
        }
    }, [isUserLoading, user, router]);

    const handlePaymentSuccess = (data: any) => {
        setIsLoading(false);
        router.push(`/payment/subscription-success?planId=${planId}&transactionId=${data.transaction_id}`);
    };

    const handleCheckout = () => {
        if (typeof window !== 'undefined' && (window as any).Moneroo) {
            (window as any).Moneroo.setup({
                publicKey: process.env.NEXT_PUBLIC_MONEROO_PUBLIC_KEY || '',
                onClose: () => setIsLoading(false),
                onSuccess: handlePaymentSuccess,
            }).open({
                amount: plan!.price,
                currency: "XOF",
                description: `Abonnement: ${plan!.name}`,
                customer: {
                    email: currentUser!.email,
                    name: currentUser!.fullName,
                },
                metadata: {
                    planId: plan!.id,
                    userId: currentUser!.uid,
                    paymentType: 'subscription'
                }
            });
        }
    };
    
    const handlePayment = () => {
        if (!plan || !currentUser) return;
        setIsLoading(true);
        handleCheckout();
    };

    const loading = isUserLoading || planLoading;

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-slate-900 p-4">
                <Card className="w-full max-w-md dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader><Skeleton className="h-8 w-3/4 bg-slate-700" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-6 w-full bg-slate-700" />
                        <Skeleton className="h-10 w-full bg-slate-700" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!plan) {
        return (
             <div className="flex flex-col justify-center items-center h-screen gap-4 bg-slate-900">
                <h1 className="text-2xl font-bold text-white">Plan d'abonnement non trouvé</h1>
                <Button onClick={() => router.push('/abonnements')}>Retour aux abonnements</Button>
            </div>
        )
    }

    return (
        <>
            <Script src="https://cdn.moneroo.io/checkout/v1/moneroo.js" strategy="afterInteractive" />
            <div className="flex justify-center items-center min-h-screen bg-slate-900 p-4">
                <Card className="w-full max-w-md shadow-lg rounded-2xl bg-slate-800 border-slate-700">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold text-white">Finaliser votre abonnement</CardTitle>
                        <CardDescription className="text-slate-400">Vous êtes sur le point de passer au niveau supérieur.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 border rounded-xl bg-slate-900/50 border-slate-700 flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Gem className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white">{plan.name}</h3>
                                <p className="text-lg font-bold text-primary mt-1">{plan.price.toLocaleString('fr-FR')} XOF / {plan.billingCycle === 'monthly' ? 'mois' : 'an'}</p>
                            </div>
                        </div>
                        <p className="text-xs text-center text-slate-500">
                            Vous serez redirigé vers notre partenaire de paiement sécurisé Moneroo pour finaliser votre transaction.
                        </p>
                        <Button onClick={handlePayment} disabled={isLoading} size="lg" className="w-full h-12 text-base">
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                            Payer et s'abonner
                        </Button>
                    </CardContent>
                    <CardFooter>
                        <Button variant="link" onClick={() => router.back()} className="text-slate-400 mx-auto">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Annuler
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </>
    )
}
