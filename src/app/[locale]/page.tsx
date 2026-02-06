'use client';

/**
 * @fileOverview Landing Page Ndara Afrique.
 * Sécurisation du branding pour éviter le flash de l'ancien nom.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, limit, getDocs, getCountFromServer, doc } from 'firebase/firestore';
import Link from 'next/link';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';
import { Sparkles, Search, LayoutDashboard, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/cards/CourseCard';
import { DynamicCarousel } from '@/components/ui/DynamicCarousel';
import { useRole } from '@/context/RoleContext';
import Autoplay from 'embla-carousel-autoplay';
import { useDoc } from '@/firebase';

const LandingNav = ({ logoUrl, siteName }: { logoUrl: string, siteName: string }) => {
    const [scrolled, setScrolled] = useState(false);
    const { user, role } = useRole();

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 10;
            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }
        };

        document.addEventListener('scroll', handleScroll);
        return () => {
            document.removeEventListener('scroll', handleScroll);
        };
    }, [scrolled]);

    const dashboardUrl = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
            scrolled ? "py-3 bg-slate-900/80 backdrop-blur-sm border-b border-white/10" : "py-6"
        )}>
            <div className="container mx-auto px-4 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-105">
                    <div className="relative w-10 h-10 overflow-hidden rounded-lg shadow-lg bg-primary/20 flex items-center justify-center border border-white/10">
                        <Image 
                            src={logoUrl} 
                            alt={`${siteName} Logo`} 
                            width={40} 
                            height={40} 
                            className="object-contain"
                        />
                    </div>
                    <span className="text-xl font-bold tracking-tighter text-white">{siteName}</span>
                </Link>
                <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10">
                        <Link href="/search">
                            <Search className="h-5 w-5" />
                        </Link>
                    </Button>
                    <Link href={user ? dashboardUrl : "/login"}>
                        <Button variant="outline" className="hidden sm:flex nd-cta-secondary bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white h-9 px-6 rounded-full text-xs font-bold uppercase tracking-widest">
                            {user ? "Mon Espace" : "Se connecter"}
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
};

const EnrollmentCounter = () => {
    const [count, setCount] = useState<number | null>(null);
    const db = getFirestore();

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const coll = collection(db, 'enrollments');
                const snapshot = await getCountFromServer(coll);
                setCount(snapshot.data().count);
            } catch (error) {
                console.error("Error fetching enrollment count:", error);
                setCount(0);
            }
        };
        fetchCount();
    }, [db]);

    if (count === null || count < 10) return null;

    return (
        <p className="text-sm text-slate-400 mt-4">
            Rejoignez nos <span className="font-bold text-primary">{count.toLocaleString('fr-FR')}</span> participants et commencez votre parcours.
        </p>
    );
};

const CourseCarousel = ({ title, courses, instructorsMap, isLoading, autoplay = false }: { title: string, courses: Course[], instructorsMap: Map<string, Partial<NdaraUser>>, isLoading: boolean, autoplay?: boolean }) => {
    if (isLoading && courses.length === 0) {
        return (
            <section className="py-8">
                <Skeleton className="h-8 w-1/3 mb-6 bg-slate-800" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-80 rounded-xl bg-slate-800"></Skeleton>
                    <Skeleton className="h-80 rounded-xl bg-slate-800 hidden sm:block"></Skeleton>
                    <Skeleton className="h-80 rounded-xl bg-slate-800 hidden lg:block"></Skeleton>
                </div>
            </section>
        );
    }
    if (!courses || courses.length === 0) {
        return null;
    }

    const plugins = autoplay ? [Autoplay({ delay: 5000, stopOnInteraction: false })] : [];

    return (
        <section className="py-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">{title}</h2>
             <Carousel 
                opts={{ align: "start", loop: autoplay }} 
                plugins={plugins}
                className="w-full"
             >
                <CarouselContent className="-ml-4">
                    {courses.map(course => (
                        <CarouselItem key={course.id} className="pl-4 basis-[80%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                            <CourseCard course={course} instructor={instructorsMap.get(course.instructorId) || null} variant="catalogue" />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </section>
    );
};

export default function LandingPage() {
  const { user, role } = useRole();
  const db = getFirestore();
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings } = useDoc<Settings>(settingsRef);

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());

  const dashboardUrl = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

  useEffect(() => {
    const q = query(
      collection(db, "courses"),
      where("status", "==", "Published"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
      
      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId).filter(Boolean))];
        if (instructorIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30)));
            const userSnapshots = await getDocs(usersQuery);
            const newInstructors = new Map<string, Partial<NdaraUser>>();
            userSnapshots.forEach(doc => {
                const userData = doc.data();
                newInstructors.set(userData.uid, { fullName: userData.fullName });
            });
            setInstructorsMap(newInstructors);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Erreur Firebase:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db]);
  
  // ✅ Correction Branding Forcée
  const fetchedName = settings?.general?.siteName || '';
  const siteName = (fetchedName.includes('Forma') || !fetchedName) ? 'Ndara Afrique' : fetchedName;
  const logoUrl = settings?.general?.logoUrl || '/logo.png';

  return (
    <div className="bg-background text-foreground min-h-screen font-sans">
      <LandingNav logoUrl={logoUrl} siteName={siteName} />
      <div className="container mx-auto px-4">
        
        <header className="text-center pt-32 pb-16 md:pt-40 md:pb-24">
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary animate-fade-in-up">
            <Sparkles className="w-3 h-3 mr-2" />
            La plateforme N°1 pour les compétences du futur en Afrique
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight !leading-tight animate-fade-in-up">
            Apprenez. Construisez. Prospérez.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mt-6 mb-8 animate-fade-in-up">
            Des formations de pointe conçues par des experts africains, pour les talents africains sur {siteName}. Transformez vos ambitions en succès.
          </p>
          <div className="animate-fade-in-up hidden sm:block">
              <Link href={user ? dashboardUrl : "/login?tab=register"}>
                  <button className="nd-cta-primary h-12 text-base md:h-auto md:text-sm">
                      {user ? "Accéder à mon tableau de bord" : "Démarrer mon parcours"}
                  </button>
              </Link>
              <EnrollmentCounter />
          </div>
        </header>
          
        <main className="space-y-12 sm:space-y-16 pb-24 sm:pb-0">
          <DynamicCarousel />

          <CourseCarousel
            title="Les nouveautés du moment"
            courses={courses.slice(0, 12)}
            instructorsMap={instructorsMap}
            isLoading={loading}
            autoplay={true}
          />

          <section className="text-center py-20">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Prêt à transformer votre avenir ?</h2>
            <p className="mt-2 text-slate-400">Rejoignez des milliers de talents qui construisent le futur de l'Afrique.</p>
            <Button size="lg" asChild className="mt-8 h-12 text-base md:h-14 md:text-lg nd-cta-primary animate-pulse">
                <Link href={user ? dashboardUrl : "/login?tab=register"}>
                    {user ? "Tableau de bord" : "Devenir Membre"}
                    <ChevronsRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  );
}
