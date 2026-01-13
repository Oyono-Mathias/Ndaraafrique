
'use client';

import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';
import { useRouter } from 'next/navigation';

interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    price: number;
    billingCycle: 'monthly' | 'yearly';
    features: string[];
    isActive: boolean;
    targetRole: 'student' | 'instructor';
}

const PlanCard = ({ plan, onChoose, isSubmitting }: { plan: SubscriptionPlan, onChoose: (planId: string) => void, isSubmitting: boolean }) => (
    <Card className={cn(
        "flex flex-col dark:bg-slate-800/50 dark:border-slate-700/80 transition-all duration-300",
        plan.name.includes('Pro') ? 'border-primary shadow-2xl shadow-primary/10' : ''
    )}>
        <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold dark:text-white">{plan.name}</CardTitle>
            <CardDescription className="dark:text-slate-400">{plan.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-6">
            <div className="text-center">
                <span className="text-5xl font-extrabold tracking-tighter dark:text-white">{plan.price.toLocaleString('fr-FR')}</span>
                <span className="text-lg font-medium text-muted-foreground"> XOF/{plan.billingCycle === 'monthly' ? 'mois' : 'an'}</span>
            </div>
            <ul className="space-y-3 text-sm">
                {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="dark:text-slate-300">{feature}</span>
                    </li>
                ))}
            </ul>
        </CardContent>
        <CardFooter>
            <Button className="w-full h-12 text-base" onClick={() => onChoose(plan.id)} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Choisir ce plan"}
            </Button>
        </CardFooter>
    </Card>
);


export default function SubscriptionsPage() {
    const db = getFirestore();
    const router = useRouter();
    const { user } = useRole();
    const [studentPlans, setStudentPlans] = useState<SubscriptionPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'subscription_plans'),
            where('isActive', '==', true),
            where('targetRole', '==', 'student')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan));
            setStudentPlans(plans);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);
    
    const handleChoosePlan = (planId: string) => {
        if (!user) {
            router.push('/login');
            return;
        }
        // Redirect to a future payment page for subscriptions
        // For now, let's just log it.
        console.log(`User ${user.uid} chose plan ${planId}`);
        // router.push(`/paiements/abonnement?planId=${planId}`);
    };

    return (
        <div className="space-y-8">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">Nos Abonnements</h1>
                <p className="mt-2 text-lg text-slate-400">Choisissez le plan qui vous convient pour débloquer tout le potentiel de Ndara Afrique.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {isLoading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-96 w-full dark:bg-slate-700" />)
                ) : (
                    studentPlans.map(plan => (
                        <PlanCard key={plan.id} plan={plan} onChoose={handleChoosePlan} isSubmitting={false} />
                    ))
                )}
            </div>
        </div>
    );
}

