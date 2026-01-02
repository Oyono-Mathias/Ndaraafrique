
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { getFirestore, doc, getDoc, serverTimestamp, setDoc, addDoc, collection } from 'firebase/firestore';

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import type { Course } from '@/lib/types';


export default function PaiementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isUserLoading } = useRole();
  const db = getFirestore();
  
  const courseId = searchParams.get('courseId');

  const [course, setCourse] = useState<Course | null>(null);
  const [isCourseLoading, setIsCourseLoading] = useState(true);

  useEffect(() => {
    if (!courseId) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Aucun cours sélectionné.'});
        router.push('/dashboard');
        return;
    }

    const fetchCourse = async () => {
        setIsCourseLoading(true);
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) {
            setCourse({ id: courseSnap.id, ...courseSnap.data() } as Course);
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Cours non trouvé.'});
            router.push('/dashboard');
        }
        setIsCourseLoading(false);
    };
    fetchCourse();
  }, [courseId, router, toast, db]);


  // Simulate payment processing and random outcome
  useEffect(() => {
    if (isUserLoading || isCourseLoading || !course || !user) return;

    const processPayment = async () => {
        // 1. Create a pending payment record
        try {
            await addDoc(collection(db, 'payments'), {
                userId: user.uid,
                instructorId: course.instructorId,
                courseId: course.id,
                amount: course.price,
                currency: 'XOF',
                date: serverTimestamp(),
                status: 'Pending',
                method: 'moneroo_simulation',
            });
        } catch (error) {
            console.error("Error creating pending payment record: ", error);
            // In a real app, you might not redirect on this failure
        }
        
        // 2. Simulate API call to payment provider (e.g., Moneroo)
        const paymentProcessingTimeout = setTimeout(() => {
            const isSuccess = Math.random() > 0.2; // 80% chance of success

            if (isSuccess) {
                 // 3. On success, create enrollment (this would happen in your webhook)
                const enrollmentId = `${user.uid}_${course.id}`;
                const enrollmentRef = doc(db, 'enrollments', enrollmentId);
                setDoc(enrollmentRef, {
                    studentId: user.uid,
                    courseId: course.id,
                    instructorId: course.instructorId,
                    enrollmentDate: serverTimestamp(),
                    progress: 0,
                }).then(() => {
                    // 4. Redirect to success page
                    router.push(`/payment/success?courseId=${course.id}`);
                }).catch(err => {
                    console.error("Enrollment creation failed: ", err);
                    router.push(`/payment/error?courseId=${course.id}`);
                });

            } else {
                // 4. On failure, redirect to error page
                router.push(`/payment/error?courseId=${course.id}`);
            }
        }, 4000); // 4-second delay to simulate processing

        return () => clearTimeout(paymentProcessingTimeout);
    };
    
    processPayment();

  }, [isUserLoading, user, isCourseLoading, course, router, db]);


  const renderLoadingState = () => (
    <div className="flex flex-col justify-center items-center h-screen gap-4 text-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="text-xl font-semibold">Redirection vers la plateforme sécurisée...</h2>
        <p className="text-muted-foreground max-w-sm">Veuillez patienter pendant que nous préparons votre transaction pour le cours.</p>
        <Card className="w-full max-w-sm mt-4">
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-lg" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/3" />
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );

  const renderPaymentPage = () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl">
        <CardHeader className="text-center">
            <Button variant="ghost" className="absolute top-4 left-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
            </Button>
          <CardTitle className="text-2xl font-bold">Récapitulatif</CardTitle>
          <CardDescription>Vous êtes sur le point d'acheter</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="p-4 border rounded-lg bg-slate-50 flex flex-col items-center text-center gap-4">
                <Image 
                    src={course?.imageUrl || `https://picsum.photos/seed/${course?.id}/300/170`}
                    alt={course?.title || 'Image du cours'}
                    width={300}
                    height={170}
                    className="rounded-lg aspect-video object-cover"
                />
                <div>
                    <p className="text-base font-bold">{course?.title}</p>
                    <p className="text-2xl font-extrabold mt-2 text-primary">{course?.price.toLocaleString('fr-FR')} XOF</p>
                </div>
            </div>
            <div className="flex flex-col items-center justify-center text-center">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="text-sm text-muted-foreground mt-2">Préparation de la redirection...</p>
            </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-center text-muted-foreground w-full">Vous serez redirigé vers notre partenaire de paiement sécurisé pour finaliser votre achat.</p>
        </CardFooter>
      </Card>
    </div>
  );


  if (isUserLoading || isCourseLoading) {
    return renderLoadingState();
  }

  return renderPaymentPage();
}
