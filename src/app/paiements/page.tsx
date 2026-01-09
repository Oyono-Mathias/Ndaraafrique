
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft, Ticket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import type { Course } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { createMonerooPaymentLink } from '@/app/actions/monerooActions';

interface PromoCode {
    id: string;
    code: string;
    discountPercentage: number;
    isActive: boolean;
}

export default function PaiementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, formaAfriqueUser, isUserLoading } = useRole();
  const db = getFirestore();
  
  const courseId = searchParams.get('courseId');

  const [course, setCourse] = useState<Course | null>(null);
  const [isCourseLoading, setIsCourseLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const discountedPrice = useMemo(() => {
    if (!course) return 0;
    if (appliedPromo) {
        return Math.max(0, course.price * (1 - appliedPromo.discountPercentage / 100));
    }
    return course.price;
  }, [course, appliedPromo]);

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

  const handlePayment = async () => {
      if (!user || !course || !formaAfriqueUser) {
          toast({ variant: 'destructive', title: 'Erreur', description: 'Vous devez être connecté pour acheter.' });
          return;
      }
      setIsProcessing(true);
      setErrorMessage('');

      const result = await createMonerooPaymentLink({
          amount: discountedPrice,
          currency: 'XOF',
          description: `Achat du cours: ${course.title}`,
          customer: {
              email: formaAfriqueUser.email,
              name: formaAfriqueUser.fullName,
          },
          metadata: {
              userId: user.uid,
              courseId: course.id,
              courseTitle: course.title,
              instructorId: course.instructorId,
          }
      });
      
      if (result.success && result.paymentLink) {
          router.push(result.paymentLink);
      } else {
          setErrorMessage(result.error || 'Une erreur inconnue est survenue.');
          setIsProcessing(false);
      }
  };
  
  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) return;
    setIsProcessing(true);

    const promoQuery = query(collection(db, 'promoCodes'), where('code', '==', promoCode.trim().toUpperCase()), where('isActive', '==', true));
    const snapshot = await getDocs(promoQuery);

    if (snapshot.empty) {
        toast({ variant: 'destructive', title: 'Code invalide', description: 'Ce code promo est invalide ou a expiré.'});
        setAppliedPromo(null);
    } else {
        const promo = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PromoCode;
        setAppliedPromo(promo);
        toast({ title: 'Code appliqué !', description: `Vous avez obtenu une réduction de ${promo.discountPercentage}%.`});
    }
    setIsProcessing(false);
  }

  const renderLoadingState = () => (
    <div className="flex flex-col justify-center items-center h-screen gap-4 text-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="text-xl font-semibold">Chargement des informations...</h2>
    </div>
  );

  if (isUserLoading || isCourseLoading) {
    return renderLoadingState();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl">
        <CardHeader className="text-center relative">
            <Button variant="ghost" className="absolute top-4 left-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
            </Button>
          <CardTitle className="text-2xl font-bold pt-10">Récapitulatif</CardTitle>
          <CardDescription>Vérifiez les détails avant de payer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="p-4 border rounded-lg bg-slate-100 flex flex-col items-center text-center gap-4">
                <Image 
                    src={course?.imageUrl || `https://picsum.photos/seed/${course?.id}/300/170`}
                    alt={course?.title || 'Image du cours'}
                    width={300}
                    height={170}
                    className="rounded-lg aspect-video object-cover"
                />
                <div>
                    <p className="text-base font-bold">{course?.title}</p>
                    {appliedPromo ? (
                        <div className="flex items-center gap-2 justify-center mt-2">
                             <p className="text-lg line-through text-muted-foreground">{course?.price.toLocaleString('fr-FR')} XOF</p>
                             <p className="text-2xl font-extrabold text-primary">{discountedPrice.toLocaleString('fr-FR')} XOF</p>
                        </div>
                    ) : (
                        <p className="text-2xl font-extrabold mt-2 text-primary">{course?.price.toLocaleString('fr-FR')} XOF</p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="promo-code" className="text-sm font-medium">Code Promo</label>
                <div className="flex gap-2">
                    <Input id="promo-code" value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="Ex: AFRIQUE50" disabled={!!appliedPromo} />
                    <Button onClick={handleApplyPromoCode} disabled={!promoCode.trim() || isProcessing || !!appliedPromo}>
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Appliquer'}
                    </Button>
                </div>
                {appliedPromo && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                        <Ticket className="h-4 w-4"/> Réduction de {appliedPromo.discountPercentage}% appliquée !
                    </p>
                )}
            </div>

             {errorMessage && (
                <p className="text-sm font-medium text-destructive text-center">{errorMessage}</p>
             )}

        </CardContent>
        <CardFooter className="flex-col gap-4">
             <Button size="lg" className="w-full h-12 text-base" onClick={handlePayment} disabled={isProcessing}>
                 {isProcessing ? <Loader2 className="h-5 w-5 animate-spin"/> : `Payer ${discountedPrice.toLocaleString('fr-FR')} XOF`}
             </Button>
            <p className="text-xs text-center text-muted-foreground w-full">Vous serez redirigé vers notre partenaire de paiement sécurisé pour finaliser votre achat.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
