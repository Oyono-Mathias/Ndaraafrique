'use client';

/**
 * @fileOverview Vitrine publique d'une formation Ndara Afrique.
 * ✅ RÉSOLU : Affichage dynamique des avis depuis 'course_reviews'.
 */

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getFirestore, collection, query, getDocs, orderBy, getCountFromServer, limit, where, onSnapshot } from 'firebase/firestore';
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
  Share2,
  Award,
  Lock,
  RotateCcw,
  Facebook,
  Linkedin,
  Link as LinkIcon,
  MessageSquare,
  MessageSquareQuote
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Course, Section, Lecture, NdaraUser, Enrollment, Review } from '@/lib/types';
import { cn } from '@/lib/utils';
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

  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor } = useDoc<NdaraUser>(instructorRef);

  const enrollmentRef = useMemo(() => (user && courseId) ? doc(db, 'enrollments', `${user.uid}_${courseId}`) : null, [user, courseId, db]);
  const { data: enrollment } = useDoc<Enrollment>(enrollmentRef);

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

            // Charger les avis réels depuis 'course_reviews'
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

  const handleStartLearning = () => {
    if (!user) {
      router.push(`/${locale}/login?tab=register&redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (enrollment) {
      router.push(`/${locale}/student/courses/${courseId}`);
    } else {
      router.push(`/${locale}/student/checkout/${courseId}`);
    }
  };

  const handleSocialShare = (platform: 'wa' | 'fb' | 'in' | 'copy') => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `Découvrez cette formation sur Ndara Afrique : ${course?.title} 🚀`;
    switch (platform) {
      case 'wa': window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank'); break;
      case 'fb': window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank'); break;
      case 'in': window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank'); break;
      case 'copy':
        navigator.clipboard.writeText(url);
        toast({ title: "Lien copié !" });
        break;
    }
  };

  if (courseLoading || isUserLoading) return <PublicCourseSkeleton />;
  if (!course) return <div className="p-20 text-center text-slate-500">Formation non trouvée.</div>;

  const isEnrolled = !!enrollment;

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden shadow-2xl">
        <Button variant="ghost" size="icon" className="absolute top-4 left-4 z-30 bg-black/40 backdrop-blur-md rounded-full text-white" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Image src={course?.imageUrl || ''} alt={course?.title} fill className="object-cover opacity-60" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-12 max-w-2xl mx-auto">
        <div className="space-y-4">
          <Badge className="bg-primary text-primary-foreground border-none font-black uppercase text-[10px] tracking-[0.1em] px-3 py-1 rounded-md">
              {course?.category}
          </Badge>
          <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">{course?.title}</h1>
          <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-400">
            <div className="flex items-center gap-1.5">
              <Star className={cn("h-4 w-4", stats.rating > 0 ? "text-yellow-500 fill-yellow-500" : "text-slate-700")} />
              <span className="text-white text-sm">{stats.rating.toFixed(1)}</span>
              <span className="opacity-50">({stats.reviewCount} avis)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-white">{stats.studentCount || 100}+ inscrits</span>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center text-center p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <p className="text-[8px] font-black uppercase text-slate-300">Paiement Sécurisé</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2">
            <RotateCcw className="h-5 w-5 text-blue-400" />
            <p className="text-[8px] font-black uppercase text-slate-300">Garantie 7j</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2">
            <Award className="h-5 w-5 text-amber-500" />
            <p className="text-[8px] font-black uppercase text-slate-300">Certifié Ndara</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <div className="h-6 w-1.5 bg-primary rounded-full" />
            Programme
          </h2>
          <div className="space-y-3">
            {sections.map((section, idx) => (
                <div key={section.id} className="bg-slate-900/40 border border-slate-800/50 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-slate-800/30 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-200">
                            <span className="text-primary opacity-60 mr-2 font-mono">{String(idx + 1).padStart(2, '0')}</span> 
                            {section.title}
                        </h3>
                    </div>
                    <ul className="divide-y divide-white/5">
                        {(lecturesMap.get(section.id) || []).map(lecture => (
                            <li key={lecture.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {lecture.isFreePreview ? <PlayCircle className="h-4 w-4 text-emerald-500" /> : <Lock className="h-4 w-4 text-slate-700" />}
                                    <span className="text-xs font-medium text-slate-400">{lecture.title}</span>
                                </div>
                                {lecture.duration && <span className="text-[10px] text-slate-600 font-bold">{lecture.duration}m</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
          </div>
        </section>

        <section className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <div className="h-6 w-1.5 bg-primary rounded-full" />
                    Ce qu'en disent les Ndara
                </h2>
                <Badge variant="outline" className="text-slate-500 border-slate-800">{stats.reviewCount} avis</Badge>
            </div>

            {reviews.length > 0 ? (
                <div className="grid gap-4">
                    {reviews.map(review => (
                        <Card key={review.id} className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl hover:border-primary/30 transition-all duration-500 group">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border border-white/5">
                                            <AvatarImage src={review.userAvatar} />
                                            <AvatarFallback className="bg-slate-800 text-[10px] font-bold text-slate-500">{review.userName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-bold text-white leading-none">{review.userName}</p>
                                            <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-1">Étudiant Vérifié</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 bg-slate-950/50 px-2 py-1 rounded-lg">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={10} className={cn(i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-slate-800")} />
                                        ))}
                                    </div>
                                </div>
                                <div className="relative">
                                    <MessageSquareQuote className="absolute -left-2 -top-2 h-8 w-8 text-white/5 group-hover:text-primary/10 transition-colors" />
                                    <p className="text-sm text-slate-400 italic leading-relaxed pl-4">
                                        "{review.comment}"
                                    </p>
                                </div>
                                <p className="text-[9px] text-slate-600 font-bold uppercase text-right">
                                    Le {(review.createdAt as any)?.toDate ? format((review.createdAt as any).toDate(), 'dd MMM yyyy', { locale: fr }) : 'récemment'}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[2rem] opacity-30">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                    <p className="text-sm font-black uppercase tracking-widest">Aucun avis pour le moment</p>
                </div>
            )}
        </section>

        <section className="space-y-4 pb-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Partager cette formation</h2>
          <div className="grid grid-cols-4 gap-3">
            <Button variant="outline" className="h-14 rounded-2xl bg-emerald-500/10 border-emerald-500/20 text-emerald-500" onClick={() => handleSocialShare('wa')}><MessageSquare className="h-6 w-6" /></Button>
            <Button variant="outline" className="h-14 rounded-2xl bg-blue-600/10 border-blue-600/20 text-blue-400" onClick={() => handleSocialShare('fb')}><Facebook className="h-6 w-6" /></Button>
            <Button variant="outline" className="h-14 rounded-2xl bg-blue-700/10 border-blue-700/20 text-blue-500" onClick={() => handleSocialShare('in')}><Linkedin className="h-6 w-6" /></Button>
            <Button variant="outline" className="h-14 rounded-2xl bg-slate-800 border-slate-700 text-slate-400" onClick={() => handleSocialShare('copy')}><LinkIcon className="h-6 w-6" /></Button>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 z-50 safe-area-pb">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Accès Permanent</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">{course.price === 0 ? "OFFERT" : (course.price || 0).toLocaleString('fr-FR')}</span>
              {course.price !== 0 && <span className="text-[10px] font-black text-primary">XOF</span>}
            </div>
          </div>
          <Button onClick={handleStartLearning} className={cn("flex-1 h-14 rounded-xl text-sm font-black uppercase tracking-wider shadow-xl", isEnrolled ? "bg-white text-slate-950" : "bg-primary text-primary-foreground")}>
            {isEnrolled ? "Reprendre" : "S'inscrire"} <ChevronRight className="ml-2 h-4 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PublicCourseSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 space-y-8 pb-32">
      <Skeleton className="w-full aspect-video bg-slate-900 rounded-none" />
      <div className="px-4 space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-12 w-3/4 bg-slate-900 rounded-xl" />
        <Skeleton className="h-20 w-full bg-slate-900 rounded-2xl" />
        <Skeleton className="h-64 w-full bg-slate-900 rounded-2xl" />
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
