'use client';

/**
 * @fileOverview Vitrine publique d'une formation Ndara Afrique V2.
 * ✅ DESIGN QWEN : Immersion Android-First, Header dégradé, Barre de confiance.
 * ✅ ACTIONS : Inscription redirigeant vers checkout ou lecteur avec préfixe locale.
 */

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
    doc, 
    getFirestore, 
    collection, 
    query, 
    getDocs, 
    orderBy, 
    getCountFromServer, 
    limit, 
    where, 
    onSnapshot,
    setDoc,
    deleteDoc,
    serverTimestamp
} from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useRole } from '@/context/RoleContext';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  PlayCircle, 
  ShieldCheck, 
  Star, 
  Users, 
  ArrowLeft, 
  Loader2, 
  ChevronRight,
  Award,
  Lock,
  RotateCcw,
  MessageSquareQuote,
  Heart,
  Clock,
  Shield,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { 
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Course, Section, Lecture, NdaraUser, Enrollment, Review } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EnrichedReview extends Review {
    userName?: string;
    userAvatar?: string;
}

function CourseDetailContent({ courseId, locale }: { courseId: string; locale: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isUserLoading } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [sections, setSections] = useState<Section[]>([]);
  const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
  const [reviews, setReviews] = useState<EnrichedReview[]>([]);
  const [stats, setStats] = useState({ rating: 4.8, reviewCount: 0, studentCount: 0 });
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor } = useDoc<NdaraUser>(instructorRef);

  const enrollmentRef = useMemo(() => (user && courseId) ? doc(db, 'enrollments', `${user.uid}_${courseId}`) : null, [user, courseId, db]);
  const { data: enrollment } = useDoc<Enrollment>(enrollmentRef);

  useEffect(() => {
    if (!user?.uid || !courseId) return;
    const wishId = `${user.uid}_${courseId}`;
    const unsub = onSnapshot(doc(db, 'user_wishlist', wishId), (snap) => {
        setIsWishlisted(snap.exists());
    });
    return () => unsub();
  }, [user?.uid, courseId, db]);

  useEffect(() => {
    if (!courseId) return;

    const fetchData = async () => {
        setIsDataLoading(true);
        try {
            const sectionsSnap = await getDocs(query(collection(db, 'courses', courseId, 'sections'), orderBy('order')));
            const sectionsData = sectionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Section));
            setSections(sectionsData);

            const lMap = new Map();
            for (const section of sectionsData) {
                const lecturesSnap = await getDocs(query(collection(db, 'courses', courseId, 'sections', section.id, 'lectures'), orderBy('order')));
                lMap.set(section.id, lecturesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lecture)));
            }
            setLecturesMap(lMap);

            const reviewsQuery = query(collection(db, 'course_reviews'), where('courseId', '==', courseId), orderBy('createdAt', 'desc'), limit(10));
            const reviewsSnap = await getDocs(reviewsQuery);
            const rawReviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

            if (rawReviews.length > 0) {
                const studentIds = [...new Set(rawReviews.map(r => r.studentId))];
                const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', studentIds.slice(0, 30))));
                const uMap = new Map();
                usersSnap.forEach(d => uMap.set(d.id, d.data()));

                setReviews(rawReviews.map(r => ({
                    ...r,
                    userName: uMap.get(r.studentId)?.fullName || 'Étudiant Ndara',
                    userAvatar: uMap.get(r.studentId)?.profilePictureURL
                })));
            }

            const qEnrolled = query(collection(db, 'enrollments'), where('courseId', '==', courseId));
            const snapEnrolled = await getCountFromServer(qEnrolled);
            
            setStats({
                rating: course?.rating || 4.8,
                reviewCount: rawReviews.length,
                studentCount: snapEnrolled.data().count
            });

        } catch (e) {
            console.warn("Could not fetch curriculum or reviews", e);
        } finally {
            setIsDataLoading(false);
        }
    };

    if (course) fetchData();
  }, [courseId, db, course]);

  const toggleWishlist = async () => {
    if (!user) {
        router.push(`/${locale}/login?tab=register&redirect=${encodeURIComponent(pathname)}`);
        return;
    }
    const wishId = `${user.uid}_${courseId}`;
    const wishlistRef = doc(db, 'user_wishlist', wishId);
    try {
        if (isWishlisted) {
            await deleteDoc(wishlistRef);
            toast({ title: "Retiré des favoris" });
        } else {
            await setDoc(wishlistRef, {
                userId: user.uid,
                courseId: courseId,
                createdAt: serverTimestamp()
            });
            toast({ title: "Ajouté aux favoris !" });
        }
    } catch (e) {
        toast({ variant: 'destructive', title: "Erreur favoris" });
    }
  };

  const handleStartLearning = () => {
    if (!user) {
      router.push(`/${locale}/login?tab=register&redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (enrollment) {
      router.push(`/${locale}/courses/${courseId}`);
    } else {
      router.push(`/${locale}/student/checkout/${courseId}`);
    }
  };

  if (courseLoading || isUserLoading) return <PublicCourseSkeleton />;
  if (!course) return <div className="p-20 text-center text-slate-500">Formation non trouvée.</div>;

  const isEnrolled = !!enrollment;

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      {/* --- IMMERSIVE HEADER --- */}
      <header className="relative h-64 flex-shrink-0">
        <div className="absolute inset-0">
            <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        </div>

        {/* Floating Controls */}
        <button 
            onClick={() => router.back()} 
            className="absolute top-12 left-4 w-12 h-12 bg-slate-900/80 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition z-30"
        >
            <ArrowLeft className="h-5 w-5" />
        </button>

        <button 
            onClick={toggleWishlist}
            className={cn(
                "absolute top-12 right-4 w-12 h-12 bg-slate-900/80 backdrop-blur-md rounded-full flex items-center justify-center transition z-30",
                isWishlisted ? "text-red-500" : "text-white"
            )}
        >
            <Heart className={cn("h-5 w-5", isWishlisted && "fill-current")} />
        </button>

        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="w-16 h-16 bg-primary/90 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                <PlayCircle className="h-8 w-8 ml-1" />
            </div>
        </div>
      </header>

      <main className="px-4 -mt-8 relative z-10 max-w-2xl mx-auto space-y-10">
        {/* --- INFO CARD --- */}
        <div className="bg-slate-950 rounded-t-[2rem] pt-6 space-y-4">
            <Badge className="bg-primary/20 text-primary border border-primary/30 font-black uppercase text-[9px] tracking-widest px-3 py-1.5 rounded-full">
                {course.category}
            </Badge>
            
            <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
                {course.title}
            </h1>

            <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                <div className="flex items-center gap-1.5 text-yellow-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-white text-sm font-black">{stats.rating.toFixed(1)}</span>
                    <span className="opacity-50 font-medium">({stats.reviewCount} avis)</span>
                </div>
                <span className="opacity-20">•</span>
                <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-white">{stats.studentCount || 100} élèves</span>
                </div>
            </div>
        </div>

        {/* --- TRUST BAR --- */}
        <section className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl text-center space-y-3 shadow-xl">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto text-green-400">
                    <Lock className="h-5 w-5" />
                </div>
                <p className="text-[8px] font-black uppercase text-slate-500 leading-tight">Paiement Sécurisé</p>
            </div>
            <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl text-center space-y-3 shadow-xl">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto text-blue-400">
                    <Shield className="h-5 w-5" />
                </div>
                <p className="text-[8px] font-black uppercase text-slate-500 leading-tight">Garantie 7 Jours</p>
            </div>
            <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl text-center space-y-3 shadow-xl">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                    <Award className="h-5 w-5" />
                </div>
                <p className="text-[8px] font-black uppercase text-slate-500 leading-tight">Certifié Ndara</p>
            </div>
        </section>

        {/* --- INSTRUCTOR --- */}
        {instructor && (
            <Link href={`/${locale}/instructor/${instructor.uid}`} className="flex items-center gap-4 p-4 bg-slate-900 border border-white/5 rounded-[2rem] active:scale-95 transition-all group shadow-xl">
                <Avatar className="h-14 w-14 border-2 border-primary/30">
                    <AvatarImage src={instructor.profilePictureURL} className="object-cover" />
                    <AvatarFallback className="bg-slate-800 text-slate-500 font-bold">{instructor.fullName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Expert Formateur</p>
                    <h3 className="text-base font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">{instructor.fullName}</h3>
                    <p className="text-[10px] text-slate-400 font-medium italic">{instructor.careerGoals?.currentRole || 'Expert Ndara'}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-700 group-hover:text-primary transition-colors" />
            </Link>
        )}

        {/* --- DESCRIPTION --- */}
        <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                <Info className="h-5 w-5 text-primary" />
                DESCRIPTION
            </h2>
            <div className="prose prose-invert prose-sm max-w-none text-slate-400 leading-relaxed font-medium">
                <p>{course.description}</p>
            </div>
        </section>

        {/* --- PROGRAMME --- */}
        <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                <PlayCircle className="h-5 w-5 text-primary" />
                PROGRAMME
            </h2>
            <Accordion type="single" collapsible className="space-y-3">
                {sections.map((section, idx) => (
                    <AccordionItem key={section.id} value={section.id} className="bg-slate-900 border border-white/5 rounded-[1.5rem] overflow-hidden">
                        <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-white/5">
                            <div className="flex items-center gap-4">
                                <span className="text-2xl font-black text-primary opacity-30 font-mono">
                                    {String(idx + 1).padStart(2, '0')}
                                </span>
                                <div className="text-left">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-tight">{section.title}</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                        {(lecturesMap.get(section.id) || []).length} leçons
                                    </p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-4 space-y-2 bg-slate-950/50">
                            {(lecturesMap.get(section.id) || []).map(lecture => (
                                <div key={lecture.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {lecture.isFreePreview ? <PlayCircle size={14} className="text-emerald-500" /> : <Lock size={14} className="text-slate-700" />}
                                        <span className="text-xs font-medium text-slate-400 truncate">{lecture.title}</span>
                                    </div>
                                    {lecture.duration && <span className="text-[10px] text-slate-600 font-black">{lecture.duration}m</span>}
                                </div>
                            ))}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </section>

        {/* --- REVIEWS --- */}
        <section className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <Star className="h-5 w-5 text-primary" />
                    AVIS ÉTUDIANTS
                </h2>
                <Badge variant="outline" className="text-slate-500 border-slate-800 uppercase font-black text-[9px]">{stats.reviewCount} retours</Badge>
            </div>

            {reviews.length > 0 ? (
                <div className="space-y-4">
                    {reviews.map(review => (
                        <div key={review.id} className="bg-slate-900/50 border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-white/5">
                                    <AvatarImage src={review.userAvatar} />
                                    <AvatarFallback className="bg-slate-800 text-[10px] font-black">{review.userName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-white">{review.userName}</h4>
                                    <div className="flex items-center gap-0.5 text-yellow-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={10} className={cn("fill-current", i >= review.rating && "text-slate-800 fill-none")} />
                                        ))}
                                    </div>
                                </div>
                                <span className="text-[9px] font-black text-slate-600 uppercase">
                                    {review.createdAt ? format((review.createdAt as any).toDate(), 'dd MMM', { locale: fr }) : '---'}
                                </span>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed italic">"{review.comment}"</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center bg-slate-900/20 rounded-[2rem] border-2 border-dashed border-slate-800 opacity-20">
                    <p className="text-xs font-black uppercase tracking-widest">Aucun avis pour le moment</p>
                </div>
            )}
        </section>
      </main>

      {/* --- FIXED ACTION BAR --- */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 z-50 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Accès Permanent</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-primary">
                        {course.price === 0 ? "OFFERT" : `${course.price.toLocaleString('fr-FR')}`}
                    </span>
                    {course.price !== 0 && <span className="text-[10px] font-black text-primary uppercase">XOF</span>}
                    {course.originalPrice && (
                        <span className="text-xs text-slate-600 line-through font-bold">
                            {course.originalPrice.toLocaleString('fr-FR')}
                        </span>
                    )}
                </div>
            </div>
            <Button 
                onClick={handleStartLearning} 
                className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
            >
                {isEnrolled ? "REPRENDRE" : "S'INSCRIRE MAINTENANT"}
                <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </footer>
    </div>
  );
}

function PublicCourseSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 space-y-8">
      <Skeleton className="w-full h-64 rounded-none" />
      <div className="px-4 space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-12 w-3/4 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-3xl" />
            <Skeleton className="h-20 rounded-3xl" />
            <Skeleton className="h-20 rounded-3xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-[2rem]" />
      </div>
    </div>
  );
}

export default function PublicCourseDetail({ courseId, locale }: { courseId: string; locale: string }) {
  return (
    <Suspense fallback={<PublicCourseSkeleton />}>
      <CourseDetailContent courseId={courseId} locale={locale} />
    </Suspense>
  );
}
