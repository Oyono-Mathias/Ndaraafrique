'use client';

/**
 * @fileOverview Page de présentation détaillée d'un cours (Preview).
 * Android-First.
 * Gère l'affichage dynamique des infos, du curriculum et la conversion Mobile Money.
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getFirestore, collection, query, getDocs, orderBy } from 'firebase/firestore';
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
  Share2,
  Lock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Course, Section, Lecture, NdaraUser, Enrollment } from '@/lib/types';

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useRole();
  const db = getFirestore();

  // --- RÉCUPÉRATION DES DONNÉES ---
  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId as string) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor, isLoading: instructorLoading } = useDoc<NdaraUser>(instructorRef);

  // Vérifier si l'étudiant est déjà inscrit
  const enrollmentRef = useMemo(() => (user && courseId) ? doc(db, 'enrollments', `${user.uid}_${courseId}`) : null, [user, courseId, db]);
  const { data: enrollment, isLoading: enrollmentLoading } = useDoc<Enrollment>(enrollmentRef);

  const [sections, setSections] = useState<Section[]>([]);
  const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(true);

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

  if (isLoading) return <CourseDetailSkeleton />;

  if (!course) return <div className="p-8 text-center text-slate-400">Cours introuvable.</div>;

  const isEnrolled = !!enrollment;

  const handleAction = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (isEnrolled) {
      router.push(`/student/courses/${courseId}`);
    } else {
      router.push(`/student/checkout/${courseId}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-32 font-sans selection:bg-primary/30">
      
      {/* --- BANNIÈRE VISUELLE --- */}
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

      {/* --- CORPS DE PAGE --- */}
      <div className="px-4 -mt-8 relative z-10 space-y-8">
        
        {/* Infos Titre & Catégorie */}
        <div className="space-y-4">
          <Badge className="bg-primary text-primary-foreground hover:bg-primary border-none font-black uppercase tracking-[0.1em] text-[10px] px-3 py-1 rounded-md">
            {course.category}
          </Badge>
          <h1 className="text-3xl font-black text-white leading-[1.1] tracking-tight">
            {course.title}
          </h1>
          <div className="flex items-center gap-4 text-slate-400 text-xs font-bold">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-white">4.9</span>
              <span className="opacity-50">(245 apprenants)</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Accès à vie</span>
            </div>
          </div>
        </div>

        {/* Profil Formateur */}
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

        {/* Description */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <div className="h-1 w-6 bg-primary rounded-full" />
            Description
          </h2>
          <p className="text-slate-400 leading-relaxed text-sm">
            {course.description}
          </p>
        </section>

        {/* Programme du cours */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
              <div className="h-1 w-6 bg-primary rounded-full" />
              Curriculum
            </h2>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{sections.length} Chapitres</span>
          </div>
          
          <div className="space-y-3">
            {sections.map((section, idx) => (
              <div key={section.id} className="p-4 bg-slate-900/40 rounded-xl border border-slate-800/50">
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

        {/* Réassurance */}
        <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
          <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">Garantie Ndara</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Inscrivez-vous en toute confiance. Accès immédiat dès validation du Mobile Money. Certificat vérifiable inclus.
            </p>
          </div>
        </div>
      </div>

      {/* --- FOOTER CTA (STICKY) --- */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 z-50 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex items-center gap-4">
          {!isEnrolled && (
            <div className="flex-shrink-0">
              <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest mb-0.5">Tarif unique</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{(course.price || 0).toLocaleString('fr-FR')}</span>
                <span className="text-[10px] font-black text-primary uppercase">XOF</span>
              </div>
            </div>
          )}
          <Button 
            onClick={handleAction}
            className={cn(
              "flex-1 h-14 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-95 shadow-xl",
              isEnrolled 
                ? "bg-white text-slate-950 hover:bg-slate-100" 
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {isEnrolled ? "Reprendre le cours" : "S'inscrire (Mobile Money)"}
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
