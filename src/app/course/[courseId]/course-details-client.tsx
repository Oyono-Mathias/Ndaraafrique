
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { useRole } from '@/context/RoleContext';
import { doc, getFirestore, collection, serverTimestamp, query, where, getDocs, setDoc, updateDoc, addDoc, orderBy, DocumentData, QuerySnapshot, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreditCard, Info, BookOpen, Gift, Loader2, Check, Star, AlertTriangle, MessageSquarePlus, MessageSquare, Video, PlayCircle, Lock, ChevronRight, ChevronDown, ChevronUp, Book, Globe, Clock, Users, Tv, FileText, ShoppingCart, Heart, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Review, Section, Lecture, Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ReviewForm } from '@/components/reviews/review-form';
import { Textarea } from '@/components/ui/textarea';
import dynamic from 'next/dynamic';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { sendEnrollmentEmails } from '@/lib/emails';
import { verifyMonerooTransaction } from '@/app/actions/monerooActions';
import Script from 'next/script';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

interface ReviewWithUser extends Review {
  reviewerName?: string;
  reviewerImage?: string;
}

const StarRating = ({ rating, reviewCount, size = 'md' }: { rating: number, reviewCount?: number, size?: 'sm' | 'md' | 'lg' }) => {
  const starSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  return (
    <div className="flex items-center gap-2">
      <span className={cn("font-bold text-amber-400", size === 'sm' ? 'text-sm' : 'text-base')}>{rating.toFixed(1)}</span>
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              starSizeClasses[size],
              i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-500'
            )}
          />
        ))}
      </div>
      {reviewCount && <span className="text-sm text-slate-400">({reviewCount.toLocaleString('fr-FR')} avis)</span>}
    </div>
  );
};

const CourseCurriculum = ({ courseId, isEnrolled, onPreviewClick }: { courseId: string, isEnrolled: boolean, onPreviewClick: (lesson: Lecture) => void }) => {
    const db = getFirestore();
    const sectionsQuery = useMemoFirebase(() => query(collection(db, 'courses', courseId, 'sections'), orderBy('order')), [db, courseId]);
    const { data: sections, isLoading: sectionsLoading } = useCollection<Section>(sectionsQuery);
    
    const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
    const [lecturesLoading, setLecturesLoading] = useState(true);

    useEffect(() => {
        if (!sections || sectionsLoading) {
            if (!sectionsLoading) setLecturesLoading(false);
            return;
        }

        setLecturesLoading(true);
        const allLecturesPromises: Promise<QuerySnapshot<DocumentData>>[] = [];
        sections.forEach(section => {
          const lecturesQuery = query(collection(db, 'courses', courseId, 'sections', section.id, 'lectures'), orderBy('title'));
          allLecturesPromises.push(getDocs(lecturesQuery));
        });

        Promise.all(allLecturesPromises).then(lectureSnapshots => {
            const newLecturesMap = new Map<string, Lecture[]>();
            lectureSnapshots.forEach((snapshot, index) => {
                const sectionId = sections[index].id;
                const lectures = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture));
                newLecturesMap.set(sectionId, lectures);
            });
            setLecturesMap(newLecturesMap);
            setLecturesLoading(false);
        }).catch(err => {
            console.error("Error fetching lectures:", err);
            setLecturesLoading(false);
        });
    }, [sections, sectionsLoading, db, courseId]);
    
    if (sectionsLoading) {
        return <Skeleton className="h-48 w-full" />;
    }

    if (!sections || sections.length === 0) {
        return null;
    }
    
    return (
        <div className="w-full space-y-2">
           <h2 className="text-2xl font-bold text-white mb-4">Programme d'études</h2>
           <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="w-full space-y-2">
            {sections.map((section) => (
              <AccordionItem key={section.id} value={section.id} className="bg-slate-800/50 border border-slate-700/80 rounded-lg overflow-hidden">
                  <AccordionTrigger className="w-full flex justify-between items-center px-4 py-3 text-left font-semibold text-white hover:no-underline">
                      <span>{section.title}</span>
                  </AccordionTrigger>
                  <AccordionContent className="bg-slate-800/20">
                      {lecturesLoading ? <Skeleton className="h-10 w-full m-2" /> : (
                          <ul className="divide-y divide-slate-700/50">
                              {(lecturesMap.get(section.id) || []).map(lecture => {
                                  const canPreview = lecture.isFreePreview || isEnrolled;
                                  return (
                                      <li key={lecture.id}>
                                        <button onClick={() => canPreview && onPreviewClick(lecture)} disabled={!canPreview} className="w-full text-left flex items-center text-sm p-3 transition-colors hover:bg-slate-700/50 disabled:opacity-60 disabled:cursor-not-allowed">
                                            <div className="flex-1 flex items-start gap-3">
                                                {canPreview ? <PlayCircle className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" /> : <Lock className="h-4 w-4 mr-2 text-slate-500 shrink-0 mt-0.5" />}
                                                <span className="text-slate-300">{lecture.title}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                                {lecture.isFreePreview && !isEnrolled && <Badge variant="outline" className="text-xs border-primary text-primary">Aperçu</Badge>}
                                                <span>{lecture.duration ? `${lecture.duration} min` : ''}</span>
                                            </div>
                                        </button>
                                      </li>
                                  );
                              })}
                          </ul>
                      )}
                  </AccordionContent>
              </AccordionItem>
            ))}
            </Accordion>
        </div>
    );
};


