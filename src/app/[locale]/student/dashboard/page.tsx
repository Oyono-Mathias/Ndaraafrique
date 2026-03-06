'use client';

/**
 * @fileOverview Dashboard Étudiant Ndara Afrique - Style Udemy Industriel.
 * Regroupe les formations par catégories avec navigation horizontale.
 */

import { useRole } from '@/context/RoleContext';
import { ContinueLearning } from '@/components/dashboards/ContinueLearning';
import { RecentActivity } from '@/components/dashboards/RecentActivity';
import { StatCard } from '@/components/dashboard/StatCard';
import { BookOpen, Trophy, Sparkles, Search as LucideSearch, Bot, ArrowRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import type { Course, NdaraUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CourseCard } from '@/components/cards/CourseCard';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

export default function StudentDashboardAndroid() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // 1. Écouteur Stats
    const unsubEnroll = onSnapshot(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)), (snap) => {
      const total = snap.size;
      const completed = snap.docs.filter(d => d.data().progress === 100).length;
      setStats({ total, completed });
    });

    // 2. Chargement du Catalogue par catégories
    const unsubCourses = onSnapshot(query(collection(db, 'courses'), where('status', '==', 'Published'), orderBy('createdAt', 'desc')), async (snap) => {
      const coursesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setAllCourses(coursesData);
      
      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId))];
        const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30))));
        const newMap = new Map();
        usersSnap.forEach(d => newMap.set(d.id, d.data()));
        setInstructorsMap(newMap);
      }
      setLoadingData(false);
    });

    return () => { unsubEnroll(); unsubCourses(); };
  }, [currentUser?.uid, db]);

  // Groupement par catégorie
  const coursesByCategory = useMemo(() => {
    const groups: Record<string, Course[]> = {};
    allCourses.forEach(course => {
      const cat = course.category || "Autres formations";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(course);
    });
    return groups;
  }, [allCourses]);

  if (isUserLoading) {
    return (
      <div className="space-y-6 p-4 bg-background min-h-screen">
        <Skeleton className="h-10 w-3/4 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl bg-muted" />
          <Skeleton className="h-24 rounded-2xl bg-muted" />
        </div>
        <Skeleton className="h-64 w-full rounded-3xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24 bg-background min-h-screen relative overflow-hidden bg-grainy">
      
      <header className="px-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl font-black text-foreground leading-tight">
          Bara ala, <br/>
          <span className="text-primary">{currentUser?.fullName?.split(' ')[0]} !</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-2 font-medium">Continuez votre quête du savoir.</p>
      </header>

      <section className="px-4 grid grid-cols-2 gap-3">
        <StatCard title="Formations" value={stats.total.toString()} icon={BookOpen} isLoading={loadingData} />
        <StatCard title="Certificats" value={stats.completed.toString()} icon={Trophy} isLoading={loadingData} />
      </section>

      <div className="px-4">
        <ContinueLearning />
      </div>

      <section className="px-4">
        <div className="bg-primary p-6 rounded-[2rem] shadow-2xl shadow-primary/20 relative overflow-hidden group active:scale-[0.98] transition-all">
          <Bot className="absolute -right-4 -bottom-4 h-32 w-32 text-black/10 group-hover:scale-110 transition-transform" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">Assistant Personnel</span>
            </div>
            <h2 className="text-2xl font-black text-white leading-none">Besoin d'aide, <br/>cher Ndara ?</h2>
            <Button asChild className="bg-white text-primary hover:bg-white/90 rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6">
              <Link href="/student/tutor">Discuter avec Mathias</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* --- AFFICHAGE PAR CATÉGORIE (STYLE UDEMY) --- */}
      <div className="space-y-10">
        {loadingData ? (
            <div className="px-4 space-y-8">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="h-6 w-1/3 rounded-full" />
                        <div className="flex gap-4 overflow-hidden">
                            <Skeleton className="h-40 w-1/2 rounded-xl shrink-0" />
                            <Skeleton className="h-40 w-1/2 rounded-xl shrink-0" />
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            Object.entries(coursesByCategory).map(([category, courses]) => (
                <section key={category} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <div className="px-4 flex items-center justify-between">
                        <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                            <div className="h-6 w-1.5 bg-primary rounded-full" />
                            {category}
                        </h2>
                        <Button variant="ghost" size="sm" asChild className="text-primary font-bold text-[10px] uppercase tracking-widest">
                            <Link href={`/search?q=${category}`}>Voir tout</Link>
                        </Button>
                    </div>
                    <Carousel opts={{ align: "start", loop: false }} className="w-full">
                        <CarouselContent className="px-4 -ml-3">
                            {courses.map(course => (
                                <CarouselItem key={course.id} className="pl-3 basis-[48%] sm:basis-1/3 md:basis-1/4">
                                    <CourseCard 
                                        course={course} 
                                        instructor={instructorsMap.get(course.instructorId) || null} 
                                        variant="grid" 
                                    />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                </section>
            ))
        )}
      </div>

      <div className="px-4">
        <RecentActivity />
      </div>

      <Button asChild className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/40 z-50 transition-transform active:scale-90 p-0 flex items-center justify-center">
        <Link href="/search">
          <SearchIconLocal className="h-6 w-6 text-primary-foreground" />
          <span className="sr-only">Explorer</span>
        </Link>
      </Button>
    </div>
  );
}

function SearchIconLocal(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
