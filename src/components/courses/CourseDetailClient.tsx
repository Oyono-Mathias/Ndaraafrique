'use client';

/**
 * @fileOverview Composant client pour la présentation détaillée d'un cours.
 * ✅ RÉSOLU : Liens de redirection vers /courses/${slug} au lieu de student/courses.
 */

import { useState, useMemo, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { doc, getFirestore, collection, query, getDocs, orderBy, setDoc, serverTimestamp, onSnapshot, where } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useRole } from '@/context/RoleContext';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  Star, 
  Users, 
  PlayCircle,
  ArrowLeft,
  Lock,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Course, Section, Lecture, NdaraUser, Enrollment, Review } from '@/lib/types';
import { ReviewForm } from '@/components/reviews/review-form';

export default function CourseDetailClient({ courseId }: { courseId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isUserLoading } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [isEnrolling, setIsEnrolling] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(true);
  const [stats, setStats] = useState({ rating: 4.8, reviewCount: 0, studentCount: 0 });

  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor } = useDoc<NdaraUser>(instructorRef);

  const enrollmentRef = useMemo(() => (user && courseId) ? doc(db, 'enrollments', `${user.uid}_${courseId}`) : null, [user, courseId, db]);
  const { data: enrollment, isLoading: enrollmentLoading } = useDoc<Enrollment>(enrollmentRef);

  useEffect(() => {
    if (!courseId) return;
    const fetchData = async () => {
      setIsLoadingCurriculum(true);
      try {
        const sectionsQuery = query(collection(db, 'courses', courseId, 'sections'), orderBy('order'));
        const sectionsSnap = await getDocs(sectionsQuery);
        const fetchedSections = sectionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Section));
        setSections(fetchedSections);

        const lMap = new Map();
        for (const section of fetchedSections) {
          const lQuery = query(collection(db, 'courses', courseId, 'sections', section.id, 'lectures'), orderBy('order'));
          const lSnap = await getDocs(lQuery);
          lMap.set(section.id, lSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lecture)));
        }
        setLecturesMap(lMap);
      } catch (e) { console.error(e); } finally { setIsLoadingCurriculum(false); }
    };
    fetchData();
  }, [courseId, db]);

  const handleAction = async () => {
    if (!user) { router.push(`/fr/login?tab=register&redirect=${encodeURIComponent(pathname)}`); return; }
    if (enrollment) { router.push(`/courses/${courseId}`); return; }

    if (course?.price === 0) {
      setIsEnrolling(true);
      try {
        const ref = doc(db, 'enrollments', `${user.uid}_${courseId}`);
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
        toast({ title: "Inscription réussie !" });
        router.push(`/courses/${courseId}`);
      } catch (e) { toast({ variant: 'destructive', title: "Erreur" }); } finally { setIsEnrolling(false); }
    } else {
      router.push(`/student/checkout/${courseId}`);
    }
  };

  if (courseLoading || enrollmentLoading || isUserLoading || isLoadingCurriculum) return <div className="p-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>;
  if (!course) return <div className="p-20 text-center text-slate-500">Formation non trouvée.</div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden shadow-2xl">
        <Button variant="ghost" size="icon" className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur-md rounded-full text-white" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
      </div>

      <div className="px-4 -mt-8 relative z-10 space-y-12 max-w-2xl mx-auto">
        <div className="space-y-4">
          <Badge className="bg-primary text-primary-foreground border-none font-black uppercase text-[10px] px-3 py-1 rounded-md">{course.category}</Badge>
          <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">{course.title}</h1>
        </div>

        {instructor && (
          <Link href={`/instructor/${instructor.uid}`} className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl active:scale-95 transition-transform">
            <Avatar className="h-14 w-14 border-2 border-slate-800"><AvatarImage src={instructor.profilePictureURL} className="object-cover" /><AvatarFallback>{instructor.fullName?.charAt(0)}</AvatarFallback></Avatar>
            <div className="flex-1">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Expert Formateur</p>
              <p className="text-lg font-bold text-white">{instructor.fullName}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-700" />
          </Link>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3"><div className="h-6 w-1 bg-primary rounded-full" />Description</h2>
          <p className="text-slate-400 leading-relaxed text-sm">{course.description}</p>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3"><div className="h-6 w-1 bg-primary rounded-full" />Programme</h2>
          <div className="space-y-3">
            {sections.map((section, idx) => (
              <div key={section.id} className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800/50">
                <h3 className="font-bold text-sm text-slate-200"><span className="text-primary opacity-60 mr-2 font-mono">{String(idx+1).padStart(2,'0')}</span>{section.title}</h3>
                <ul className="mt-3 space-y-2">
                  {(lecturesMap.get(section.id) || []).map(l => (
                    <li key={l.id} className="flex items-center gap-2 text-[11px] text-slate-500 font-medium"><PlayCircle className="h-3.5 w-3.5 text-slate-700" /><span className="truncate">{l.title}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 z-50 safe-area-pb">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <div className="flex-shrink-0">
            <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest mb-0.5">Accès Permanent</p>
            <p className="text-2xl font-black text-white">{course.price === 0 ? "OFFERT" : `${course.price.toLocaleString('fr-FR')} XOF`}</p>
          </div>
          <Button onClick={handleAction} disabled={isEnrolling} className="flex-1 h-14 rounded-xl text-sm font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-xl">
            {isEnrolling ? <Loader2 className="h-5 w-5 animate-spin" /> : !!enrollment ? "Reprendre" : "S'inscrire"} <ChevronRight className="ml-2 h-4 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
