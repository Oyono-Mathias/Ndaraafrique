'use client';

/**
 * @fileOverview Landing Page Ndara Afrique avec Tracking KPIs.
 * ✅ STYLE : Utilise le format GRID (Udemy style) pour le catalogue.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, getDocs, doc } from 'firebase/firestore';
import Link from 'next/link';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';
import { Sparkles, LayoutDashboard, ChevronsRight, BookCopy, Wallet, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/cards/CourseCard';
import { DynamicCarousel } from '@/components/ui/DynamicCarousel';
import { useRole } from '@/context/RoleContext';
import { useDoc } from '@/firebase';
import { logTrackingEvent } from '@/actions/trackingActions';

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
                    <Link href={user ? dashboardUrl : "/login"}>
                        <Button 
                            variant="outline" 
                            className="nd-cta-secondary bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white h-9 px-6 rounded-full text-xs font-bold uppercase tracking-widest"
                            onClick={() => logTrackingEvent({ eventType: 'cta_click', sessionId: 'landing', pageUrl: '/', metadata: { location: 'nav' } })}
                        >
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
        const q = collection(db, 'enrollments');
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCount(snapshot.size);
        });
        return () => unsubscribe();
    }, [db]);

    if (count === null || count < 10) return null;

    return (
        <p className="text-sm text-slate-400 mt-4">
            Rejoignez nos <span className="font-bold text-primary">{count.toLocaleString('fr-FR')}</span> participants et commencez votre parcours.
        </p>
    );
};

const CourseCarousel = ({ title, courses, instructorsMap, isLoading }: { title: string, courses: Course[], instructorsMap: Map<string, Partial<NdaraUser>>, isLoading: boolean }) => {
    if (isLoading && courses.length === 0) {
        return (
            <section className="py-8">
                <Skeleton className="h-8 w-1/3 mb-6" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-80 rounded-3xl" />
                    ))}
                </div>
            </section>
        );
    }
    if (!courses || courses.length === 0) {
        return null;
    }

    return (
        <section className="py-8">
            <h2 className="text-2xl md:text-3xl font-black mb-6 text-foreground flex items-center gap-3 uppercase tracking-tight">
                <div className="h-8 w-1.5 bg-primary rounded-full" />
                {title}
            </h2>
             <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent className="-ml-4">
                    {courses.map(course => (
                        <CarouselItem key={course.id} className="pl-4 basis-[85%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
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
    );
};

export default function LandingPage() {
  const { user, role } = useRole();
  const db = getFirestore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());

  const dashboardUrl = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

  const settingsRef = doc(db, 'settings', 'global');
  const { data: settings } = useDoc<Settings>(settingsRef);
  const content = settings?.content?.landingPage;

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
                newInstructors.set(userData.uid, { fullName: userData.fullName, profilePictureURL: userData.profilePictureURL });
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
  
  const siteName = settings?.general?.siteName || "Ndara Afrique";
  const logoUrl = '/logo.png';

  const coursesByCategory = useMemo(() => {
    const groups: Record<string, Course[]> = {};
    courses.forEach(course => {
      const cat = course.category || "Autres formations";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(course);
    });
    return groups;
  }, [courses]);

  const recentCourses = useMemo(() => courses.slice(0, 10), [courses]);

  return (
    <div className="bg-background text-foreground min-h-screen font-sans">
      <LandingNav logoUrl={logoUrl} siteName={siteName} />
      
      <div className="container mx-auto px-4">
        
        <header className="text-center pt-32 pb-16 md:pt-40 md:pb-24">
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary animate-fade-in-up bg-primary/5">
            <Sparkles className="w-3 h-3 mr-2" />
            La plateforme N°1 pour les compétences du futur en Afrique
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight !leading-tight text-foreground animate-fade-in-up uppercase">
            {content?.heroTitle || "Apprenez. Construisez. Prospérez."}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mt-6 mb-8 animate-fade-in-up">
            {content?.heroSubtitle || `Des formations de pointe conçues par des experts africains, pour les talents africains sur ${siteName}. Transformez vos ambitions en succès.`}
          </p>
          <div className="animate-fade-in-up flex flex-col items-center">
              <Link href={user ? dashboardUrl : "/login?tab=register"}>
                  <button 
                    className="nd-cta-primary h-12 text-base md:h-14 md:text-sm px-10"
                    onClick={() => logTrackingEvent({ eventType: 'cta_click', sessionId: 'landing', pageUrl: '/', metadata: { location: 'hero' } })}
                  >
                      {user ? (
                          <>
                            <LayoutDashboard className="w-5 h-5 mr-2" />
                            Accéder à mon tableau de bord
                          </>
                      ) : (content?.heroCtaText || "Démarrer mon parcours")}
                  </button>
              </Link>
              <EnrollmentCounter />
          </div>
        </header>
          
        <main className="space-y-12 sm:space-y-16 pb-24">
          <DynamicCarousel />

          <CourseCarousel
            title="Dernières publications"
            courses={recentCourses}
            instructorsMap={instructorsMap}
            isLoading={loading}
          />

          <section className="py-16 md:py-24 bg-card rounded-[3rem] border border-border p-8 md:p-16 shadow-xl">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                    <h2 className="text-3xl md:text-4xl font-black text-foreground leading-tight uppercase tracking-tight">Pourquoi choisir <br/><span className="text-primary">Ndara Afrique ?</span></h2>
                    <div className="space-y-6">
                        {[
                            { icon: BookCopy, title: "Expertise Locale", desc: "Cours conçus par des leaders du marché africain." },
                            { icon: Wallet, title: "Paiement Mobile", desc: "MTN, Orange, Wave... payez avec ce que vous avez." },
                            { icon: Award, title: "Diplôme Certifié", desc: "Certificats officiels validés par l'industrie." }
                        ].map((feat, i) => (
                            <div key={i} className="flex gap-4 items-start">
                                <div className="p-3 bg-primary/10 rounded-2xl"><feat.icon className="h-6 w-6 text-primary" /></div>
                                <div><h3 className="font-bold text-foreground">{feat.title}</h3><p className="text-muted-foreground text-sm">{feat.desc}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="relative aspect-video rounded-[2rem] overflow-hidden shadow-2xl border border-border">
                    <Image src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop" alt="Communauté Ndara" fill className="object-cover" />
                </div>
            </div>
          </section>

          {loading ? (
              <div className="space-y-12">
                  {[...Array(2)].map((_, i) => (
                      <div key={i} className="space-y-4">
                          <Skeleton className="h-8 w-48" />
                          <div className="flex gap-4"><Skeleton className="h-64 w-full rounded-3xl" /><Skeleton className="h-64 w-full rounded-3xl" /></div>
                      </div>
                  ))}
              </div>
          ) : (
              Object.entries(coursesByCategory).map(([category, catCourses]) => (
                <CourseCarousel
                    key={category}
                    title={category}
                    courses={catCourses}
                    instructorsMap={instructorsMap}
                    isLoading={false}
                />
              ))
          )}

          <section className="text-center py-24 bg-card rounded-[3rem] border border-border relative overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <h2 className="text-3xl md:text-4xl font-black text-foreground relative z-10 uppercase tracking-tight">
                {content?.finalCtaTitle || "Prêt à transformer votre avenir ?"}
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto relative z-10">
                {content?.finalCtaSubtitle || "Rejoignez des milliers de talents qui construisent le futur de l'Afrique avec Ndara Afrique."}
            </p>
            <Button 
                size="lg" 
                asChild 
                className="mt-10 h-14 px-12 rounded-2xl nd-cta-primary animate-pulse relative z-10"
                onClick={() => logTrackingEvent({ eventType: 'cta_click', sessionId: 'landing', pageUrl: '/', metadata: { location: 'footer' } })}
            >
                <Link href={user ? dashboardUrl : "/login?tab=register"}>
                    {user ? "Accéder au Tableau de bord" : (content?.finalCtaButtonText || "Devenir Membre")}
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
