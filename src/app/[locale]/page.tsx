
'use client';

/**
 * @fileOverview Landing Page Ndara Afrique - Performance & Branding.
 * ✅ CDN : Images servies par Bunny Pull Zone.
 * ✅ PERF : next/image priority et skeletons optimisés.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, getDocs, doc } from 'firebase/firestore';
import Link from 'next/link';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';
import { Sparkles, LayoutDashboard, ChevronsRight, BookCopy, Wallet, Award, Search as SearchIcon } from 'lucide-react';
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
        return () => document.removeEventListener('scroll', handleScroll);
    }, [scrolled]);

    const dashboardUrl = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
            scrolled ? "py-3 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 shadow-2xl" : "py-6 bg-transparent"
        )}>
            <div className="container mx-auto px-4 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative w-10 h-10 overflow-hidden rounded-xl shadow-2xl bg-primary/20 flex items-center justify-center border border-white/10">
                        <Image 
                            src={logoUrl} 
                            alt={`${siteName} Logo`} 
                            width={40} 
                            height={40} 
                            className="object-contain p-1"
                            priority
                        />
                    </div>
                    <span className="text-xl font-black tracking-tighter text-white uppercase">{siteName}</span>
                </Link>
                <div className="flex items-center gap-2">
                    <Link href={user ? dashboardUrl : "/login"}>
                        <Button 
                            variant="outline" 
                            className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-primary hover:text-white hover:border-primary h-10 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
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

const CourseCarousel = ({ title, courses, instructorsMap, isLoading }: { title: string, courses: Course[], instructorsMap: Map<string, Partial<NdaraUser>>, isLoading: boolean }) => {
    if (isLoading && courses.length === 0) {
        return (
            <section className="py-8">
                <Skeleton className="h-6 w-48 mb-6 rounded-full bg-slate-800" />
                <div className="flex gap-4 overflow-hidden">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="basis-[48%] sm:basis-1/3 md:basis-1/4 shrink-0 space-y-3">
                            <Skeleton className="aspect-video w-full rounded-2xl bg-slate-800" />
                            <Skeleton className="h-4 w-3/4 bg-slate-800" />
                            <Skeleton className="h-3 w-1/2 bg-slate-800" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }
    if (!courses || courses.length === 0) return null;

    return (
        <section className="py-8 overflow-hidden">
            <h2 className="text-xl md:text-2xl font-black mb-6 text-white flex items-center gap-3 uppercase tracking-tight">
                <div className="h-8 w-1.5 bg-primary rounded-full shadow-[0_0_10px_hsl(var(--primary))]" />
                {title}
            </h2>
             <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent className="-ml-4">
                    {courses.map(course => (
                        <CarouselItem key={course.id} className="pl-4 basis-[48%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
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
    const q = query(collection(db, "courses"), where("status", "==", "Published"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId).filter(Boolean))];
        if (instructorIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30)));
            const userSnapshots = await getDocs(usersQuery);
            const newInstructors = new Map();
            userSnapshots.forEach(doc => newInstructors.set(doc.id, doc.data()));
            setInstructorsMap(newInstructors);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db]);
  
  const siteName = settings?.general?.siteName || "Ndara Afrique";
  const logoUrl = "https://ndara-assets.b-cdn.net/logo.png";

  const coursesByCategory = useMemo(() => {
    const groups: Record<string, Course[]> = {};
    courses.forEach(course => {
      const cat = course.category || "Autres formations";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(course);
    });
    return groups;
  }, [courses]);

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans selection:bg-primary/30">
      <LandingNav logoUrl={logoUrl} siteName={siteName} />
      
      <div className="container mx-auto px-4">
        <header className="text-center pt-32 pb-16 md:pt-48 md:pb-24 max-w-4xl mx-auto space-y-8">
          <Badge className="bg-primary/10 text-primary border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-1000 px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-[0.3em]">
            <Sparkles className="w-3 h-3 mr-2" />
            L'excellence technologique du continent
          </Badge>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-[0.95] animate-in fade-in slide-in-from-bottom-4 duration-1000 uppercase">
            {content?.heroTitle || "Le savoir est la seule richesse."}
          </h1>
          <p className="text-slate-400 text-base md:text-xl max-w-2xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {content?.heroSubtitle || "Formez-vous avec les leaders africains et propulsez votre carrière au niveau mondial."}
          </p>
          <div className="flex flex-col items-center gap-6 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <Link href={user ? dashboardUrl : "/login?tab=register"}>
                  <button 
                    className="nd-cta-primary h-16 text-xs px-12 rounded-[2rem] shadow-2xl shadow-primary/40 hover:shadow-primary/60"
                    onClick={() => logTrackingEvent({ eventType: 'cta_click', sessionId: 'landing', pageUrl: '/', metadata: { location: 'hero' } })}
                  >
                      {user ? "Accéder à mon espace" : (content?.heroCtaText || "Démarrer l'aventure")}
                      <ChevronsRight className="ml-2 h-5 w-5" />
                  </button>
              </Link>
          </div>
        </header>
          
        <main className="space-y-12 md:space-y-24 pb-32">
          <DynamicCarousel />

          <CourseCarousel
            title="Dernières Publications"
            courses={courses.slice(0, 10)}
            instructorsMap={instructorsMap}
            isLoading={loading}
          />

          <section className="py-16 md:py-24 bg-slate-900/40 rounded-[3rem] border border-white/5 p-8 md:p-20 relative overflow-hidden shadow-3xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-10">
                    <h2 className="text-3xl md:text-5xl font-black leading-tight uppercase tracking-tight">Pourquoi <br/><span className="text-primary">Ndara Afrique ?</span></h2>
                    <div className="grid gap-8">
                        {[
                            { icon: BookCopy, title: "Savoir Contextualisé", desc: "Des cours pensés pour les réalités du terrain africain." },
                            { icon: Wallet, title: "Accessibilité Totale", desc: "Paiements fluides via vos services Mobile Money locaux." },
                            { icon: Award, title: "Validation Premium", desc: "Des certificats reconnus par les plus grandes entreprises." }
                        ].map((feat, i) => (
                            <div key={i} className="flex gap-6 items-start group">
                                <div className="p-4 bg-slate-800 rounded-2xl group-hover:bg-primary transition-colors duration-500 shadow-xl border border-white/5">
                                    <feat.icon className="h-6 w-6 text-primary group-hover:text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white uppercase tracking-tight">{feat.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed mt-1">{feat.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-8 border-slate-800/50 transform rotate-2 hover:rotate-0 transition-transform duration-700">
                    <Image src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop" alt="Impact Ndara" fill className="object-cover" />
                </div>
            </div>
          </section>

          <div className="space-y-16">
              {Object.entries(coursesByCategory).map(([category, catCourses]) => (
                <CourseCarousel
                    key={category}
                    title={category}
                    courses={catCourses}
                    instructorsMap={instructorsMap}
                    isLoading={false}
                />
              ))}
          </div>

          <section className="text-center py-24 bg-primary rounded-[4rem] border border-white/10 relative overflow-hidden group shadow-[0_30px_60px_-15px_rgba(59,130,246,0.5)] px-8">
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10 space-y-8">
                <h2 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tight leading-none">
                    {content?.finalCtaTitle || "Prêt à coder l'avenir ?"}
                </h2>
                <p className="text-primary-foreground/80 text-lg md:text-xl max-w-2xl mx-auto font-medium italic">
                    {content?.finalCtaSubtitle || "Rejoignez la plus grande académie panafricaine dès aujourd'hui."}
                </p>
                <Button 
                    size="lg" 
                    asChild 
                    className="h-20 px-16 rounded-2xl bg-white text-primary hover:bg-slate-50 font-black uppercase text-sm tracking-[0.2em] shadow-2xl transition-all active:scale-95"
                    onClick={() => logTrackingEvent({ eventType: 'cta_click', sessionId: 'landing', pageUrl: '/', metadata: { location: 'footer' } })}
                >
                    <Link href={user ? dashboardUrl : "/login?tab=register"}>
                        {user ? "Accéder au dashboard" : (content?.finalCtaButtonText || "Rejoindre Ndara")}
                        <ChevronsRight className="ml-3 h-6 w-6" />
                    </Link>
                </Button>
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  );
}
