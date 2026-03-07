'use client';

/**
 * @fileOverview Page de présentation détaillée d'un cours.
 * ✅ SÉCURITÉ : Bloque l'accès si le profil n'est pas complété.
 * ✅ TEMPS RÉEL : Score d'avis et liste des avis réels connectés à Firestore.
 * ✅ FIX : Importation Card pour build Vercel.
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getFirestore, collection, query, getDocs, orderBy, setDoc, serverTimestamp, onSnapshot, where } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useRole } from '@/context/RoleContext';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  Book, 
  ShieldCheck, 
  ChevronRight, 
  Star, 
  Users, 
  PlayCircle,
  ArrowLeft,
  Lock,
  Loader2,
  UserCircle2,
  Camera,
  MessageSquare
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card'; // Importation critique rétablie
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Course, Section, Lecture, NdaraUser, Enrollment, Review } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EnrichedReview extends Review {
    userName?: string;
    userAvatar?: string;
}

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const router = useRouter();
  const { user, currentUser, isUserLoading } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [isEnrolling, setIsEnrolling] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(true);
  
  const [stats, setStats] = useState({ rating: 0, reviewCount: 0, studentCount: 0 });
  const [reviewsList, setReviewsList] = useState<EnrichedReview[]>([]);

  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId as string) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor, isLoading: instructorLoading } = useDoc<NdaraUser>(instructorRef);

  const enrollmentRef = useMemo(() => (user && courseId) ? doc(db, 'enrollments', `${user.uid}_${courseId}`) : null, [user, courseId, db]);
  const { data: enrollment, isLoading: enrollmentLoading } = useDoc<Enrollment>(enrollmentRef);

  useEffect(() => {
    if (!courseId) return;

    // Écoute des avis réels
    const qReviews = query(collection(db, 'reviews'), where('courseId', '==', courseId));
    const unsubReviews = onSnapshot(qReviews, async (snap) => {
        const reviewsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
        const count = reviewsData.length;
        const avg = count > 0 ? reviewsData.reduce((acc, curr) => acc + (curr.rating || 0), 0) / count : 0;
        setStats(prev => ({ ...prev, rating: avg, reviewCount: count }));

        if (count > 0) {
            const userIds = [...new Set(reviewsData.map(r => r.userId))];
            const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', userIds.slice(0, 30))));
            const uMap = new Map();
            usersSnap.forEach(d => uMap.set(d.id, d.data()));
            
            const enriched = reviewsData.map(r => ({
                ...r,
                userName: uMap.get(r.userId)?.fullName || 'Étudiant Ndara',
                userAvatar: uMap.get(r.userId)?.profilePictureURL
            })).sort((a, b) => {
                const dateA = (a.createdAt as any)?.toDate?.().getTime() || 0;
                const dateB = (b.createdAt as any)?.toDate?.().getTime() || 0;
                return dateB - dateA;
            });
            
            setReviewsList(enriched);
        } else {
            setReviewsList([]);
        }
    });

    const qEnrolls = query(collection(db, 'enrollments'), where('courseId', '==', courseId));
    const unsubEnrolls = onSnapshot(qEnrolls, (snap) => {
        setStats(prev => ({ ...prev, studentCount: snap.size }));
    });

    return () => { unsubReviews(); unsubEnrolls(); };
  }, [courseId, db]);

  useEffect(() => {
    if (!courseId) return;
    const fetchCurriculum = async () => {
      setIsLoadingCurriculum(true);
      try {
        const sectionsQuery = query(collection(db, 'courses', courseId as string, 'sections'), orderBy('order'));
        const sectionsSnap = await getDocs(sectionsQuery);
        const fetchedSections = sectionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Section));
        setSections(fetchedSections);

        const lMap = new Map<string, Lecture[]>();
        for (const section of fetchedSections) {
          const lQuery = query(collection(db, 'courses', courseId as string, 'sections', section.id, 'lectures'), orderBy('order'));
          const lSnap = await getDocs(lQuery);
          lMap.set(section.id, lSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lecture)));
        }
        setLecturesMap(lMap);
      } catch (e) {
        console.error("Error fetching curriculum:", e);
      } finally {
        setIsLoadingCurriculum(false);
      }
    };
    fetchCurriculum();
  }, [courseId, db]);

  const isLoading = courseLoading || instructorLoading || enrollmentLoading || isUserLoading || isLoadingCurriculum;

  // LOGIQUE DE BLOCAGE PROFIL INCOMPLET
  const isProfileBlocked = user && currentUser && !currentUser.isProfileComplete;

  if (isLoading) return <CourseDetailSkeleton />;
  if (!course) return <div className="p-8 text-center text-slate-400">Cours introuvable.</div>;

  if (isProfileBlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="relative mb-8">
            <div className="p-6 bg-amber-500/10 rounded-full border-4 border-amber-500/20">
                <UserCircle2 className="h-20 w-20 text-amber-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 p-3 bg-primary rounded-full shadow-xl border-4 border-slate-950">
                <Camera className="h-5 w-5 text-white" />
            </div>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-tight">
          Identité <br/><span className="text-primary">Indispensable</span>
        </h1>
        <p className="text-slate-400 mt-4 max-w-md mx-auto leading-relaxed">
          Pour accéder aux détails et participer à la communauté, vous devez avoir un profil complet : <b>Nom, Expertise et Photo de profil</b>.
        </p>
        <Button asChild className="mt-10 h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-95">
          <Link href="/account">
            Compléter mon identité
            <ChevronRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    );
  }

  const isEnrolled = !!enrollment;

  const handleAction = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (isEnrolled) {
      router.push(`/student/courses/${courseId}`);
      return;
    }

    if (course?.price === 0) {
      setIsEnrolling(true);
      try {
        const enrollmentId = `${user.uid}_${courseId}`;
        const ref = doc(db, 'enrollments', enrollmentId);
        
        await setDoc(ref, {
          studentId: user.uid,
          courseId: courseId,
          instructorId: course.instructorId,
          status: 'active',
          progress: 0,
          enrollmentDate: serverTimestamp(),
          lastAccessedAt: serverTimestamp(),
          priceAtEnrollment: 0,
          enrollmentType: 'free'
        });

        toast({ title: "Bienvenue !", description: "Vous êtes maintenant inscrit gratuitement." });
        router.push(`/student/courses/${courseId}`);
      } catch (error) {
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible de valider l'inscription." });
      } finally {
        setIsEnrolling(false);
      }
    } else {
      router.push(`/student/checkout/${courseId}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-32 font-sans selection:bg-primary/30">
      
      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden shadow-2xl">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur-md rounded-full text-white"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Image 
          src={course.imageUrl || `https://picsum.photos/seed/${courseId}/800/450`} 
          alt={course.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
      </div>

      <div className="px-4 -mt-8 relative z-10 space-y-12">
        <div className="space-y-4">
          <Badge className="bg-primary text-primary-foreground hover:bg-primary border-none font-black uppercase tracking-[0.1em] text-[10px] px-3 py-1 rounded-md">
            {course.category}
          </Badge>
          <h1 className="text-3xl font-black text-white leading-[1.1] tracking-tight uppercase">
            {course.title}
          </h1>
          <div className="flex items-center gap-4 text-slate-400 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <Star className={cn("h-4 w-4", stats.rating > 0 ? "text-yellow-500 fill-yellow-500" : "text-slate-700")} />
              <span className="text-white">{stats.rating > 0 ? stats.rating.toFixed(1) : "Nouveau"}</span>
              <span className="opacity-50">({stats.reviewCount} avis)</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{stats.studentCount} apprenants</span>
            </div>
          </div>
        </div>

        {instructor && (
          <Link href={`/instructor/${instructor.uid}`} className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl active:scale-95 transition-transform">
            <Avatar className="h-14 w-14 border-2 border-slate-800">
              <AvatarImage src={instructor.profilePictureURL} className="object-cover" />
              <AvatarFallback className="bg-slate-800 text-slate-500">{instructor.fullName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Expert Formateur</p>
              <p className="text-lg font-bold text-white">{instructor.fullName}</p>
              <p className="text-xs text-slate-500 line-clamp-1">{instructor.careerGoals?.currentRole || 'Spécialiste Ndara'}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-700" />
          </Link>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <div className="h-6 w-1 bg-primary rounded-full" />
            Description
          </h2>
          <p className="text-slate-400 leading-relaxed text-sm">
            {course.description}
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-primary rounded-full" />
              Programme
            </h2>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{sections.length} Chapitres</span>
          </div>
          
          <div className="space-y-3">
            {sections.map((section, idx) => (
              <div key={section.id} className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800/50">
                <h3 className="font-bold text-sm text-slate-200">
                  <span className="text-primary opacity-60 mr-2 font-mono">{String(idx + 1).padStart(2, '0')}</span> 
                  {section.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {(lecturesMap.get(section.id) || []).map(lecture => (
                    <li key={lecture.id} className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <div className="flex items-center gap-2">
                        <PlayCircle className="h-3.5 w-3.5 text-slate-700" />
                        <span className="truncate max-w-[220px]">{lecture.title}</span>
                      </div>
                      <Lock className="h-3 w-3 opacity-30" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION AVIS RÉELS */}
        <section className="space-y-8">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-primary rounded-full" />
              Avis des apprenants
            </h2>

            {reviewsList.length > 0 ? (
                <div className="grid gap-4">
                    {reviewsList.map(review => (
                        <Card key={review.id} className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                            <div className="p-6 flex gap-4">
                                <Avatar className="h-10 w-10 border border-slate-800">
                                    <AvatarImage src={review.userAvatar} />
                                    <AvatarFallback className="bg-slate-800 text-[10px] font-black text-slate-500">
                                        {review.userName?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-sm text-white">{review.userName}</p>
                                            <div className="flex gap-0.5 mt-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star 
                                                        key={i} 
                                                        className={cn("h-3 w-3", i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-slate-800")} 
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-black text-slate-600 uppercase">
                                            {review.createdAt && typeof (review.createdAt as any).toDate === 'function' ? format((review.createdAt as any).toDate(), 'dd/MM/yy', { locale: fr }) : '...'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed italic">"{review.comment}"</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800/50">
                    <MessageSquare className="h-10 w-10 mx-auto text-slate-800 mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Aucun témoignage pour le moment</p>
                    <p className="text-[9px] text-slate-700 mt-1 uppercase font-bold italic">Soyez le premier à valider ce cours !</p>
                </div>
            )}
        </section>

        <div className="bg-slate-900/20 border border-slate-800 rounded-3xl p-6 flex items-start gap-4">
          <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">Garantie Ndara</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-medium">
              Inscrivez-vous en toute confiance. L'accès au contenu est permanent et lié à votre compte Ndara Afrique.
            </p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 z-50 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
        <div className="max-w-md mx-auto flex items-center gap-4">
          {!isEnrolled && (
            <div className="flex-shrink-0">
              <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest mb-0.5">Accès Permanent</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">
                  {course.price > 0 ? (course.price || 0).toLocaleString('fr-FR') : "OFFERT"}
                </span>
                {course.price > 0 && <span className="text-[10px] font-black text-primary uppercase">XOF</span>}
              </div>
            </div>
          )}
          <Button 
            onClick={handleAction}
            disabled={isEnrolling}
            className={cn(
              "flex-1 h-14 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-[0.96] shadow-xl shadow-primary/20",
              isEnrolled 
                ? "bg-white text-slate-950 hover:bg-slate-100" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isEnrolling ? <Loader2 className="h-5 w-5 animate-spin" /> : isEnrolled ? "Reprendre le cours" : course.price === 0 ? "S'inscrire (Gratuit)" : "S'inscrire (Moneroo)"}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 space-y-8 pb-32">
      <Skeleton className="w-full aspect-video bg-slate-900 rounded-none" />
      <div className="px-4 space-y-6">
        <Skeleton className="h-12 w-3/4 bg-slate-900 rounded-xl" />
        <Skeleton className="h-20 w-full bg-slate-900 rounded-2xl" />
        <Skeleton className="h-64 w-full bg-slate-900 rounded-2xl" />
      </div>
    </div>
  );
}