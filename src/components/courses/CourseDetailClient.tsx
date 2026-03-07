'use client';

/**
 * @fileOverview Composant client pour la présentation détaillée d'un cours.
 * ✅ SÉCURITÉ : Redirige vers /register si l'utilisateur n'est pas connecté.
 * ✅ AFFILIATION : Traçabilité des clics ambassadeurs.
 */

import { useState, useMemo, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { doc, getFirestore, collection, query, getDocs, orderBy, setDoc, serverTimestamp, onSnapshot, where, documentId } from 'firebase/firestore';
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
  MessageSquare,
  BadgeEuro,
  ShoppingCart,
  Share2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Course, Section, Lecture, NdaraUser, Enrollment, Review, Settings } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logTrackingEvent } from '@/actions/trackingActions';

interface EnrichedReview extends Review {
    userName?: string;
    userAvatar?: string;
}

export default function CourseDetailClient({ courseId }: { courseId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, currentUser, isUserLoading } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [isEnrolling, setIsEnrolling] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(true);
  
  const [stats, setStats] = useState({ rating: 0, reviewCount: 0, studentCount: 0 });
  const [reviewsList, setReviewsList] = useState<EnrichedReview[]>([]);
  const [isResaleEnabled, setIsResaleEnabled] = useState(false);

  // 1. TRAÇABILITÉ AFFILIATION
  useEffect(() => {
      const affId = searchParams.get('aff');
      if (affId && typeof window !== 'undefined') {
          const cookieData = {
              id: affId,
              timestamp: Date.now(),
              expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
          };
          localStorage.setItem('ndara_affiliate_id', JSON.stringify(cookieData));
          
          // Log du clic pour les stats ambassadeur
          logTrackingEvent({
              eventType: 'affiliate_click',
              sessionId: 'anon',
              pageUrl: pathname,
              metadata: { affiliateId: affId, courseId }
          });
      }
  }, [searchParams, pathname, courseId]);

  // 2. SÉCURITÉ AUTH
  useEffect(() => {
    if (!isUserLoading && !user) {
        const redirectUrl = encodeURIComponent(pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''));
        router.push(`/fr/login?tab=register&redirect=${redirectUrl}`);
    }
  }, [user, isUserLoading, router, pathname, searchParams]);

  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor, isLoading: instructorLoading } = useDoc<NdaraUser>(instructorRef);

  const enrollmentRef = useMemo(() => (user && courseId) ? doc(db, 'enrollments', `${user.uid}_${courseId}`) : null, [user, courseId, db]);
  const { data: enrollment, isLoading: enrollmentLoading } = useDoc<Enrollment>(enrollmentRef);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) {
            const data = snap.data() as Settings;
            setIsResaleEnabled(data.platform?.allowResaleRights ?? true);
        }
    });
    return () => unsubSettings();
  }, [db]);

  useEffect(() => {
    if (!courseId) return;

    const qReviews = query(collection(db, 'reviews'), where('courseId', '==', courseId));
    const unsubReviews = onSnapshot(qReviews, async (snap) => {
        const reviewsData = snap.docs.map(d => d.data() as Review);
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
        const sectionsQuery = query(collection(db, 'courses', courseId, 'sections'), orderBy('order'));
        const sectionsSnap = await getDocs(sectionsQuery);
        const fetchedSections = sectionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Section));
        setSections(fetchedSections);

        const lMap = new Map<string, Lecture[]>();
        for (const section of fetchedSections) {
          const lQuery = query(collection(db, 'courses', courseId, 'sections', section.id, 'lectures'), orderBy('order'));
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

  const handleAction = async () => {
    if (enrollment) {
      router.push(`/student/courses/${courseId}`);
      return;
    }

    if (course?.price === 0) {
      setIsEnrolling(true);
      try {
        if (!user) return;
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

  const isLoading = courseLoading || instructorLoading || enrollmentLoading || isUserLoading || isLoadingCurriculum;

  if (isLoading || !user) return <CourseDetailSkeleton />;
  if (!course) return <div className="p-8 text-center text-slate-400">Cours introuvable.</div>;

  const isEnrolled = !!enrollment;
  const resaleAvailable = course.resaleRightsAvailable && isResaleEnabled && !isEnrolled;

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
          <div className="flex justify-between items-start">
            <Badge className="bg-primary text-primary-foreground hover:bg-primary border-none font-black uppercase tracking-[0.1em] text-[10px] px-3 py-1 rounded-md">
                {course.category}
            </Badge>
            {currentUser && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 rounded-lg bg-slate-900 border-slate-800 text-[10px] font-black uppercase tracking-widest gap-2"
                    onClick={() => {
                        const url = `${window.location.origin}${pathname}?aff=${currentUser.uid}`;
                        navigator.clipboard.writeText(url);
                        toast({ title: "Lien Ambassadeur copié !", description: "Gagnez des commissions en partageant ce cours." });
                    }}
                >
                    <Share2 className="h-3 w-3" /> Partager & Gagner
                </Button>
            )}
          </div>
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

        {resaleAvailable && (
            <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-primary/5 border-2 border-amber-500/20 rounded-[2rem] shadow-2xl relative overflow-hidden group animate-in zoom-in duration-700">
                <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-110 transition-transform">
                    <BadgeEuro size={120} className="text-amber-500" />
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="text-center sm:text-left space-y-2">
                        <div className="flex items-center gap-2 text-amber-500 justify-center sm:justify-start">
                            <ShoppingCart className="h-5 w-5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Opportunité Partenaire</span>
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Devenez Propriétaire</h3>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm">
                            Achetez la licence de revente de ce cours. Percevez les revenus sur chaque vente et revendez la licence à tout moment.
                        </p>
                    </div>
                    <div className="flex flex-col items-center sm:items-end gap-3 shrink-0">
                        <div className="text-right">
                            <p className="text-2xl font-black text-white">{(course.resaleRightsPrice || 0).toLocaleString('fr-FR')} XOF</p>
                            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Licence Exclusive</p>
                        </div>
                        <Button asChild className="h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black uppercase text-[10px] tracking-widest px-8 shadow-xl shadow-amber-500/20">
                            <Link href={`/student/checkout/${courseId}?type=rights`}>Acheter les droits</Link>
                        </Button>
                    </div>
                </div>
            </Card>
        )}

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

        <section className="bg-slate-900/20 border border-slate-800 rounded-3xl p-6 flex items-start gap-4">
          <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">Garantie Ndara</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-medium">
              Inscrivez-vous en toute confiance. L'accès au contenu est permanent et lié à votre compte Ndara Afrique.
            </p>
          </div>
        </section>
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