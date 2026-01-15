

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { useRole } from '@/context/RoleContext';
import { doc, getFirestore } from 'firebase/firestore';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CreditCard, ArrowLeft } from 'lucide-react';
import type { Course } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import Script from 'next/script';


function PaymentPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, ndaraUser, isUserLoading } = useRole();
    const db = getFirestore();
    
    const courseId = searchParams.get('courseId');
    const [isLoading, setIsLoading] = useState(false);

    const courseRef = useMemoFirebase(() => courseId ? doc(db, 'courses', courseId) : null, [db, courseId]);
    const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
    
    const instructorRef = useMemoFirebase(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [db, course]);
    const { data: instructor } = useDoc(instructorRef);

    const handlePaymentSuccess = (data: any) => {
        // The server-side verification and enrollment logic is now handled by the Moneroo webhook and Cloud Function.
        // The client's only job is to redirect to a success page.
        setIsLoading(false);
        router.push(`/payment/success?courseId=${courseId}&transactionId=${data.transaction_id}`);
    };

    const handleCheckout = () => {
        if (typeof window !== 'undefined' && (window as any).Moneroo) {
            (window as any).Moneroo.setup({
                publicKey: process.env.NEXT_PUBLIC_MONEROO_PUBLIC_KEY || '',
                onClose: () => setIsLoading(false),
                onSuccess: handlePaymentSuccess,
            }).open({
                amount: course!.price,
                currency: "XOF",
                description: `Achat du cours: ${course!.title}`,
                customer: {
                    email: ndaraUser!.email,
                    name: ndaraUser!.fullName,
                },
                metadata: {
                    courseId: course!.id,
                    userId: ndaraUser!.uid,
                }
            });
        }
    };
    
    const handlePayment = () => {
        if (!course || !ndaraUser) return;
        setIsLoading(true);
        handleCheckout();
    };

    const loading = isUserLoading || courseLoading;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen dark:bg-slate-900">
                <Card className="w-full max-w-md dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader><Skeleton className="h-8 w-3/4 dark:bg-slate-700" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-6 w-full dark:bg-slate-700" />
                        <Skeleton className="h-10 w-full dark:bg-slate-700" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!course) {
        return (
             <div className="flex flex-col justify-center items-center h-screen gap-4 dark:bg-slate-900">
                <h1 className="text-2xl font-bold text-white">Cours non trouvé</h1>
                <Button onClick={() => router.push('/dashboard')}>Retour à l'accueil</Button>
            </div>
        )
    }

    return (
        <>
            <Script src="https://cdn.moneroo.io/checkout/v1/moneroo.js" strategy="afterInteractive" />
            <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
                <Card className="w-full max-w-md shadow-lg rounded-2xl dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold dark:text-white">Finaliser votre achat</CardTitle>
                        <CardDescription className="dark:text-slate-400">Vous êtes sur le point de vous inscrire à un cours exceptionnel.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 border rounded-xl bg-slate-100 dark:bg-slate-800/50 dark:border-slate-700 flex items-center gap-4">
                            <Image 
                                src={course.imageUrl || `https://picsum.photos/seed/${course.id}/150/100`}
                                alt={course.title}
                                width={80}
                                height={45}
                                className="rounded-lg aspect-video object-cover"
                            />
                            <div className="flex-1">
                                <h3 className="font-bold text-sm line-clamp-2 dark:text-white">{course.title}</h3>
                                <p className="text-lg font-bold text-primary mt-1">{course.price.toLocaleString('fr-FR')} XOF</p>
                            </div>
                        </div>
                        <p className="text-xs text-center text-muted-foreground dark:text-slate-500">
                            Vous serez redirigé vers la passerelle de paiement sécurisée de Moneroo pour finaliser votre transaction.
                        </p>
                        <Button onClick={handlePayment} disabled={isLoading} size="lg" className="w-full h-12 text-base">
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                            Payer en toute sécurité
                        </Button>
                    </CardContent>
                    <CardFooter>
                        <Button variant="link" onClick={() => router.back()} className="text-muted-foreground mx-auto">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Annuler et retourner au cours
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </>
    )
}

export default function PaiementsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <PaymentPageContent />
        </Suspense>
    );
}