const ReviewsSection = ({ courseId, isEnrolled }: { courseId: string, isEnrolled: boolean }) => {
  const db = getFirestore();
  const { user, isUserLoading } = useRole();
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewsWithUsers, setReviewsWithUsers] = useState<ReviewWithUser[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const reviewsQuery = useMemoFirebase(() => query(collection(db, 'reviews'), where('courseId', '==', courseId)), [db, courseId]);
  const { data: reviews, isLoading: rawReviewsLoading } = useCollection<Review>(reviewsQuery);
  
  useEffect(() => {
    if (user && reviews) {
      const userReview = reviews.find(r => r.userId === user.uid);
      setHasReviewed(!!userReview);
    }
  }, [user, reviews]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!reviews || reviews.length === 0) {
        setReviewsWithUsers([]);
        setReviewsLoading(false);
        return;
      }
      
      setReviewsLoading(true);
      const userIds = [...new Set(reviews.map(r => r.userId))];
      if (userIds.length === 0) {
          setReviewsWithUsers([]);
          setReviewsLoading(false);
          return;
      }
      const usersRef = collection(db, 'users');
      // Firestore 'in' query has a limit of 30 items
      const usersQuery = query(usersRef, where('uid', 'in', userIds.slice(0, 30)));
      const userSnapshots = await getDocs(usersQuery);

      const usersById = new Map();
      userSnapshots.forEach(doc => usersById.set(doc.data().uid, doc.data()));

      const populatedReviews = reviews.map(review => {
        const user = usersById.get(review.userId);
        return {
          ...review,
          reviewerName: user?.fullName || 'Anonyme',
          reviewerImage: user?.profilePictureURL,
        };
      });

      setReviewsWithUsers(populatedReviews);
      setReviewsLoading(false);
    };

    if (!rawReviewsLoading) {
      fetchUsers();
    }
  }, [reviews, db, rawReviewsLoading]);

  const averageRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return 0;
    const total = reviews.reduce((acc, review) => acc + review.rating, 0);
    return total / reviews.length;
  }, [reviews]);
  
  const isLoading = rawReviewsLoading || reviewsLoading || isUserLoading;

  return (
    <div className="space-y-8">
        <h2 className="text-2xl font-bold text-white">Avis des étudiants</h2>
        {isLoading ? (
            <Skeleton className="h-48 w-full bg-slate-800" />
        ) : reviewsWithUsers.length > 0 ? (
            <div className="space-y-6">
                <StarRating rating={averageRating} reviewCount={reviews?.length} size="lg" />
                {reviewsWithUsers?.slice(0, 5).map(review => (
                    <div key={review.id} className="flex gap-4 border-t border-slate-700 pt-6">
                        <Avatar>
                            <AvatarImage src={review.reviewerImage} />
                            <AvatarFallback className="bg-slate-700 text-white">{review.reviewerName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-white">{review.reviewerName}</p>
                            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                                <StarRating rating={review.rating} size="sm" />
                                <span>{review.createdAt ? formatDistanceToNow(review.createdAt.toDate(), { locale: fr, addSuffix: true }) : ''}</span>
                            </div>
                            <p className="text-sm text-slate-300">{review.comment}</p>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
             <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center text-slate-400">
                <p>Aucun avis pour ce cours pour le moment.</p>
            </div>
        )}

        {user && !hasReviewed && isEnrolled && (
          <div className="pt-8">
             <h3 className="text-xl font-bold mb-4 text-white">Laissez votre avis</h3>
             <ReviewForm courseId={courseId} userId={user.uid} onReviewSubmit={() => setHasReviewed(true)} />
          </div>
        )}
    </div>
  );
};

export default function CourseDetailsClient() {
  const { courseId: courseIdParam } = useParams();
  const courseId = courseIdParam as string;
  const db = getFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { user, formaAfriqueUser, isUserLoading } = useRole();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [courseStats, setCourseStats] = useState({ totalDuration: 0, lessonCount: 0 });
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<Lecture | null>(null);

  const courseRef = useMemoFirebase(() => courseId ? doc(db, 'courses', courseId) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const instructorRef = useMemoFirebase(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [db, course]);
  const { data: instructor, isLoading: instructorLoading } = useDoc<FormaAfriqueUser>(instructorRef);

  const enrollmentQuery = useMemoFirebase(() => {
    if (!user || !courseId) return null;
    return query(collection(db, 'enrollments'), where('studentId', '==', user.uid), where('courseId', '==', courseId));
  }, [db, user, courseId]);

  const { data: enrollments, isLoading: enrollmentsLoading } = useCollection(enrollmentQuery);
  const isEnrolled = useMemo(() => (enrollments?.length ?? 0) > 0, [enrollments]);
  
  const handlePreviewClick = (lesson: Lecture) => {
    setPreviewLesson(lesson);
    setIsPreviewModalOpen(true);
  }

  const handlePaymentSuccess = async (data: any) => {
    if (!course || !instructor || !user || !formaAfriqueUser) return;
    setIsPaying(true);

    try {
        const result = await verifyMonerooTransaction(data.transaction_id);

        if (result.success) {
            const enrollmentId = `${user.uid}_${courseId}`;
            const enrollmentRef = doc(db, 'enrollments', enrollmentId);

            const enrollmentPayload = {
                enrollmentId,
                studentId: user.uid,
                courseId: courseId,
                instructorId: course.instructorId,
                enrollmentDate: serverTimestamp(),
                progress: 0,
            };
            
            await setDoc(enrollmentRef, enrollmentPayload);

            const paymentPayload = {
              paymentId: data.transaction_id,
              userId: user.uid,
              instructorId: course.instructorId,
              courseId: courseId,
              amount: course.price,
              currency: 'XOF',
              date: serverTimestamp(),
              status: 'Completed',
              monerooData: data,
            };
            await setDoc(doc(db, 'payments', data.transaction_id), paymentPayload);

            if(formaAfriqueUser){
              await sendEnrollmentEmails(formaAfriqueUser, course, instructor);
            }

            router.push(`/payment/success?courseId=${courseId}&transactionId=${data.transaction_id}`);
        } else {
            throw new Error(result.error || 'La vérification du paiement a échoué.');
        }
    } catch (error: any) {
        console.error("Payment processing error:", error);
        toast({
            variant: "destructive",
            title: "Erreur de post-paiement",
            description: error.message || "Une erreur est survenue lors de la finalisation de votre inscription.",
        });
        router.push(`/payment/error?courseId=${courseId}`);
    } finally {
        setIsPaying(false);
    }
  };
  
  const handleCheckout = () => {
    if (typeof window !== 'undefined' && (window as any).Moneroo) {
        (window as any).Moneroo.setup({
            publicKey: process.env.NEXT_PUBLIC_MONEROO_PUBLIC_KEY || '',
            onClose: () => setIsPaying(false),
            onSuccess: handlePaymentSuccess,
        }).open({
            amount: course!.price,
            currency: "XOF",
            description: course!.title,
            customer: {
                email: formaAfriqueUser!.email,
                name: formaAfriqueUser!.fullName,
            },
            metadata: {
                courseId: course!.id,
                userId: user!.uid,
            }
        });
    }
  };

  useEffect(() => {
    if (!courseId || course?.contentType === 'ebook') return;

    const fetchStats = async () => {
        const sectionsQuery = query(collection(db, 'courses', courseId, 'sections'));
        const sectionsSnap = await getDocs(sectionsQuery);
        
        let totalDuration = 0;
        let lessonCount = 0;
        
        for (const sectionDoc of sectionsSnap.docs) {
            const lecturesQuery = query(collection(db, 'courses', courseId, 'sections', sectionDoc.id, 'lectures'));
            const lecturesSnap = await getDocs(lecturesQuery);
            lecturesSnap.forEach(lectureDoc => {
                const lectureData = lectureDoc.data();
                lessonCount++;
                totalDuration += Number(lectureData.duration) || 0;
            });
        }
        
        setCourseStats({ totalDuration, lessonCount });
    };

    fetchStats();
  }, [courseId, db, course?.contentType]);


  const handleFreeEnrollment = async () => {
    if (!user || !course || !course.instructorId || !instructor || !formaAfriqueUser) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Vous devez être connecté et les détails du cours doivent être complets.' });
        if(!user) router.push('/login');
        return;
    }

    setIsEnrolling(true);

    try {
        if(isEnrolled) {
            toast({ title: 'Déjà inscrit', description: 'Vous êtes déjà inscrit à ce cours.' });
            router.push(`/courses/${course.id}`);
            return;
        }

        const enrollmentId = `${user.uid}_${courseId}`;
        const enrollmentRef = doc(db, 'enrollments', enrollmentId);
        
        const enrollmentPayload = {
            enrollmentId: enrollmentId,
            studentId: user.uid,
            courseId: courseId,
            instructorId: course.instructorId,
            enrollmentDate: serverTimestamp(),
            progress: 0,
        };
        
        await setDoc(enrollmentRef, enrollmentPayload);

        toast({ title: 'Inscription réussie!', description: `Vous avez maintenant accès à "${course.title}".` });
        
        await sendEnrollmentEmails(formaAfriqueUser, course, instructor);

        router.push(`/courses/${courseId}?newEnrollment=true`);

    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `enrollments/${user.uid}_${courseId}`,
            operation: 'create',
            requestResourceData: { studentId: user.uid, courseId: courseId, progress: 0, instructorId: course.instructorId },
        }));
        setIsEnrolling(false);
    }
  };

  const handleMainAction = () => {
    if (!user) {
        router.push(`/login?redirect=/course/${courseId}`);
        return;
    }
    if(isEnrolled) {
        router.push(`/courses/${courseId}`);
    } else if (course?.price === 0) {
        handleFreeEnrollment();
    } else if(course && user && formaAfriqueUser) {
        setIsPaying(true);
        handleCheckout();
    }
  };

  const isLoading = courseLoading || instructorLoading || enrollmentsLoading || isUserLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4">
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
                <Skeleton className="h-64 w-full" />
            </div>
            <div className="space-y-4">
                 <Skeleton className="h-96 w-full rounded-3xl" />
            </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto max-w-7xl py-12 text-center">
        <Info className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Cours non trouvé</h1>
        <p className="text-muted-foreground">Le cours que vous cherchez n'existe pas ou a été retiré.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-6">Retour au tableau de bord</Button>
      </div>
    );
  }
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: 'FormaAfrique',
      url: 'https://formaafrique-app.web.app',
    },
    offers: {
      '@type': 'Offer',
      price: course.price,
      priceCurrency: 'XOF',
      category: 'Paid',
    },
  };

  const isFree = course.price === 0;
  const isEbook = course.contentType === 'ebook';

  const getButtonText = () => {
    if(isEnrolled) return isEbook ? "Lire l'E-book" : "Aller au cours";
    if(isFree) return isEbook ? "Obtenir l'E-book Gratuitement" : "S'inscrire Gratuitement";
    return isEbook ? "Acheter l'E-book" : "Acheter maintenant";
  }
  
  const hasValidLearningObjectives = course.learningObjectives && course.learningObjectives.length > 0 && course.learningObjectives[0].length > 2;
  const defaultLearningObjectives = [
    "Maîtriser les fondamentaux du sujet.",
    "Acquérir des compétences pratiques et applicables.",
    "Apprendre à utiliser les outils et technologies clés.",
    "Développer une compréhension approfondie des concepts avancés.",
  ];

  return (
    <>
      <Script src="https://cdn.moneroo.io/checkout/v1/moneroo.js" strategy="afterInteractive" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      <div className="bg-[#020817] text-white">
        {/* --- Header Section (Mobile) --- */}
        <div className="lg:hidden">
           <div className="relative aspect-video w-full bg-black">
             <Image 
                src={course.imageUrl || `https://picsum.photos/seed/${course.id}/800/450`}
                alt={course.title}
                layout="fill"
                objectFit="cover"
                className="opacity-80"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-center justify-center">
                 <Button variant="ghost" className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30" onClick={() => handlePreviewClick({ id: 'preview', title: 'Aperçu', videoUrl: course.previewVideoUrl || ''})}>
                    <PlayCircle className="h-5 w-5 mr-2"/>
                    Afficher un aperçu
                 </Button>
             </div>
           </div>
           <div className="p-4 space-y-3">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <p className="text-slate-300">{course.description}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                {course.isPopular && <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30">Bestseller</Badge>}
                <StarRating rating={4.7} reviewCount={187212} size="sm" />
                <span>{course.participantsCount?.toLocaleString('fr-FR') || '187K'} participants</span>
              </div>
              <p className="text-sm">Créé par <Link href={`/instructor/${instructor?.id}`} className="underline font-semibold">{instructor?.fullName}</Link></p>
               <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                {(course.updatedAt || course.createdAt) && (
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4"/>Dernière M.À.J {format(course.updatedAt?.toDate() || course.createdAt?.toDate() || new Date(), 'MM/yyyy')}</span>
                )}
                {course.language && <span className="flex items-center gap-1.5"><Globe className="h-4 w-4"/>{course.language}</span>}
              </div>
           </div>
        </div>

        <div className="container mx-auto max-w-7xl py-8 px-4 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              <main className="lg:col-span-8 space-y-12">
                 {/* --- Header Section (Desktop) --- */}
                 <div className="hidden lg:block space-y-3">
                    <h1 className="text-4xl font-extrabold tracking-tight">{course.title}</h1>
                    <p className="text-xl text-slate-300">{course.description}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                      {course.isPopular && <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30">Bestseller</Badge>}
                      <StarRating rating={4.7} reviewCount={187212} size="sm" />
                      <span>{course.participantsCount?.toLocaleString('fr-FR') || '187K'} participants</span>
                    </div>
                     <p className="text-sm">Créé par <Link href={`/instructor/${instructor?.id}`} className="underline font-semibold">{instructor?.fullName}</Link></p>
                     <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                         {(course.updatedAt || course.createdAt) && (
                            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4"/>Dernière M.À.J {format(course.updatedAt?.toDate() || course.createdAt?.toDate() || new Date(), 'MM/yyyy')}</span>
                         )}
                        {course.language && <span className="flex items-center gap-1.5"><Globe className="h-4 w-4"/>{course.language}</span>}
                    </div>
                 </div>

                 {/* --- What you'll learn --- */}
                {!isEbook && (
                    <div className="border border-slate-700/80 rounded-lg p-6">
                        <h2 className="text-2xl font-bold text-white mb-4">Ce que vous apprendrez</h2>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-slate-300">
                            {(hasValidLearningObjectives ? course.learningObjectives : defaultLearningObjectives)?.map((obj: string, i: number) => (
                                <li key={i} className="flex items-start"><Check className="w-5 h-5 mr-3 mt-1 text-primary shrink-0" /><span>{obj}</span></li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {/* --- Curriculum --- */}
                <CourseCurriculum courseId={courseId} isEnrolled={isEnrolled} onPreviewClick={handlePreviewClick} />

                {/* --- Instructor --- */}
                {instructor && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-white">À propos de l'instructeur</h2>
                    <Link href={`/instructor/${instructor.id}`} className="block">
                      <h3 className="font-bold text-lg hover:text-primary text-white">{instructor.fullName}</h3>
                      <p className="text-sm text-slate-400 mb-2">{instructor.careerGoals?.currentRole || `Expert en ${course.category}`}</p>
                      <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                              <AvatarImage src={instructor.profilePictureURL} />
                              <AvatarFallback className="text-white bg-slate-700">{instructor.fullName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <p className="text-sm line-clamp-3 text-slate-300">{instructor.bio || `Découvrez le parcours et l'expertise de ${instructor.fullName}, un professionnel passionné qui vous guidera à travers ce cours.`}</p>
                      </div>
                    </Link>
                  </div>
                )}
                
                 {/* --- Reviews --- */}
                <ReviewsSection courseId={courseId} isEnrolled={isEnrolled} />

              </main>

              <aside className="hidden lg:block lg:col-span-4">
                  <div className="sticky top-24 space-y-4">
                    <Card className="shadow-xl rounded-2xl bg-slate-800/50 border border-slate-700/80">
                         <div className="relative group aspect-video w-full bg-black rounded-t-2xl overflow-hidden">
                           <Image 
                                src={course.imageUrl || `https://picsum.photos/seed/${course.id}/800/450`}
                                alt={course.title}
                                layout="fill"
                                objectFit="cover"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <Button variant="ghost" className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30" onClick={() => handlePreviewClick({ id: 'preview', title: 'Aperçu', videoUrl: course.previewVideoUrl || ''})}>
                                  <PlayCircle className="h-5 w-5 mr-2"/>
                                  Afficher un aperçu
                               </Button>
                            </div>
                        </div>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-3xl font-bold text-white">
                                    {isFree ? 'Gratuit' : `${course.price.toLocaleString('fr-FR')} XOF`}
                                </h2>
                                {course.originalPrice && (
                                    <span className="text-base line-through text-slate-400">
                                        {course.originalPrice.toLocaleString('fr-FR')} XOF
                                    </span>
                                )}
                            </div>
                            
                            <Button className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" onClick={handleMainAction} disabled={isEnrolling || isPaying}>
                                {isEnrolling || isPaying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : isEnrolled ? <BookOpen className="mr-2 h-5 w-5" /> : <CreditCard className="mr-2 h-5 w-5" />}
                                {isPaying ? 'Chargement...' : isEnrolling ? 'Inscription...' : getButtonText()}
                            </Button>
                            
                             <div className="flex gap-2">
                                <Button variant="outline" className="w-full h-11 bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white">
                                    <ShoppingCart className="h-4 w-4 mr-2" /> Ajouter au panier
                                </Button>
                                <Button variant="outline" className="w-full h-11 bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white">
                                    <Heart className="h-4 w-4 mr-2" /> Liste de souhaits
                                </Button>
                             </div>

                             <div className="space-y-2 pt-3">
                                <h3 className="font-semibold text-white">Ce cours inclut :</h3>
                                <ul className="space-y-1.5 text-sm text-slate-300">
                                    {isEbook ? (
                                        <>
                                            <li className="flex items-center gap-2"><Book className="h-4 w-4 text-primary" /> Format PDF</li>
                                            <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Accès immédiat après achat</li>
                                        </>
                                    ) : (
                                        <>
                                            <li className="flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> {(courseStats.totalDuration / 60).toFixed(1)}h de vidéo</li>
                                            <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> {courseStats.lessonCount} leçons</li>
                                            <li className="flex items-center gap-2"><Tv className="h-4 w-4 text-primary" /> Accès sur mobile et TV</li>
                                            <li className="flex items-center gap-2"><Gift className="h-4 w-4 text-primary" /> Accès complet à vie</li>
                                            <li className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Certificat de réussite</li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                  </div>
              </aside>
          </div>
        </div>
      </div>

       {/* --- Mobile Sticky Footer --- */}
       <div className="sticky bottom-0 left-0 right-0 lg:hidden bg-slate-900/80 backdrop-blur-sm p-3 border-t border-slate-700 z-50 space-y-2">
           <div className="flex items-baseline gap-2 justify-center">
                 <h3 className="text-2xl font-bold text-white">
                    {isFree ? 'Gratuit' : `${course.price.toLocaleString('fr-FR')} XOF`}
                 </h3>
                 {course.originalPrice && (
                    <span className="text-base line-through text-slate-400">
                        {course.originalPrice.toLocaleString('fr-FR')} XOF
                    </span>
                )}
            </div>
           <Button className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" onClick={handleMainAction} disabled={isEnrolling || isPaying}>
              {isEnrolling || isPaying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : isEnrolled ? <BookOpen className="mr-2 h-5 w-5" /> : <CreditCard className="mr-2 h-5 w-5" />}
              {isPaying ? 'Chargement...' : isEnrolling ? 'Inscription...' : getButtonText()}
            </Button>
      </div>

      {/* --- Video Preview Modal --- */}
       <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-3xl lg:max-w-4xl xl:max-w-5xl p-0 border-0 bg-black">
          <DialogHeader className="p-4 sr-only">
            <DialogTitle>{previewLesson?.title}</DialogTitle>
          </DialogHeader>
          <ReactPlayer url={previewLesson?.videoUrl || ''} width="100%" height="100%" controls playing={true} config={{ youtube: { playerVars: { origin: typeof window !== 'undefined' ? window.location.origin : '' } } }} />
        </DialogContent>
      </Dialog>
    </>
  );
}
