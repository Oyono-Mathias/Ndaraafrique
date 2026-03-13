'use client';

/**
 * @fileOverview Vitrine publique d'une formation Ndara Afrique V2.
 * ✅ DESIGN QWEN : Immersion Android-First, Header dégradé, Barre de confiance.
 * ✅ ACTIONS : Inscription redirigeant vers checkout ou lecteur avec préfixe locale.
 * ✅ DYNAMIQUE : Suppression des valeurs simulées (avis, participants).
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
  Heart,
  CheckCircle2,
  Info,
  Shield
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const [stats, setStats] = useState({ rating: 0, reviewCount: 0, studentCount: 0 });
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

            // ✅ RÉCUPÉRATION RÉELLE DES AVIS
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

            // ✅ COMPTAGE RÉEL DES INSCRITS
            const qEnrolled = query(collection(db, 'enrollments'), where('courseId', '==', courseId));
            const snapEnrolled = await getCountFromServer(qEnrolled);
            
            setStats({
                rating: course?.rating || 0,
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
    <div className="min-h-screen bg-slate-950 pb-32 relative font-sans">
      <div className="grain-overlay" />
      
      {/* --- IMMERSIVE HEADER --- */}
      <header className="relative h-72 flex-shrink-0">
        <div className="absolute inset-0">
            <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        </div>

        {/* Floating Controls */}
        <div className="absolute top-12 left-4 right-4 flex justify-between z-30">
            <button 
                onClick={() => router.back()} 
                className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition"
            >
                <ArrowLeft className="h-5 w-5" />
            </button>

            <button 
                onClick={toggleWishlist}
                className={cn(
                    "w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition active:scale-90",
                    isWishlisted ? "text-red-500" : "text-white"
                )}
            >
                <Heart className={cn("h-5 w-5", isWishlisted && "fill-current")} />
            </button>
        </div>

        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="w-20 h-20 bg-primary/90 rounded-full flex items-center justify-center text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-in zoom-in duration-700">
                <PlayCircle className="h-10 w-10 ml-1" />
            </div>
        </div>
      </header>

      <main className="px-6 -mt-10 relative z-10 max-w-2xl mx-auto space-y-12">
        {/* --- INFO CARD --- */}
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary border border-primary/30 font-black uppercase text-[10px] tracking-widest px-3 py-1 rounded-full">
                    {course.category}
                </Badge>
                {course.price === 0 && <Badge className="bg-emerald-500 text-slate-950 font-black uppercase text-[10px] tracking-widest px-3 py-1 rounded-full border-none">Offert</Badge>}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight uppercase tracking-tight">
                {course.title}
            </h1>

            <div className="flex items-center gap-6 text-xs font-bold text-slate-400">
                <div className="flex items-center gap-1.5 text-yellow-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-white text-base font-black">{stats.rating > 0 ? stats.rating.toFixed(1) : '---'}</span>
                    <span className="opacity-50 font-medium">({stats.reviewCount} avis)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-white">{stats.studentCount} Ndara</span>
                </div>
            </div>
        </div>

        {/* --- TRUST BAR --- */}
        <section className="grid grid-cols-3 gap-3">
            <TrustItem icon={Lock} label="Paiement" sub="100% Sécurisé" />
            <TrustItem icon={Shield} label="Garantie" sub="Satisfaction" />
            <TrustItem icon={Award} label="Certification" sub="Reconnue" />
        </section>

        {/* --- INSTRUCTOR --- */}
        {instructor && (
            <Link href={`/${locale}/instructor/${instructor.uid}`} className="flex items-center gap-4 p-5 bg-slate-900 border border-white/5 rounded-[2.5rem] active:scale-[0.98] transition-all group shadow-2xl">
                <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-primary/30 shadow-xl">
                        <AvatarImage src={instructor.profilePictureURL} className="object-cover" />
                        <AvatarFallback className="bg-slate-800 text-slate-500 font-black">{instructor.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 p-1 rounded-full border-2 border-slate-900">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-0.5">Expert Formateur</p>
                    <h3 className="text-lg font-black text-white group-hover:text-primary transition-colors truncate">{instructor.fullName}</h3>
                    <p className="text-[10px] text-slate-500 font-medium italic">{instructor.careerGoals?.currentRole || 'Pionnier Ndara'}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-700 group-hover:text-primary transition-colors mr-2" />
            </Link>
        )}

        {/* --- DESCRIPTION --- */}
        <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                <div className="h-6 w-1.5 bg-primary rounded-full" />
                À PROPOS
            </h2>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed font-medium italic">
                {course.description}
            </p>
        </section>

        {/* --- PROGRAMME --- */}
        <section className="space-y-6">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                <div className="h-6 w-1.5 bg-primary rounded-full" />
                PROGRAMME
            </h2>
            <Accordion type="single" collapsible className="space-y-3">
                {sections.map((section, idx) => (
                    <AccordionItem key={section.id} value={section.id} className="bg-slate-900 border border-white/5 rounded-[2rem] overflow-hidden">
                        <AccordionTrigger className="px-6 py-5 hover:no-underline hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-4">
                                <span className="text-2xl font-black text-primary/30 font-mono">
                                    {String(idx + 1).padStart(2, '0')}
                                </span>
                                <div className="text-left">
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{section.title}</h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                        {(lecturesMap.get(section.id) || []).length} chapitres
                                    </p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4 space-y-1 bg-black/20">
                            {(lecturesMap.get(section.id) || []).map(lecture => (
                                <div key={lecture.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 opacity-60">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <PlayCircle size={14} className="text-slate-600" />
                                        <span className="text-[13px] font-medium text-slate-400 truncate">{lecture.title}</span>
                                    </div>
                                    {lecture.duration && <span className="text-[10px] text-slate-700 font-black font-mono">{lecture.duration}m</span>}
                                </div>
                            ))}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </section>

        {/* --- AVIS --- */}
        <section className="space-y-6">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                <div className="h-6 w-1.5 bg-primary rounded-full" />
                CE QU'ILS EN DISENT
            </h2>
            {reviews.length > 0 ? (
                <div className="space-y-4">
                    {reviews.map(review => (
                        <div key={review.id} className="bg-slate-900/50 border border-white/5 rounded-[2rem] p-6 space-y-4 shadow-xl">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-white/10 shadow-lg">
                                    <AvatarImage src={review.userAvatar} />
                                    <AvatarFallback className="bg-slate-800 text-[10px] font-black">{review.userName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-white uppercase">{review.userName}</h4>
                                    <div className="flex items-center gap-0.5 text-yellow-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={10} className={cn("fill-current", i >= review.rating && "text-slate-800 fill-none")} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed italic">"{review.comment}"</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center bg-slate-900/20 rounded-[2rem] border-2 border-dashed border-slate-800 opacity-20">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Prêt à être le premier Ndara certifié ?</p>
                </div>
            )}
        </section>
      </main>

      {/* --- FLOATING ACTION BAR --- */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 z-50 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-6">
            <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Accès Permanent</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-primary">
                        {course.price === 0 ? "OFFERT" : `${course.price.toLocaleString('fr-FR')}`}
                    </span>
                    {course.price !== 0 && <span className="text-[10px] font-black text-primary uppercase">XOF</span>}
                </div>
            </div>
            <Button 
                onClick={handleStartLearning} 
                className="flex-1 h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-[0.15em] shadow-2xl shadow-primary/20 transition-all active:scale-95 group"
            >
                {isEnrolled ? "REPRENDRE" : "S'INSCRIRE MAINTENANT"}
                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
        </div>
      </footer>
    </div>
  );
}

function TrustItem({ icon: Icon, label, sub }: { icon: any, label: string, sub: string }) {
    return (
        <div className="bg-slate-900 border border-white/5 p-4 rounded-[2rem] text-center space-y-3 shadow-xl">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-[8px] font-black uppercase text-slate-600 tracking-tighter leading-none">{label}</p>
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">{sub}</p>
            </div>
        </div>
    );
}

function PublicCourseSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 space-y-8">
      <Skeleton className="w-full h-72 rounded-none" />
      <div className="px-6 space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-12 w-3/4 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24 rounded-[2rem] bg-slate-900" />
            <Skeleton className="h-24 rounded-[2rem] bg-slate-900" />
            <Skeleton className="h-24 rounded-[2rem] bg-slate-900" />
        </div>
        <Skeleton className="h-64 w-full rounded-[2.5rem]" />
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