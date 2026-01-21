
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next-intl/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Download, Loader2, Gem } from 'lucide-react';
import type { SubscriptionPlan } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { verifySubscriptionTransaction } from '@/actions/subscriptionActions';

export default function SubscriptionSuccessClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('planId');
    const transactionId = searchParams.get('transactionId');

    const db = getFirestore();
    const [verificationState, setVerificationState] = useState<'verifying' | 'success' | 'error'>('verifying');
    
    const planRef = useMemoFirebase(() => planId ? doc(db, 'subscription_plans', planId) : null, [db, planId]);
    const { data: plan, isLoading: planLoading } = useDoc<SubscriptionPlan>(planRef);

    useEffect(() => {
        if (!transactionId || verificationState !== 'verifying') return;

        const verify = async () => {
            const result = await verifySubscriptionTransaction(transactionId);
            if (result.success) {
                setVerificationState('success');
            } else {
                setVerificationState('error');
                toast({ variant: 'destructive', title: 'Erreur de vérification', description: result.error });
                router.push('/abonnements');
            }
        };
        verify();
    }, [transactionId, verificationState, router, toast]);

    const isLoading = planLoading || verificationState === 'verifying';

    return (
        <div className="flex flex-col justify-center items-center min-h-screen gap-6 text-center p-4 bg-slate-900">
            <Card className="w-full max-w-lg shadow-2xl rounded-3xl animate-in fade-in-50 zoom-in-95 bg-slate-800 border-slate-700">
                <CardHeader className="items-center pt-8">
                     <CheckCircle2 className="h-20 w-20 text-green-500 mb-4 animate-pulse" />
                    <CardTitle className="text-3xl font-extrabold text-white">Abonnement Activé !</CardTitle>
                    <p className="text-slate-400 pt-2">Bienvenue parmi nos membres premium. Votre paiement a été validé.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isLoading ? (
                         <div className="p-4 border rounded-xl bg-slate-700/50 flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-lg bg-slate-700" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-full bg-slate-700" />
                                <Skeleton className="h-4 w-1/3 bg-slate-700" />
                            </div>
                        </div>
                    ) : plan ? (
                         <div className="p-4 border rounded-xl bg-slate-900/50 border-slate-700 flex items-center gap-4 text-left">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Gem className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white">{plan.name}</h3>
                                <p className="text-xs font-semibold text-green-400 bg-green-900/50 px-2 py-0.5 rounded-full inline-block mt-1">Statut : Actif</p>
                            </div>
                        </div>
                    ) : null}
                    
                    <Button onClick={() => router.push('/dashboard')} size="lg" className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 rounded-xl">
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        Explorer mes avantages
                    </Button>
                </CardContent>
                <CardFooter className="flex-col gap-3 text-xs text-slate-500 pb-8">
                     <p>N° de transaction : {transactionId}</p>
                     <Button variant="link" className="p-0 h-auto">
                        <Download className="mr-2 h-3 w-3" />
                        Recevoir le reçu par e-mail
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
